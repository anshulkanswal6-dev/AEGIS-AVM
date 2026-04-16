import { getExplorerAddressUrl, getExplorerTxUrl } from '../algorand/config';

export const BRANDING = {
  // --- Platform Identity ---
  siteName: import.meta.env.VITE_SITE_NAME || 'AEGIS AVM',
  tagline: import.meta.env.VITE_TAGLINE || 'Autonomous On-chain Agentic Jobs',

  // --- Network Configuration (Algorand AVM) ---
  networkName: import.meta.env.VITE_NETWORK_NAME || 'Algorand Testnet',
  currencySymbol: import.meta.env.VITE_CURRENCY_SYMBOL || 'ALGO',
  
  // Note: ChainId is mostly for EVM, but we keep it or use 416002 for Algorand Testnet
  chainId: 416002,
  
  explorerUrl: 'https://lora.algokit.io/testnet',

  // --- Layout Defaults ---
  defaultAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=AEGIS',
};

/**
 * Formats a block explorer link dynamically using Algorand native formats.
 */
export const getExplorerLink = (type: 'address' | 'tx' | 'app', value: string) => {
  if (type === 'address') return getExplorerAddressUrl(value);
  if (type === 'tx') return getExplorerTxUrl(value);
  return `https://lora.algokit.io/testnet/application/${value}`;
};
