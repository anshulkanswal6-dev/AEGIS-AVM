import { create } from 'zustand';

interface AgentWalletState {
  agentWalletAddress: string | null;
  algoBalance: bigint; // Balance in microAlgos
  isCreating: boolean;
  isFunding: boolean;
  isWithdrawing: boolean;
  setAgentWalletAddress: (address: string | null) => void;
  setAlgoBalance: (balance: bigint) => void;
  setCreating: (loading: boolean) => void;
  setFunding: (loading: boolean) => void;
  setWithdrawing: (loading: boolean) => void;
}

export const useAgentWalletStore = create<AgentWalletState>((set) => ({
  agentWalletAddress: null,
  algoBalance: 0n,
  isCreating: false,
  isFunding: false,
  isWithdrawing: false,
  setAgentWalletAddress: (address) => set({ agentWalletAddress: address }),
  setAlgoBalance: (balance) => set({ algoBalance: balance }),
  setCreating: (loading) => set({ isCreating: loading }),
  setFunding: (loading) => set({ isFunding: loading }),
  setWithdrawing: (loading) => set({ isWithdrawing: loading }),
}));

// Backward compatibility alias — some components still reference ethBalance/setEthBalance
// These map to the same underlying algoBalance state.
export const useAgentWalletStoreCompat = () => {
  const store = useAgentWalletStore();
  return {
    ...store,
    ethBalance: store.algoBalance,
    setEthBalance: store.setAlgoBalance,
  };
};
