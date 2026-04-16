import { useAlgorand } from '../AlgorandProvider';
import { useAgentWallet } from '../../hooks/useAgentWallet';
import { Bot, ArrowRight, ShieldCheck, Zap, Copy, Check } from 'lucide-react';
import { Button } from '../ui/UIPack';
import { useState, useEffect } from 'react';
import { PLATFORM_EXECUTOR_ADDRESS } from '../../lib/config/contracts';

export function CreateAgentWalletPanel() {
  const { isConnected, address } = useAlgorand();
  const { createWallet, isCreating, walletAppId } = useAgentWallet();
  const [executor, setExecutor] = useState(PLATFORM_EXECUTOR_ADDRESS);
  const [limit, setLimit] = useState('0.1');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(executor);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    // Keep it always set to the platform executor as per contract requirements
    setExecutor(PLATFORM_EXECUTOR_ADDRESS);
  }, []);

  const handleCreate = () => {
    if (!address || !executor || !limit) return;
    if (walletAppId) {
        console.warn("[CreateAgent] Duplicate creation blocked. Wallet ID already exists:", walletAppId);
        return;
    }
    createWallet(executor, limit);
  };

  if (!isConnected) return null;

  return (
    <div className="p-8 th-surface border border-[var(--th-border-strong)] rounded-2xl shadow-sm space-y-8 relative overflow-hidden group hover:border-[var(--th-text-tertiary)] transition-all">
      <div className="flex items-center gap-4 pb-6 border-b border-[var(--th-border)]">
        <div className="w-10 h-10 rounded-xl bg-blue-950 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
          <Bot className="w-5 h-5" />
        </div>
        <div className="space-y-0.5">
          <h2 className="text-sm font-bold th-text uppercase tracking-wider">Initialize Agent</h2>
          <p className="text-[10px] font-bold th-text-tertiary uppercase tracking-widest leading-none">Agent Wallet  Creation</p>
        </div>
      </div>

      <div className="space-y-6">
         <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase th-text-tertiary tracking-wider ml-1">Platform Authorized Executor (Linked)</label>
            <div className="relative group/input">
              <input 
                type="text" 
                value={executor}
                readOnly
                className="w-full h-12 th-surface-input border border-[var(--th-border-strong)] rounded-xl pl-5 pr-12 text-sm th-text-tertiary font-bold outline-none font-mono shadow-inner cursor-not-allowed"
              />
              <button 
                onClick={handleCopy}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:th-surface th-text-tertiary hover:th-text transition-all active:scale-95"
                title="Copy executor address"
              >
                 {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
         </div>

         <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase th-text-tertiary tracking-wider ml-1">Daily Withdrawal Limit (ALGO)</label>
            <div className="relative group/input">
              <input 
                type="number" 
                step="0.01"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="0.1"
                className="w-full h-12 th-surface-input border border-[var(--th-border-strong)] rounded-xl px-5 text-sm th-text font-bold placeholder:th-text-tertiary outline-none focus:th-surface focus:border-blue-500 transition-all font-mono shadow-inner"
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-bold th-text-tertiary tracking-widest pointer-events-none group-focus-within/input:th-text transition-colors">ALGO/DAY</div>
            </div>
         </div>
      </div>

      <div className="space-y-4">
        <Button
          onClick={handleCreate}
          isLoading={isCreating}
          className="w-full h-12 rounded-xl bg-blue-950 text-white font-bold text-xs shadow-lg hover:translate-y-[-1px] active:translate-y-0 transition-all flex items-center justify-center gap-2"
          disabled={!executor || !limit}
        >
          Initialize Agent Wallet <ArrowRight className="w-4 h-4" />
        </Button>

        <div className="grid grid-cols-2 gap-3">
           
           
        </div>
      </div>
    </div>
  );
}
