
export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

export const formatAlgo = (microalgos: bigint | string | number | undefined): string => {
  if (microalgos === undefined || microalgos === null) return '0.00';
  const val = Number(microalgos) / 1_000_000;
  return val.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
};
