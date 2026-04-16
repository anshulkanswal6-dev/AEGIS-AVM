import { useAgentWallet } from '../../hooks/useAgentWallet';
import { Bot, ExternalLink, Copy, Check, RefreshCw, ShieldCheck, Database } from 'lucide-react';
import { formatAddress } from '../../lib/utils/format';
import { getExplorerUrl } from '../../lib/utils/explorer';
import { useState, useEffect } from 'react';
import { cn } from '../../lib/utils/cn';
import { Button } from '../ui/UIPack';

import logoPng from '../../assets/Copy of AEGIS (640 x 640 px) (1).png';

export function AgentWalletCard() {
  const {
    agentWalletAddress, formatBalance, refetchBalance, chainSymbol
  } = useAgentWallet();
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);



  const handleCopy = () => {
    if (!agentWalletAddress) return;
    navigator.clipboard.writeText(agentWalletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchBalance();
    setTimeout(() => setRefreshing(false), 800);
  };


  if (!agentWalletAddress) return null;

  return (
    <div className="p-8 th-surface border border-[var(--th-border-strong)] rounded-2xl shadow-sm space-y-6 relative overflow-hidden group hover:border-[var(--th-text-tertiary)] transition-all">

      <div className="flex items-center justify-between pb-6 border-b border-[var(--th-border)] relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center text-white shadow-md border border-[var(--th-border-strong)]">
            <img src={logoPng} className="w-full h-full object-cover" alt="AEGIS" />
          </div>
          <div className="space-y-0.5">
            <h2 className="font-bold uppercase tracking-wider">Agent Wallet</h2>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-full border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[8px] font-bold uppercase tracking-wider">
          <ShieldCheck className="w-3 h-3" />
          Active
        </div>
      </div>

      <div className="space-y-4 relative mb-7 z-10">
        {/* Deployed Address Matrix */}
        <div className="p-4 rounded-xl border border-[var(--th-border-strong)] th-surface-elevated group/sub transition-all hover:th-surface relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] th-text-tertiary uppercase font-bold tracking-wider flex items-center gap-2">
              <Database className="w-3 h-3 opacity-40" />
              Wallet Address
            </span>
            <div className="flex items-center gap-1.5 opacity-40 group-hover/sub:opacity-100 transition-all">
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg th-text-tertiary hover:th-text hover:th-surface-hover transition-all active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <a
                href={getExplorerUrl(undefined, agentWalletAddress, 'address')}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg th-text-tertiary hover:th-text hover:th-surface-hover transition-all active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
          <span className="font-mono th-text text-xs font-bold block truncate tracking-tight">
            {formatAddress(agentWalletAddress!)}
          </span>
        </div>

        {/* Tactical Balance Unit - High Density */}
        <div className="p-6 rounded-xl th-surface-elevated border border-[var(--th-border-strong)] transition-all hover:th-surface active:scale-[0.98] shadow-sm relative overflow-hidden group/bal cursor-pointer" onClick={handleRefresh}>
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-[10px] th-text-tertiary uppercase font-bold tracking-wider">Available Balance</span>
            <div className={cn("th-text-tertiary hover:th-text transition-colors", refreshing && 'animate-spin')}>
              <RefreshCw className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-3xl font-bold tabular-nums tracking-tighter th-text transition-all duration-700">{formatBalance}</span>
            <span className="text-xs th-text-tertiary font-bold uppercase tracking-wider">{chainSymbol}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

