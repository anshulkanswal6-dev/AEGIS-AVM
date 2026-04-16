export function cleanWeb3Error(error: any): string {
  if (!error) return 'An unknown error occurred';

  // Handle Viem/Wagmi specific short messages if they exist
  if (error.shortMessage) return error.shortMessage;

  const msg = error.message || String(error);

  // If user rejected 
  if (msg.includes('User rejected the request')) {
    return 'User rejected the transaction in wallet.';
  }

  // If it's a long RPC error with details, try to extract the main reason
  if (msg.includes('Request Arguments:')) {
    return msg.split('Request Arguments:')[0].trim();
  }

  // Common contract errors
  if (msg.includes('execution reverted')) {
    if (msg.includes('InsufficientBalance')) return 'Insufficient contract balance.';
    if (msg.includes('NotOwner')) return 'Only the owner can call this.';
    if (msg.includes('AlreadyInitialized')) return 'Wallet already initialized.';
    return 'Transaction reverted onchain.';
  }

  // Default truncation if it's still too long (avoiding raw contract addresses showing up)
  if (msg.length > 100) {
    return msg.substring(0, 100) + '...';
  }

  return msg;
}
