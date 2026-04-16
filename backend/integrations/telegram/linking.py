import uuid
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from runtime_store import get_store
from supabase_store import SupabaseStore

def generate_link_token(user_id: str) -> str:
    """Generates a one-time use token for linking a Telegram account."""
    try:
        store = get_store()
        if not isinstance(store, SupabaseStore):
            raise RuntimeError("Telegram integration requires SupabaseStore")

        token = secrets.token_urlsafe(16)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

        print(f"[Telegram-Linking] Generating token for user_id: {user_id}")
        store.client.table("telegram_link_tokens").insert({
            "user_id": user_id,
            "token": token,
            "expires_at": expires_at.isoformat(),
            "used": False
        }).execute()

        return token
    except Exception as e:
        print(f"[Telegram-Linking] CRITICAL ERROR in generate_link_token: {str(e)}")
        import traceback
        traceback.print_exc()
        raise e

def verify_and_link(token: str, telegram_user_id: str, telegram_chat_id: str, telegram_username: str = None) -> Optional[str]:
    """
    Verifies a token and links the telegram account to the user.
    Returns user_id if successful, None otherwise.
    """
    store = get_store()
    if not isinstance(store, SupabaseStore):
        return None

    # 1. Validate token
    result = store.client.table("telegram_link_tokens") \
        .select("*") \
        .eq("token", token) \
        .eq("used", False) \
        .execute()

    if not result.data:
        return None

    record = result.data[0]
    expires_at = datetime.fromisoformat(record["expires_at"].replace('Z', '+00:00'))
    
    if datetime.now(timezone.utc) > expires_at:
        return None

    user_id = record["user_id"]

    # 2. Prevent same Telegram account from being linked to multiple users
    # Check if this telegram_user_id is already used by someone else
    existing = store.client.table("user_telegram_accounts") \
        .select("user_id") \
        .eq("telegram_user_id", telegram_user_id) \
        .execute()
    
    if existing.data and existing.data[0]["user_id"] != user_id:
        # Already linked to another user
        return "conflict"

    # 3. Mark token as used
    store.client.table("telegram_link_tokens") \
        .update({"used": True}) \
        .eq("id", record["id"]) \
        .execute()

    # 4. Link account (with upsert/overwrite logic for the user)
    # The requirement is: If user already has a Telegram account linked, overwrite it.
    # We use user_id as the unique key for the upsert (handled by DB constraint or explicit check)
    store.client.table("user_telegram_accounts").upsert({
        "user_id": user_id,
        "telegram_user_id": telegram_user_id,
        "telegram_chat_id": telegram_chat_id,
        "telegram_username": telegram_username,
        "created_at": datetime.now(timezone.utc).isoformat()
    }, on_conflict="user_id").execute()

    return user_id

def get_telegram_account(user_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves linked telegram account for a user."""
    try:
        store = get_store()
        if not isinstance(store, SupabaseStore):
            return None
            
        result = store.client.table("user_telegram_accounts") \
            .select("*") \
            .eq("user_id", user_id) \
            .execute()
        
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[Telegram-Linking] Error in get_telegram_account: {str(e)}")
        return None

def unlink_telegram_account(user_id: str) -> bool:
    """Removes the linked telegram account and deletes all active link tokens for a user."""
    try:
        store = get_store()
        if not isinstance(store, SupabaseStore):
            return False
            
        # 0. Get account info to send a farewell message
        account = get_telegram_account(user_id)
        if account and account.get("telegram_chat_id"):
            try:
                from .service import TelegramService
                svc = TelegramService()
                svc.send_message(
                    account["telegram_chat_id"], 
                    "⚠️ <b>AEGIS Unlinked from Telegram</b>\n\nYou no longer can manage AEGIS from here.💨 If this was a mistake, go to the AEGIS dashboard to link it again.🥂"
                )
            except Exception as msg_e:
                print(f"[Telegram-Linking] Warning: Failed to send unlink message: {msg_e}")

        # 1. Delete linked account record
        store.client.table("user_telegram_accounts") \
            .delete() \
            .eq("user_id", user_id) \
            .execute()
            
        # 2. Delete all existing link tokens (active or used) for this user
        store.client.table("telegram_link_tokens") \
            .delete() \
            .eq("user_id", user_id) \
            .execute()
            
        return True
    except Exception as e:
        print(f"[Telegram-Linking] Error in unlink_telegram_account: {str(e)}")
        return False
def is_telegram_user_linked(telegram_user_id: str) -> bool:
    """Checks if a telegram user ID is already linked to any account."""
    try:
        store = get_store()
        if not isinstance(store, SupabaseStore):
            return False
            
        result = store.client.table("user_telegram_accounts") \
            .select("user_id") \
            .eq("telegram_user_id", telegram_user_id) \
            .execute()
        
        return len(result.data) > 0
    except Exception as e:
        print(f"[Telegram-Linking] Error in is_telegram_user_linked: {str(e)}")
        return False
