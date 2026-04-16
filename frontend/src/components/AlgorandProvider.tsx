import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { DeflyWalletConnect } from '@blockshake/defly-connect';
import algosdk from 'algosdk';
import { ALGORAND_CONFIG } from '../lib/algorand/config';
import { agentService } from '../services/agentService';

interface AlgorandContextType {
  address: string | null;
  isConnected: boolean;
  isLoggedIn: boolean;
  connect: () => Promise<void>;
  login: () => Promise<void>;
  disconnect: () => void;
  signer: ((txns: algosdk.Transaction[], indexes: number[]) => Promise<Uint8Array[]>) | null;
  deflyInstance: DeflyWalletConnect | null;
}

const AlgorandContext = createContext<AlgorandContextType | undefined>(undefined);

const sanitizeAddress = (addr: string | null) => {
    if (!addr || addr === 'null' || addr === 'undefined') return null;
    return addr.trim();
};

export const AlgorandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, _setAddress] = useState<string | null>(sanitizeAddress(localStorage.getItem('algorand_address')));
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('algorand_token'));
  const deflyInstance = useMemo(() => new DeflyWalletConnect(), []);
  const algodClient = useMemo(() => new algosdk.Algodv2(ALGORAND_CONFIG.ALGOD_TOKEN, ALGORAND_CONFIG.ALGOD_URL), []);

  const setAddress = (addr: string | null) => {
      const clean = sanitizeAddress(addr);
      _setAddress(clean);
      if (clean) localStorage.setItem('algorand_address', clean);
      else localStorage.removeItem('algorand_address');
  };

  const isConnected = !!address;

  const connect = useCallback(async () => {
    try {
      const accounts = await deflyInstance.connect();
      if (accounts.length > 0) setAddress(accounts[0]);
    } catch (e: any) {
      console.error("[AlgorandProvider] Connection failed", e);
    }
  }, [deflyInstance]);

  const login = useCallback(async () => {
    if (!address) return;
    try {
      const nonceResponse = await agentService.getAuthNonce(address.trim());
      const { message } = nonceResponse;
      if (!message) throw new Error("Invalid nonce");

      const sp = await algodClient.getTransactionParams().do();
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: address,
        receiver: address,
        amount: 0,
        note: new TextEncoder().encode(message),
        suggestedParams: sp,
      });

      const signerTxn = { txn, signers: [address] };
      const signatures = await deflyInstance.signTransaction([[signerTxn]]);
      const signatureB64 = btoa(String.fromCharCode(...signatures[0]));
      
      const verifyResult = await agentService.verifyAuth(address, signatureB64, message);
      if (verifyResult.success) {
        localStorage.setItem('algorand_token', 'verified');
        setIsLoggedIn(true);
      }
    } catch (error: any) {
      console.error("[AlgorandProvider] Login failed:", error);
    }
  }, [address, deflyInstance, algodClient]);

  const disconnect = useCallback(() => {
    deflyInstance.disconnect();
    setAddress(null);
    setIsLoggedIn(false);
    localStorage.removeItem('algorand_token');
    localStorage.removeItem('algorand_profile_id');
    window.location.reload();
  }, [deflyInstance]);

  useEffect(() => {
    deflyInstance.reconnectSession().then((accounts) => {
      if (accounts.length > 0) setAddress(accounts[0]);
    }).catch(() => {});
  }, [deflyInstance]);

  const signer = useCallback(async (txns: algosdk.Transaction[], indexes: number[]) => {
    console.log(`[AlgorandProvider] signer() called for ${txns.length} txns.`);
    
    // Convert to SignerTransaction[]
    const signerTxns = txns.map((tx, i) => {
        // Safe logging without using encodeAddress on potentially raw objects
        console.log(`[AlgorandProvider] Txn ${i}: type=${tx.type}, sender=${address}`);
        
        return {
            txn: tx,
            signers: indexes.includes(i) ? [address!] : [] as string[],
        };
    });
    
    try {
        console.log(`[AlgorandProvider] Requesting Defly group signature...`);
        const result = await deflyInstance.signTransaction([signerTxns]);
        console.log(`[AlgorandProvider] Received ${result.length} signatures.`);
        return result;
    } catch (err: any) {
        console.error(`[AlgorandProvider] Defly error:`, err);
        throw err;
    }
  }, [deflyInstance, address]);

  return (
    <AlgorandContext.Provider value={{ address, isConnected, isLoggedIn, connect, login, disconnect, signer, deflyInstance }}>
      {children}
    </AlgorandContext.Provider>
  );
};

export const useAlgorand = () => {
  const context = useContext(AlgorandContext);
  if (context === undefined) throw new Error('useAlgorand must be used within an AlgorandProvider');
  return context;
};
