export const getExplorerUrl = (chainId: number | undefined, hash: string, type: 'tx' | 'address' | 'app' = 'tx'): string => {
  const baseUrl = 'https://lora.algokit.io/testnet';
  if (type === 'address') return `${baseUrl}/account/${hash}`;
  if (type === 'tx') return `${baseUrl}/transaction/${hash}`;
  if (type === 'app') return `${baseUrl}/application/${hash}`;
  return `${baseUrl}/${type}/${hash}`;
};
