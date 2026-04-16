import { useEffect, useState, useCallback, useMemo } from 'react';
import algosdk from 'algosdk';
import { useAlgorand } from '../components/AlgorandProvider';
import { ALGORAND_CONFIG, getExplorerTxUrl } from '../lib/algorand/config';
import { useAgentWalletStore } from '../store/walletStore';
import { useTerminalStore } from '../store/terminalStore';
import { useToast } from './useToast';
import { agentService } from '../services/agentService';

// Minimal ABI definitions
const FACTORY_ABI = {
  name: "AgentWalletFactory",
  methods: [
    { name: "create_wallet", args: [{type: "address", name: "executor"}, {type: "uint64", name: "daily_algo_limit"}], returns: {type: "uint64"} },
    { name: "get_my_wallet_app_id", args: [], returns: {type: "uint64"} },
    { name: "delete_wallet", args: [], returns: {type: "void"} }
  ]
};

const WALLET_ABI = {
  name: "AgentWallet",
  methods: [
    { name: "withdraw_algo", args: [{type: "uint64", name: "amount"}], returns: {type: "void"} },
    { name: "withdraw_asset", args: [{type: "uint64", name: "asset_id"}, {type: "uint64", name: "amount"}], returns: {type: "void"} },
    { name: "opt_in_asset", args: [{type: "uint64", name: "asset_id"}], returns: {type: "void"} },
    { name: "update_executor", args: [{type: "address", name: "new_executor"}], returns: {type: "void"} },
    { name: "pause_wallet", args: [], returns: {type: "void"} },
    { name: "unpause_wallet", args: [], returns: {type: "void"} },
    { name: "update_daily_algo_limit", args: [{type: "uint64", name: "new_limit"}], returns: {type: "void"} },
    { name: "update_daily_asset_limit", args: [{type: "uint64", name: "asset_id"}, {type: "uint64", name: "new_limit"}], returns: {type: "void"} },
    { name: "get_executor", args: [], returns: {type: "address"} },
    { name: "get_owner", args: [], returns: {type: "address"} }
  ]
};

export function useAgentWallet() {
  const { toast } = useToast();
  const { address: userAddress, isConnected, signer, isLoggedIn } = useAlgorand();
  const addLog = useTerminalStore((s) => s.addLog);
  const { 
    agentWalletAddress, setAgentWalletAddress, 
    setAlgoBalance, algoBalance,
    setCreating, isCreating,
    setFunding, isFunding,
    setWithdrawing, isWithdrawing
  } = useAgentWalletStore();

  const [walletAppId, setWalletAppId] = useState<number | null>(null);

  const algodClient = useMemo(() => new algosdk.Algodv2(ALGORAND_CONFIG.ALGOD_TOKEN, ALGORAND_CONFIG.ALGOD_URL), []);

  const getBoxName = useCallback((addr: string) => {
    const prefix = new TextEncoder().encode("uwa_");
    const publicKey = algosdk.decodeAddress(addr).publicKey;
    const boxName = new Uint8Array(prefix.length + publicKey.length);
    boxName.set(prefix);
    boxName.set(publicKey, prefix.length);
    return boxName;
  }, []);

  const fetchWalletInfo = useCallback(async () => {
    if (!userAddress || !isConnected) return;

    try {
      const boxName = getBoxName(userAddress);
      // 1. ALWAYS check the Authorized Database first (Source of Truth)
      let appIdNum = await agentService.getWalletAppId(userAddress);

      // 2. If DB is empty, ONLY then fallback to scanning the blockchain factory for "Ghosts"
      if (appIdNum === 0 || !appIdNum) {
        try {
          const boxResponse = await algodClient.getApplicationBoxByName(ALGORAND_CONFIG.FACTORY_APP_ID, boxName).do();
          if (boxResponse.value && boxResponse.value.length === 8) {
            const view = new DataView(boxResponse.value.buffer, boxResponse.value.byteOffset, boxResponse.value.byteLength);
            appIdNum = Number(view.getBigUint64(0));
          }
        } catch (boxErr: any) {
          // Normal 404
        }
      }

      if (appIdNum && appIdNum > 0) {
        setWalletAppId(appIdNum);
        const appAddr = algosdk.getApplicationAddress(appIdNum).toString();
        setAgentWalletAddress(appAddr);
        try {
          const accountInfo = await algodClient.accountInformation(appAddr).do();
          setAlgoBalance(BigInt(accountInfo.amount));
        } catch (balErr) {
          setAlgoBalance(0n);
        }
      } else {
        setAgentWalletAddress(null);
        setWalletAppId(null);
        setAlgoBalance(0n);
      }
    } catch (error: any) {
      console.warn("[AgentWallet] Fetch info warning:", error);
    }
  }, [userAddress, isConnected, algodClient, setAgentWalletAddress, setAlgoBalance, setWalletAppId, getBoxName]);

  useEffect(() => {
    if (isConnected && isLoggedIn) {
      fetchWalletInfo();
    }
  }, [isConnected, isLoggedIn, fetchWalletInfo]);

  const createWallet = async (executor: string, limitAlgo: string) => {
    if (!userAddress || !signer) return;
    setCreating(true);
    addLog({ type: 'info', message: 'Initiating AVM factory deployment sequence...' });
    try {
      const sp = await algodClient.getTransactionParams().do();
      const composer = new algosdk.AtomicTransactionComposer();
      const factoryMethods = FACTORY_ABI.methods.map(m => new algosdk.ABIMethod(m));
      const createMethod = factoryMethods.find(m => m.name === 'create_wallet')!;
      const limitMicro = BigInt(Math.floor(parseFloat(limitAlgo) * 1e6));
      const boxName = getBoxName(userAddress);

      composer.addMethodCall({
        appID: ALGORAND_CONFIG.FACTORY_APP_ID,
        method: createMethod,
        methodArgs: [executor, limitMicro],
        sender: userAddress,
        signer,
        suggestedParams: { ...sp, flatFee: true, fee: 4000 }, 
        boxes: [{ appIndex: ALGORAND_CONFIG.FACTORY_APP_ID, name: boxName }],
        appForeignApps: [ALGORAND_CONFIG.FACTORY_APP_ID],
        appAccounts: [executor, userAddress]
      });

      const { txIDs } = await composer.execute(algodClient, 4);
      const confirmation = await algosdk.waitForConfirmation(algodClient, txIDs[0], 4);
      const appId = confirmation['inner-txns']?.[0]?.['created-application-index'];

      if (appId) {
          addLog({ type: 'success', message: `Vault Initialized: App #${appId}` });
          await agentService.setWalletAppId(userAddress, appId);
          // Capture the Transaction ID for the creation
          const createTxId = txIDs[0];
          await agentService.logActivity(userAddress, 'create', `Vault Initialized: App #${appId}`, 'success', { txId: createTxId });
          toast('success', 'Deployment Successful', `Agent Wallet #${appId} created.`);
      }
      await fetchWalletInfo();
    } catch (error: any) {
      addLog({ type: 'error', message: `AVM Error: ${error.message}` });
      await agentService.logActivity(userAddress, 'error', `Deployment Failed: ${error.message}`, 'error');
      toast('error', 'Deployment Failed', error.message);
    } finally {
      setCreating(false);
    }
  };

  const getExecutor = useCallback(async () => {
    if (!walletAppId) return null;
    try {
      const appInfo = await algodClient.getApplicationByID(walletAppId).do();
      const globalState = appInfo.params['global-state'];
      const executorState = globalState?.find((s: any) => atob(s.key) === 'executor');
      if (executorState?.value?.bytes) {
         return algosdk.encodeAddress(Buffer.from(executorState.value.bytes, 'base64'));
      }
      return null;
    } catch (e) {
      return null;
    }
  }, [walletAppId, algodClient]);

  const authorizePlatformExecutor = async () => {
    if (!userAddress || !walletAppId || !signer) return;
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8002'}/automations/executor/address`);
      const { address: platformExecutor } = await resp.json();
      const sp = await algodClient.getTransactionParams().do();
      const composer = new algosdk.AtomicTransactionComposer();
      const walletMethods = WALLET_ABI.methods.map(m => new algosdk.ABIMethod(m));
      const updateMethod = walletMethods.find(m => m.name === 'update_executor')!;
      composer.addMethodCall({
        appID: walletAppId,
        method: updateMethod,
        methodArgs: [platformExecutor],
        sender: userAddress,
        signer,
        suggestedParams: sp,
      });
      await composer.execute(algodClient, 4);
      toast('success', 'Authorization Successful', 'Agent authorized.');
      await fetchWalletInfo();
    } catch (e: any) {
      toast('error', 'Authorization Failed', e.message);
    }
  };

  const deposit = async (amountAlgo: string) => {
    if (!userAddress || !agentWalletAddress || !signer) return;
    setFunding(true);
    try {
      const sp = await algodClient.getTransactionParams().do();
      const amountMicro = BigInt(Math.floor(parseFloat(amountAlgo) * 1e6));
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: userAddress,
        receiver: agentWalletAddress,
        amount: amountMicro,
        suggestedParams: sp,
      });
      const signatures = await signer([txn], [0]);
      const txId = (await algodClient.sendRawTransaction(signatures[0]).do()).txId;
      await algosdk.waitForConfirmation(algodClient, txId, 4);
      await agentService.logActivity(userAddress, 'deposit', `${amountAlgo} ALGO deposited to Agent.`, 'success', { txId });
      toast('success', 'Deposit Confirmed', `${amountAlgo} ALGO transferred.`);
      await fetchWalletInfo();
    } catch (error: any) {
      await agentService.logActivity(userAddress, 'error', `Deposit Failed: ${error.message}`, 'error');
      toast('error', 'Deposit Failed', error.message);
    } finally {
      setFunding(false);
    }
  };

  const withdraw = async (amountAlgo: string) => {
    if (!userAddress || !walletAppId || !signer) return;
    setWithdrawing(true);
    try {
      const sp = await algodClient.getTransactionParams().do();
      const amountMicro = BigInt(Math.floor(parseFloat(amountAlgo) * 1e6));
      const composer = new algosdk.AtomicTransactionComposer();
      const walletMethods = WALLET_ABI.methods.map(m => new algosdk.ABIMethod(m));
      const withdrawMethod = walletMethods.find(m => m.name === 'withdraw_algo')!;
      composer.addMethodCall({
        appID: walletAppId,
        method: withdrawMethod,
        methodArgs: [amountMicro],
        sender: userAddress,
        signer,
        suggestedParams: { ...sp, flatFee: true, fee: 2000 },
      });
      const { txIDs } = await composer.execute(algodClient, 4);
      await agentService.logActivity(userAddress, 'withdraw', `${amountAlgo} ALGO withdrawn from Agent.`, 'success', { txId: txIDs[0] });
      toast('success', 'Withdrawal Confirmed', 'Funds returned.');
      await fetchWalletInfo();
    } catch (error: any) {
      await agentService.logActivity(userAddress, 'error', `Withdrawal Failed: ${error.message}`, 'error');
      toast('error', 'Withdrawal Failed', error.message);
    } finally {
      setWithdrawing(false);
    }
  };

  const deleteWallet = useCallback(async () => {
    if (!userAddress || !signer) return;
    setWithdrawing(true);
    try {
      const sp = await algodClient.getTransactionParams().do();
      const composer = new algosdk.AtomicTransactionComposer();
      const factoryMethods = FACTORY_ABI.methods.map(m => new algosdk.ABIMethod(m));
      const deleteMethod = factoryMethods.find(m => m.name === 'delete_wallet')!;
      const boxName = getBoxName(userAddress);
      composer.addMethodCall({
        appID: ALGORAND_CONFIG.FACTORY_APP_ID,
        method: deleteMethod,
        methodArgs: [],
        sender: userAddress,
        signer,
        suggestedParams: { ...sp, flatFee: true, fee: 3000 },
        boxes: [{ appIndex: ALGORAND_CONFIG.FACTORY_APP_ID, name: boxName }],
      });
      await composer.execute(algodClient, 4);
      toast('success', 'Agent Decommissioned', 'Vault closed.');
      await agentService.setWalletAppId(userAddress, 0); 
      await fetchWalletInfo();
    } catch (err: any) {
      toast('error', 'Blockchain Deletion Failed', 'Transaction blocked. You can use "Forget Agent" to unstick your dashboard.');
    } finally {
      setWithdrawing(false);
    }
  }, [algodClient, userAddress, signer, getBoxName, fetchWalletInfo]);

  const forceUnlink = useCallback(async () => {
    if (!userAddress) return;
    try {
      setWithdrawing(true);
      await agentService.setWalletAppId(userAddress, 0);
      await fetchWalletInfo();
      toast('success', 'Agent Forgotten', 'Dashboard reset.');
    } finally {
      setWithdrawing(false);
    }
  }, [userAddress, fetchWalletInfo]);

  return {
    agentWalletAddress,
    walletAppId,
    algoBalance,
    formatBalance: (Number(algoBalance) / 1e6).toFixed(4),
    isCreating,
    isFunding,
    isWithdrawing,
    createWallet,
    deposit,
    withdraw,
    deleteWallet,
    forceUnlink,
    getExecutor,
    authorizePlatformExecutor,
    refetchBalance: fetchWalletInfo,
    refetchWallet: fetchWalletInfo,
    chainSymbol: 'ALGO'
  };
}
