import type { TerminalLog } from '../../types/terminal';
import { ExternalLink, CheckCircle, Info, Loader2, XCircle, Wallet, ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

export function TerminalLogLine({ log }: { log: TerminalLog }) {
  const IconMap = {
    info: Info,
    wallet: Wallet,
    pending: Loader2,
    success: CheckCircle,
    error: XCircle,
    explorer: ArrowUpRight,
  };

  const Icon = IconMap[log.type as keyof typeof IconMap] || Info;

  const colors = {
    info: 'th-text-tertiary',
    wallet: 'text-blue-600 dark:text-blue-400',
    pending: 'text-amber-600 dark:text-amber-400',
    success: 'text-emerald-600 dark:text-emerald-400',
    error: 'text-rose-600 dark:text-rose-400',
    explorer: 'text-indigo-600 dark:text-indigo-400',
  }[log.type as keyof typeof IconMap] || 'th-text-tertiary';

  const timeString = new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="flex gap-2 py-1 px-2.5 font-mono text-[9px] border-b border-[var(--th-border)] hover:th-surface-hover transition-all group items-center">
      <span className="th-text-tertiary shrink-0 select-none tabular-nums">[{timeString}]</span>
      <Icon className={cn("w-3.5 h-3.5 shrink-0", colors, log.type === 'pending' && "animate-spin")} strokeWidth={3} />
      
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className={cn("uppercase text-[8px] font-bold shrink-0 w-12 select-none text-right tracking-widest", colors)}>
          {log.type}
        </span>
        <span className="th-text-secondary truncate tracking-tight font-medium">{log.message}</span>
        
        {log.txHash && !log.explorerUrl && (
          <span className="text-[8px] th-text-tertiary truncate font-bold ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
            H: {log.txHash.slice(0, 10)}...
          </span>
        )}

        {log.explorerUrl && (
          <a 
            href={log.explorerUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-[8px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-all bg-indigo-50/50 dark:bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-500/20 shadow-sm"
          >
            EXPLORE
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>
    </div>
  );
}

