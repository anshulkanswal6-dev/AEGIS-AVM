
// The Aegis platform executor (Algorand Testnet)
export const PLATFORM_EXECUTOR_ADDRESS: string = 
  import.meta.env.VITE_ALGORAND_EXECUTOR_ADDRESS || 'S2WAP2GUQX4BULFITUEXZY225VEHMTYMDDOMKD45YSX5FZFXDAZP6CWHIQ';

export const CONTRACT_CONFIG = {
  executor: {
    address: PLATFORM_EXECUTOR_ADDRESS,
  }
} as const;
