import { useAlgorand } from '../../components/AlgorandProvider';
import { BRANDING } from '../../lib/config/branding';

import { Button } from '../ui/UIPack';
import { Wallet, ShieldCheck, ArrowRight } from 'lucide-react';

export function ConnectWalletCard() {
  const { isConnected, isLoggedIn, address, connect, login } = useAlgorand();

  // If already logged in, we don't need to show this card
  if (isLoggedIn && address) return null;

  return (
    <div className="p-8 th-surface border border-[var(--th-border-strong)] rounded-2xl shadow-sm space-y-8 relative overflow-hidden group hover:border-[var(--th-text-tertiary)] transition-all">
      <div className="flex items-center gap-4 pb-6 border-b border-[var(--th-border)]">
        <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
          <Wallet className="w-5 h-5" />
        </div>
        <div className="space-y-0.5">
          <h2 className="text-sm font-bold th-text uppercase tracking-wider">
            {!isConnected ? 'Connect Algorand' : 'Verify Identity'}
          </h2>
          <p className="text-[10px] font-bold th-text-tertiary uppercase tracking-widest leading-none">
            {!isConnected ? 'Authorization Required' : 'Signature Required'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          {!isConnected ? (
            <Button
              onClick={connect}
              variant="outline"
              className="w-full h-12 rounded-xl text-[10px] font-bold uppercase tracking-widest group border-[var(--th-border-strong)] hover:border-current transition-all flex items-center justify-center gap-2"
            >
              Connect with Defly
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Button>
          ) : (
            <Button
              onClick={login}
              className="w-full h-12 rounded-xl bg-blue-950 text-white text-[10px] font-bold uppercase tracking-widest group shadow-lg hover:bg-blue-900 transition-all flex items-center justify-center gap-2"
            >
              Sign to Login
              <ShieldCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 justify-center py-2.5 rounded-lg th-surface-elevated border border-[var(--th-border-strong)] mt-4">
           <ShieldCheck className="w-3.5 h-3.5 th-text-tertiary" />
           <span className="text-[9px] font-bold th-text-tertiary uppercase tracking-widest">Protocol: ALGORAND TESTNET</span>
        </div>
      </div>
    </div>
  );
}

