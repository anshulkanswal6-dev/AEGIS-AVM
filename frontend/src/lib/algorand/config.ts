export const ALGORAND_CONFIG = {
  ALGOD_URL: "https://testnet-api.algonode.cloud",
  ALGOD_TOKEN: "",
  INDEXER_URL: "https://testnet-idx.algonode.cloud",
  INDEXER_TOKEN: "",
  NETWORK: "testnet",
  FACTORY_APP_ID: Number(import.meta.env.VITE_ALGORAND_FACTORY_APP_ID) || 0,
  EXPLORER_BASE_URL: "https://lora.algokit.io/testnet",
  PERA_EXPLORER_URL: "https://testnet.explorer.perawallet.app",
};

export const getExplorerTxUrl = (txId: string) => `${ALGORAND_CONFIG.EXPLORER_BASE_URL}/transaction/${txId}`;
export const getExplorerAddressUrl = (address: string) => `${ALGORAND_CONFIG.EXPLORER_BASE_URL}/address/${address}`;
export const getExplorerAppUrl = (appId: number) => `${ALGORAND_CONFIG.EXPLORER_BASE_URL}/application/${appId}`;
