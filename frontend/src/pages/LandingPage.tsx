import { ConnectWalletCard } from '../components/wallet/ConnectWalletCard';
import { CreateAgentWalletPanel } from '../components/onboarding/CreateAgentWalletPanel';
import { FundAgentWalletPanel } from '../components/onboarding/FundAgentWalletPanel';
import { useAlgorand } from '../components/AlgorandProvider';
import { useAgentWallet } from '../hooks/useAgentWallet';
import { ShieldCheck, ArrowRight, LayoutDashboard, Terminal, Clock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { Button } from '../components/ui/UIPack';
import { cn } from '../lib/utils/cn';
import { BRANDING } from '../lib/config/branding';
import { GlobalHeader } from '../components/layout/Header';
import { useAutomationStore } from '../store/automationStore';
import { useEffect, useMemo } from 'react';

export default function LandingPage() {
   const { isConnected, address, isLoggedIn } = useAlgorand();
   const { agentWalletAddress, algoBalance, deleteWallet, chainSymbol } = useAgentWallet();
   const navigate = useNavigate();
   const { projects, fetchProjects } = useProjectStore();
   const { automations, fetchAutomations } = useAutomationStore();

   useEffect(() => {
      console.log("[LandingPage] Effect: Address sync update:", { address, isConnected, isLoggedIn });
      if (address && isLoggedIn) {
         fetchAutomations(address);
         fetchProjects(address);
      }
   }, [address, isConnected, isLoggedIn, fetchProjects, fetchAutomations]);

   const recentProjects = useMemo(() => {
      return projects.slice(0, 3).map(p => {
         const isDeployed = automations.some(a => a.name.toLowerCase() === p.name.toLowerCase());
         return { ...p, isDeployed };
      });
   }, [projects, automations]);

   const getStatusDisplay = (p: any) => {
      const status = p.status?.toLowerCase() || 'unknown';
      if (p.isDeployed && status === 'draft') return 'paused';
      if (status === 'ready') return 'paused';
      return status;
   };
    
    // REDESIGN: AVM Strict Onboarding Logic
    const READINESS_THRESHOLD = 500000n; // 0.5 ALGO in microAlgos
    
    const currentStep = useMemo(() => {
        const debugState = {
            isConnected,
            isLoggedIn,
            hasAddress: !!address,
            hasAgent: !!agentWalletAddress,
            algoBalance: algoBalance.toString()
        };
        console.log("[LandingPage] memo: Computing currentStep with state:", debugState);

        if (!isConnected || !isLoggedIn || !address) {
            console.log("[LandingPage] memo: Result -> Step 1 (Auth required)");
            return 1;
        }
        
        if (!agentWalletAddress) {
            console.log("[LandingPage] memo: Result -> Step 2 (Deploy required)");
            return 2;
        }
        
        if (algoBalance < READINESS_THRESHOLD) {
            console.log("[LandingPage] memo: Result -> Step 3 (Funding required)");
            return 3;
        }
        
        console.log("[LandingPage] memo: Result -> Step 4 (Ready)");
        return 4;
    }, [isConnected, isLoggedIn, address, agentWalletAddress, algoBalance]);

    const steps = [
      { number: 1, title: 'Connect & Auth', description: `Authorize your personal Defly wallet session.` },
      { number: 2, title: 'Deploy Agent Contract', description: 'Initialize your unique per-user Agent Wallet contract.' },
      { number: 3, title: 'Fund Agent Account', description: `Deposit ${chainSymbol} to your Agent's app account for automation.` },
      { number: 4, title: 'Ready to Build', description: 'Launch your first autonomous AVM task.' },
    ];

   return (
     <div className="min-h-screen th-bg th-text">
        <div className="max-w-7xl mx-auto px-8 py-0 relative">
          <GlobalHeader />
        </div>
       

         {/* Onboarding Section */}
         <section className="max-w-5xl mx-auto px-8 py-44">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
               {/* Stepper Side */}
               <div className="space-y-12">
                  <div className="space-y-4">
                     <h2 className="text-3xl font-black tracking-tight">Onboarding Guide</h2>
                     <p className="th-text-tertiary font-medium text-sm">Follow these steps to initialize your agent workspace and start building.</p>
                  </div>
                  <div className="space-y-8">
                     {steps.map((step) => (
                        <div key={step.number} className={cn(
                           "flex items-start gap-5 transition-opacity",
                           currentStep < step.number && "opacity-30"
                        )}>
                           <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border transition-all",
                              currentStep === step.number ? "bg-blue-950 text-white border-blue-950 shadow-lg scale-110" : "th-surface th-text-tertiary border-[var(--th-border-strong)]"
                           )}>
                              {currentStep > step.number ? <CheckCircle2 className="w-6 h-6 th-text" /> : `0${step.number}`}
                           </div>
                           <div className="space-y-1 pt-1">
                              <h3 className="font-bold text-sm tracking-tight">{step.title}</h3>
                              <p className="text-[11px] th-text-tertiary font-medium leading-relaxed">{step.description}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Interaction Card Side */}
               <div className="flex justify-center lg:justify-end">
                  <div className="w-full max-w-[420px]">
                     {currentStep === 1 && <ConnectWalletCard />}
                     {currentStep === 2 && <CreateAgentWalletPanel />}
                     {currentStep === 3 && <FundAgentWalletPanel />}

                     {currentStep === 4 && (
                        <div className="p-8 th-surface border border-[var(--th-border-strong)] rounded-2xl shadow-sm text-center space-y-8 min-h-[380px] flex flex-col justify-center transition-all hover:border-[var(--th-text-tertiary)]">
                           <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-emerald-100 dark:border-emerald-500/20">
                              <ShieldCheck className="w-8 h-8" />
                           </div>
                           <div className="space-y-3">
                              <h2 className="text-2xl font-bold uppercase">Agent Smart Contract Initialized</h2>
                              <p className="text-[12px] th-text-tertiary tracking-widest leading-relaxed max-w-[240px] mx-auto"><i>Your on-chain agent is persistent and ready for deployment.</i></p>
                           </div>
                           <div className="flex flex-col gap-2.5 max-w-[240px] mx-auto pt-2">
                              <Button
                                 onClick={() => navigate('/playground')}
                                 size="lg"
                                 className="bg-blue-950 hover:bg-blue-900 h-11 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-950/10 flex items-center justify-center gap-2"
                              >
                                 <Terminal className="w-3.5 h-3.5" /> Launch Playground
                              </Button>
                              <Button
                                 onClick={() => navigate('/projects')}
                                 variant="outline"
                                 size="lg"
                                 className="h-11 rounded-xl text-[10px] font-bold uppercase tracking-widest border-[var(--th-border-strong)] flex items-center justify-center gap-2"
                              >
                                 <LayoutDashboard className="w-3.5 h-3.5" /> View Projects
                              </Button>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </section>

         {/* Recent Activity Table */}
         <section className="max-w-5xl mx-auto px-8 py-24">
            <div className="space-y-8">
               <div className="flex items-center justify-between">
                  <div className="space-y-1">
                     <h2 className="text-2xl font-black tracking-tight">Recent Activity</h2>
                     <p className="th-text-tertiary text-xs font-medium">Track your active on-chain automations and agents.</p>
                  </div>
                  <button 
                    onClick={() => navigate('/projects')}
                    className="text-xs font-bold th-text-tertiary hover:th-text transition-colors flex items-center gap-2"
                  >
                     View all <ArrowRight className="w-3.5 h-3.5" />
                  </button>
               </div>

               <div className="th-surface border border-[var(--th-border-strong)] rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="th-surface-elevated border-b border-[var(--th-border-strong)]">
                           <th className="px-6 py-4 text-[10px] font-bold th-text-tertiary uppercase tracking-wider">ID</th>
                           <th className="px-6 py-4 text-[10px] font-bold th-text-tertiary uppercase tracking-wider">Automation Task</th>
                           <th className="px-6 py-4 text-[10px] font-bold th-text-tertiary uppercase tracking-wider">Chain</th>
                           <th className="px-6 py-4 text-[10px] font-bold th-text-tertiary uppercase tracking-wider">Last Modified</th>
                           <th className="px-6 py-4 text-[10px] font-bold th-text-tertiary uppercase tracking-wider">Status</th>
                           <th className="px-6 py-4 text-[10px] font-bold th-text-tertiary uppercase tracking-wider text-right"></th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-[var(--th-border)]">
                         {recentProjects.length === 0 ? (
                            <tr>
                               <td colSpan={6} className="px-10 py-12 text-center th-text-tertiary font-medium th-surface-low">
                                   No projects or automations found
                               </td>
                            </tr>
                         ) : (
                            recentProjects.map((p) => (
                               <tr key={p.id} className="hover:th-surface-hover transition-colors group">
                                  <td className="px-6 py-3 text-xs font-bold th-text-tertiary font-mono">#{p.id.slice(0, 4).toUpperCase()}</td>
                                  <td className="px-6 py-3">
                                     <div className="flex flex-col">
                                        <span className="th-text-secondary text-[11px] font-bold uppercase tracking-tight">{p.name}</span>
                                        <span className="text-[10px] font-bold th-text-tertiary tracking-widest mt-0.5">{p.prompt?.slice(0, 30)+ '...' || 'Operational Project'}</span>
                                     </div>
                                  </td>
                                  <td className="px-6 py-3">
                                     <span className="px-2 py-1 rounded th-surface-elevated th-text-secondary text-[10px] font-bold border border-[var(--th-border-strong)] uppercase tracking-tight">
                                        {p.chain || BRANDING.currencySymbol}
                                     </span>
                                  </td>
                                  <td className="px-6 py-3 text-xs font-medium th-text-tertiary flex items-center gap-2">
                                     <Clock className="w-3.5 h-3.5" /> {new Date(p.lastUpdated).toLocaleDateString()}
                                  </td>
                                  <td className="px-6 py-3">
                                     {(() => {
                                        const s = getStatusDisplay(p);
                                        return (
                                           <div className={cn(
                                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all",
                                              s === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" :
                                              s === 'paused' ? "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20" :
                                              (s === 'error' || s === 'failed') ? "bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20" :
                                              "th-surface-elevated th-text-secondary border-[var(--th-border-strong)]"
                                           )}>
                                              <div className={cn(
                                                 "w-1.5 h-1.5 rounded-full",
                                                 s === 'active' ? "bg-emerald-500 animate-pulse" :
                                                 s === 'paused' ? "bg-amber-500" :
                                                 (s === 'error' || s === 'failed') ? "bg-red-500" :
                                                 "bg-zinc-300 dark:bg-zinc-600"
                                              )} />
                                              {s.toUpperCase()}
                                           </div>
                                        );
                                     })()}
                                  </td>
                                  <td className="px-6 py-5">
                                     <button
                                        onClick={() => navigate(`/playground/${p.id}`)}
                                        className="p-2 th-text-tertiary hover:th-text"
                                        title="Open in Playground"
                                     >
                                        <ArrowRight className="w-5 h-5" />
                                     </button>
                                  </td>
                               </tr>
                            ))
                         )}
                      </tbody>
                  </table>
               </div>
            </div>
         </section>

         {/* Minimal Footer */}
         <footer className="border-t border-[var(--th-border-strong)] py-12 px-8">
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 th-text-tertiary text-xs font-medium">
               <div className="flex items-center gap-6">
                  <span className="th-text font-bold">© 2026 AEGIS</span>
                  <a href="/docs" className="hover:th-text transition-colors">Documentation</a>
                  <a href="/api-docs" className="hover:th-text transition-colors">API Reference</a>
                  <a href="https://github.com/aegis-avm" className="hover:th-text transition-colors">GitHub</a>
               </div>
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                     System Operational
                  </div>
                  <div className="w-px h-3 bg-[var(--th-border-strong)] hidden md:block" />
                  <span>Latency: 12ms</span>
               </div>
            </div>
         </footer>
      </div>
   );
}
