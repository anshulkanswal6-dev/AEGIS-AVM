import uuid
import datetime
import base64
from typing import Optional
from algosdk import encoding, transaction
from supabase_store import SupabaseStore

class AuthManager:
    def __init__(self, store: SupabaseStore):
        self.store = store
        self.nonces = {} # In-memory nonce store

    def get_nonce(self, wallet_address: str) -> str:
        nonce = str(uuid.uuid4())
        self.nonces[wallet_address] = {
            "nonce": nonce,
            "expires": datetime.datetime.now() + datetime.timedelta(minutes=5)
        }
        return nonce

    def verify_signature(self, wallet_address: str, signature: str, message: str) -> bool:
        """
        Verify an Algorand auth request using primary SDK methods.
        Matches the pattern requested for transaction-based authentication.
        """
        # 1. Check nonce
        stored = self.nonces.get(wallet_address)
        if not stored:
            print(f"[Auth] (FAIL) Nonce lookup failed for {wallet_address}.")
            return False
        
        if datetime.datetime.now() > stored["expires"]:
            print(f"[Auth] (FAIL) Nonce expired for {wallet_address}")
            del self.nonces[wallet_address]
            return False
        
        if stored["nonce"] not in message:
            print(f"[Auth] (FAIL) Nonce {stored['nonce']} not found in message: {message}")
            return False

        # 2. Trace Base64 length
        try:
            sig_bytes = base64.b64decode(signature)
            print(f"[Auth] Received signature payload. Decoded bytes: {len(sig_bytes)}")
        except Exception as e:
            print(f"[Auth] (ERROR) Base64 decode trace failed: {e}")
            return False

        # 3. Transaction-based verification (SDK Path)
        print(f"[Auth] Attempting SDK-based Transaction verification for {wallet_address}...")
        try:
            # SDK msgpack decode
            stxn = encoding.msgpack_decode(signature)
            txn = stxn.transaction
            
            # Read sender/receiver safely
            sender_addr = txn.sender if isinstance(txn.sender, str) else encoding.encode_address(txn.sender)
            receiver_addr = txn.receiver if isinstance(txn.receiver, str) else encoding.encode_address(txn.receiver)
            
            amount = txn.amt
            note_bytes = getattr(txn, 'note', b'') or b''
            note_str = note_bytes.decode('utf-8', errors='ignore')
            
            print(f"[Auth] SDK Decoded -> Sender: {sender_addr}, Amount: {amount}, Type: {txn.type}")
            print(f"[Auth] SDK Decoded Note: {note_str[:50]}...")

            checks = {
                "sender_match": sender_addr == wallet_address,
                "self_payment": sender_addr == receiver_addr,
                "zero_amount": amount == 0,
                "note_match": note_str == message,
                "type_match": txn.type == "pay"
            }
            
            print(f"[Auth] Verification results for {wallet_address}: {checks}")

            if all(checks.values()):
                print(f"[Auth] (SUCCESS) Verified {wallet_address}")
                if wallet_address in self.nonces:
                    del self.nonces[wallet_address]
                return True
            else:
                reason = [k for k, v in checks.items() if not v]
                print(f"[Auth] (REJECTED) Reasons: {reason}")
        except Exception as te:
            print(f"[Auth] (ERROR) SDK parsing exception: {te}")
            import traceback
            traceback.print_exc()

        return False
