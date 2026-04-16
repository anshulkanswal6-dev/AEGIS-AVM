import { useState } from 'react';
import { useAgentWallet } from '../../hooks/useAgentWallet';
import { Button } from '../ui/UIPack';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

export function FundAgentWalletPanel() {
  const { deposit, isFunding, chainSymbol, algoBalance, formatBalance, agentWalletAddress } = useAgentWallet();
  const [amount, setAmount] = useState('1.0');

  const READINESS_THRESHOLD_MICRO = 500000n; // 0.5 ALGO
  const READINESS_THRESHOLD_ALGO = 0.5;
  const isReady = algoBalance >= READINESS_THRESHOLD_MICRO;

  const handleFund = () => {
    if (amount && parseFloat(amount) > 0) {
      deposit(amount);
    }
  };

  const copyToClipboard = () => {
    if (agentWalletAddress) {
      navigator.clipboard.writeText(agentWalletAddress);
    }
  };

  return (
    <div className="p-8 th-surface border border-[var(--th-border-strong)] rounded-2xl shadow-sm space-y-8 relative overflow-hidden group hover:border-[var(--th-text-tertiary)] transition-all">
      <div className="flex items-center gap-4 pb-6 border-b border-[var(--th-border)]">
        <div className="w-10 h-10 rounded-xl bg-blue-950 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
          <span className="text-xl">💰</span>
        </div>
        <div className="space-y-0.5">
          <h2 className="text-sm font-bold th-text uppercase tracking-wider">Fund Agent Wallet</h2>
          <p className="text-[10px] font-bold th-text-tertiary uppercase tracking-widest leading-none">Operational Status</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="th-surface-elevated p-4 rounded-xl border border-[var(--th-border-strong)] space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase th-text-tertiary tracking-wider">Agent Wallet Balance</span>
            <span className="text-xs font-bold th-text font-mono">{formatBalance} {chainSymbol}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase th-text-tertiary tracking-wider">Readiness Threshold</span>
            <span className="text-xs font-bold th-text-secondary font-mono">{READINESS_THRESHOLD_ALGO} {chainSymbol}</span>
          </div>
          <div className="pt-2 border-t border-[var(--th-border)] flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase th-text-tertiary tracking-wider">Status</span>
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border",
              isReady ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            )}>
              {isReady ? 'Ready' : 'Insufficient Balance'}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase th-text-tertiary tracking-wider flex justify-between">
            Agent Wallet Address
            <button onClick={copyToClipboard} className="hover:th-text transition-colors flex items-center gap-1">
              <span className="text-[9px]">Copy</span>
            </button>
          </label>
          <div className="w-full h-11 th-surface-input border border-[var(--th-border-strong)] rounded-xl px-4 flex items-center shadow-inner">
            <span className="text-[11px] th-text-tertiary font-mono truncate">{agentWalletAddress}</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase th-text-tertiary tracking-wider">Amount to Deposit ({chainSymbol})</label>
          <div className="relative group/input">
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1.0"
              className="w-full h-12 th-surface-input border border-[var(--th-border-strong)] rounded-xl px-5 text-sm th-text font-bold placeholder:th-text-tertiary outline-none focus:th-surface focus:border-blue-500 transition-all font-mono shadow-inner"
            />
            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-bold th-text-tertiary tracking-widest pointer-events-none group-focus-within/input:th-text transition-colors">{chainSymbol}</div>
          </div>
        </div>

        <Button
          onClick={handleFund}
          isLoading={isFunding}
          className="w-full h-12 rounded-xl bg-blue-950 text-white font-bold text-xs shadow-lg hover:translate-y-[-1px] active:translate-y-0 transition-all flex items-center justify-center gap-2"
        >
          Deposit {chainSymbol} to Agent <ArrowRight className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-2 justify-center py-2 rounded-lg th-surface-elevated border border-[var(--th-border-strong)] mt-4">
          <ShieldCheck className="w-3.5 h-3.5 th-text-tertiary" />
          <span className="text-[9px] font-bold th-text-tertiary uppercase tracking-widest leading-none">Secured Funding</span>
        </div>
      </div>
    </div>
  );
}
