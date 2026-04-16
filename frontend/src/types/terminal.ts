export type LogType = 'info' | 'wallet' | 'pending' | 'success' | 'error' | 'explorer';

export interface TerminalLog {
  id: string;
  type: LogType;
  message: string;
  timestamp: number;
  txHash?: string;
  address?: string;
  explorerUrl?: string;
}
