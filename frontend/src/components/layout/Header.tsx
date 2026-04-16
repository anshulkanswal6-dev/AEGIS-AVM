import { useState } from 'react';
import { useAgentWallet } from '../../hooks/useAgentWallet';
import { useAlgorand } from '../AlgorandProvider';
import { cn } from '../../lib/utils/cn';
import { User, LogOut, ChevronDown, Copy, Check } from 'lucide-react';
import { ThemeToggle } from '../ui/UIPack';
import { useNavigate } from 'react-router-dom';

import logoPng from '../../assets/Copy of AEGIS (640 x 640 px) (1).png';

import { BRANDING } from '../../lib/config/branding';

export function GlobalHeader() {
  const { isConnected, address, disconnect } = useAlgorand();
  const navigate = useNavigate();
  const { agentWalletAddress, formatBalance, chainSymbol } = useAgentWallet();
  const [showProfile, setShowProfile] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Show only if connected and has an agent wallet initialized
  if (!isConnected || !agentWalletAddress) return null;

  const isCorrectChain = true; // For now assume correct chain if connected to Algorand Testnet

  return (
    <div className="absolute top-6 right-8 z-[100] flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
      
      {/* Branding Logo */}
      {/* <div 
        className="w-9 h-9 rounded-xl overflow-hidden border border-[var(--th-border-strong)] shadow-sm cursor-pointer hover:border-[var(--th-text-tertiary)] transition-all active:scale-95 bg-blue-950 flex-shrink-0"
        onClick={() => navigate('/')}
      > */}
        {/* <img src={logoPng} alt="AEGIS" className="w-full h-full object-cover" /> */}
      {/* </div> */}

      {/* Chain Status Badge */}
      <div className="h-9 px-4 flex items-center gap-2.5 th-surface-elevated rounded-xl border border-[var(--th-border-strong)] group hover:border-[var(--th-text-tertiary)] transition-all cursor-default shadow-sm">
        <div className={cn(
          "w-2 h-2 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]", 
          isCorrectChain ? "bg-emerald-500" : "bg-rose-500"
        )} />
        <span className="text-[10px] font-bold th-text tracking-widest uppercase">
          {isCorrectChain ? BRANDING.networkName : 'Wrong Network'}
        </span>
      </div>

      {/* Profile & Balance Cluster */}
      <div className="relative">
        <button 
          onClick={() => setShowProfile(!showProfile)}
          className="h-10 flex items-center gap-3 px-1.5 th-surface border border-[var(--th-border-strong)] rounded-2xl hover:border-blue-500 transition-all group overflow-hidden shadow-sm active:scale-95"
        >
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#FF4D4D] to-rose-600 flex items-center justify-center text-white text-[10px] font-black shadow-lg transform transition-transform group-hover:scale-90">
            {address?.slice(0, 2).toUpperCase() || 'AE'}
          </div>
          <div className="flex flex-col items-start pr-1">
            <span className="text-[9px] font-black th-text-tertiary uppercase tracking-widest leading-none mb-1">Agent Balance</span>
            <span className="text-[11px] font-bold th-text tracking-tight leading-none">
              {formatBalance} {chainSymbol}
            </span>
          </div>
          <ChevronDown className={cn("w-3 h-3 th-text-tertiary mr-1 transition-transform", showProfile && "rotate-180")} />
        </button>

        {/* Dropdown Menu */}
        {showProfile && (
          <>
            <div 
              className="fixed inset-0 z-[-1]" 
              onClick={() => setShowProfile(false)} 
            />
            <div className="absolute top-full right-0 mt-2 w-64 th-surface-elevated border border-[var(--th-border-strong)] rounded-2xl shadow-2xl p-2 z-[100] animate-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-[var(--th-border-strong)] mb-1">
                <p className="text-[10px] font-black th-text-tertiary uppercase tracking-widest mb-1.5">Signed in as</p>
                <div className="flex items-center justify-between gap-3">
                   <p className="text-xs font-bold th-text truncate font-mono">{address || '0x000...000'}</p>
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                     className="p-1.5 rounded-lg hover:th-surface th-text-tertiary hover:th-text transition-all active:scale-95 border border-transparent hover:border-[var(--th-border-strong)]"
                     title="Copy address"
                   >
                      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                   </button>
                </div>
              </div>
              <div className="space-y-0.5">
                <button 
                  onClick={() => { navigate('/wallet'); setShowProfile(false); }}
                  className="w-full px-4 py-2 flex items-center justify-between hover:th-surface-hover transition-colors group rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <User className="w-3.5 h-3.5 th-text-tertiary group-hover:th-text" />
                    <span className="text-xs font-semibold th-text-secondary group-hover:th-text text-left">Wallet Settings</span>
                  </div>
                </button>

                {/* Theme Toggle Section */}
                <div className="px-4 py-2 flex items-center justify-between border-t border-[var(--th-border-strong)] mt-1 pt-3">
                  <span className="text-[10px] font-black th-text-tertiary uppercase tracking-widest">Theme</span>
                  <ThemeToggle />
                </div>
                <button 
                  onClick={() => { disconnect(); setShowProfile(false); }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors group mt-1 rounded-xl"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Logout</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
