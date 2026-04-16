import { useAgentWallet } from '../hooks/useAgentWallet';
import { AgentWalletCard } from '../components/wallet/AgentWalletCard';
import { FundAgentWalletPanel } from '../components/onboarding/FundAgentWalletPanel';
import { WithdrawFundsPanel } from '../components/onboarding/WithdrawFundsPanel';
import { DangerZoneCard } from '../components/wallet/DangerZoneCard';
import { useAlgorand } from '../components/AlgorandProvider';
import { GlobalHeader } from '../components/layout/Header';
import { Navigate } from 'react-router-dom';
import { ShieldCheck, Database, LayoutDashboard, Terminal } from 'lucide-react';
import { Button } from '../components/ui/UIPack';

import { BRANDING } from '../lib/config/branding';

export default function WalletPage() {
  const { isConnected } = useAlgorand();
  const { agentWalletAddress } = useAgentWallet();

  if (!isConnected) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen th-bg th-text">
      
      <div className="max-w-7xl mx-auto p-10 space-y-12 animate-in fade-in duration-700">
        <GlobalHeader />
        
        {/* Infrastructure Branding */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-10 border-b border-[var(--th-border-strong)]">
           <div className="space-y-1">
              <div className="flex items-center gap-2 px-3 py-1 th-surface border border-[var(--th-border-strong)] th-text-tertiary text-[10px] font-bold uppercase tracking-wider w-fit rounded-lg shadow-sm mb-3">
                 <Database className="w-3.5 h-3.5 th-text" />
                 Network Infrastructure
              </div>
              <h1 className="text-4xl font-bold tracking-tight th-text leading-tight">Manage Agent Wallet</h1>
              <p className="th-text-secondary font-medium text-sm">Monitor and manage your persistent on-chain agent wallet and resources.</p>
           </div>
        </header>

        {!agentWalletAddress ? (
          <div className="max-w-xl mx-auto py-32 text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="w-20 h-20 rounded-3xl th-surface border border-[var(--th-border-strong)] flex items-center justify-center mx-auto mb-10 shadow-lg">
                <Database className="w-10 h-10 th-text-tertiary" />
             </div>
             <div className="space-y-3">
               <h2 className="text-2xl font-bold tracking-tight th-text">No Agent Wallet Found</h2>
               <p className="text-sm th-text-tertiary font-medium max-w-[320px] mx-auto leading-relaxed">You haven't initialized your Agent Wallet yet. Return to the home page to begin deployment.</p>
             </div>
             <Button 
                onClick={() => window.location.href = '/'}
                className="w-full h-12 rounded-xl bg-blue-950 text-white font-bold text-sm shadow-lg hover:translate-y-[-1px] transition-all"
             >
                Initialize Agent Wallet
             </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Core Operational Matrix */}
            <div className="lg:col-span-8 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <FundAgentWalletPanel />
                 <WithdrawFundsPanel />
              </div>

              <div className="p-8 rounded-2xl th-surface border border-[var(--th-border-strong)] shadow-sm space-y-6 relative overflow-hidden group">
                 <div className="flex items-center gap-3 border-b border-[var(--th-border)] pb-6">
                    <Terminal className="w-4 h-4 th-text" />
                    <h3 className="text-xs font-bold uppercase tracking-wider th-text">Operational Metrics</h3>
                 </div>
                 <p className="text-sm th-text-secondary font-medium leading-relaxed">
                   Active operational data for this node is visualized in the persistent terminal drawer. 
                   Open the terminal at the bottom of the screen to monitor real-time execution logs and neural verification metrics.
                 </p>
              </div>
            </div>

            {/* Strategic Details & Risk Management */}
            <div className="lg:col-span-4 space-y-10">
               <AgentWalletCard />
               <DangerZoneCard />
            </div>
          </div>
        )}

        <footer className="pt-20 border-t border-[var(--th-border-strong)] flex flex-col md:flex-row md:items-center justify-between gap-6 pb-20">
           <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4 th-text-tertiary" />
                 <span className="text-[11px] font-bold th-text-tertiary uppercase tracking-wider">Security: Persistent</span>
              </div>
              <div className="flex items-center gap-2">
                 <Database className="w-4 h-4 th-text-tertiary" />
                 <span className="text-[11px] font-bold th-text-tertiary uppercase tracking-wider">Network: {BRANDING.networkName}</span>
              </div>
           </div>
           <span className="text-[10px] font-bold th-text-tertiary uppercase tracking-[0.3em]">AEGIS PLATFORM V1.0.4-BETA</span>
        </footer>
      </div>
    </div>
  );
}
