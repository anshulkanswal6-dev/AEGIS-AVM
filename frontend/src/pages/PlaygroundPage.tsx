
import { 
  Code2, FileJson, 
  Layout,
  Terminal as TerminalIcon,
  X,
  FileCode,
  FileSearch,
  Globe,
  User,
  LogOut,
  PanelLeft,
  PanelRight,
  Monitor,
  Sparkles,
  Copy,
  Check,
  Network
} from 'lucide-react';
import { cn } from '../lib/utils/cn';
import { usePlaygroundStore } from '../store/playgroundStore';
import { WorkspaceSidebar } from '../components/playground/WorkspaceSidebar';
import { AgentChatPanel } from '../components/playground/AgentChatPanel';
import { TerminalPanel } from '../components/playground/TerminalPanel';
import { IDEEditor } from '../components/playground/IDEEditor';
import { WelcomeScreen } from '../components/playground/WelcomeScreen';
import { ThemeToggle } from '../components/ui/UIPack';
import { useState, useEffect } from 'react';
import { useAlgorand } from '../components/AlgorandProvider';
import { agentService } from '../services/agentService';
import { formatAlgo } from '../lib/utils/format';
import { useLayoutStore } from '../store/layoutStore';
import { useAgentWallet } from '../hooks/useAgentWallet';
import { useLocation, useNavigate } from 'react-router-dom';

export default function PlaygroundPage() {
  const { address } = useAlgorand();
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const { 
    algoBalance: agentBalance,
    chainSymbol 
  } = useAgentWallet();

  const { 
    isSidebarCollapsed, toggleSidebar,
    isChatCollapsed, toggleChat,
    isTerminalCollapsed, toggleTerminal
  } = useLayoutStore();

  const { 
    spec, planMd,
    activeTab, setActiveTab,
    openFiles, closeFile,
    updateContent,
    fileTree,
    customFiles,
    activeView, setActiveView,
    automationLogs,
    loadAutomation,
    setWalletAddress,
    activeProjectId,
    intentSummary,
    sessionId, pollTerminalLogs,
    activeAutomationId,
    deployAutomation
  } = usePlaygroundStore();

  // Sync wallet address with store
  useEffect(() => {
    if (address) {
      setWalletAddress(address);
    } else {
      setWalletAddress(null);
    }
  }, [address, setWalletAddress]);

  // Poll terminal logs
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(() => {
      pollTerminalLogs();
    }, 3000);
    return () => clearInterval(interval);
  }, [sessionId, pollTerminalLogs]);

  // Handle Redeploy State
  useEffect(() => {
    if (location.state?.automation) {
      loadAutomation(location.state.automation);
      // Clear state to prevent re-load on refresh
      window.history.replaceState({}, document.title);
      return;
    }
  }, [location.state, loadAutomation]);

  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });

  // Auto-scroll for Main Automation View
  useEffect(() => {
    if (!activeAutomationId) return;
    const logContainer = document.getElementById('automation-log-container');
    if (logContainer) {
       const isAtBottom = logContainer.scrollHeight - logContainer.scrollTop <= logContainer.clientHeight + 120;
       if (isAtBottom) {
          logContainer.scrollTop = logContainer.scrollHeight;
       }
    }
  }, [automationLogs, activeAutomationId]);


  const findNode = (id: string, nodes: any[]): any => {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.children) {
        const found = findNode(id, n.children);
        if (found) return found;
      }
    }
    return null;
  };

  const getTabIcon = (id: string) => {
    const node = findNode(id, fileTree);
    const name = node?.name || id;

    if (id === 'prompt' || name === 'Global Strategy') return <Globe className="w-3.5 h-3.5 text-[#FF4D4D]" />;
    if (name.endsWith('.py')) return <FileCode className="w-3.5 h-3.5 text-blue-500" />;
    if (name.endsWith('.json')) return <FileJson className="w-3.5 h-3.5 text-amber-500" />;
    if (name.endsWith('.md')) return <FileSearch className="w-3.5 h-3.5 text-rose-500" />;
    return <Code2 className="w-3.5 h-3.5 th-text-tertiary" />;
  };

  const getTabLabel = (id: string) => {
    if (id === 'plan_md') return 'PLAN.MD';
    const node = findNode(id, fileTree);
    return node?.name.toUpperCase() || id.toUpperCase();
  };

  const getActiveContent = () => {
    if (activeTab === 'plan_md') return planMd;
    if (activeTab && customFiles[activeTab]) return customFiles[activeTab];
    return '';
  };

  const getActiveLanguage = () => {
    if (activeTab === 'spec' || activeTab === 'meta') return 'json';
    if (activeTab === 'prompt' || activeTab === 'plan_md') return 'markdown';
    const node = activeTab ? findNode(activeTab, fileTree) : null;
    if (node?.name.endsWith('.py')) return 'python';
    if (node?.name.endsWith('.json')) return 'json';
    if (node?.name.endsWith('.md')) return 'markdown';
    if (node?.name.endsWith('.txt')) return 'plaintext';
    return 'python';
  };

  const handleDeploy = async () => {
    if (activeAutomationId) {
       try {
          await agentService.clearTerminalLogs(activeAutomationId);
       } catch (e) {
          console.warn("Could not clear logs on backend", e);
       }
       usePlaygroundStore.setState({ automationLogs: [] });
    }
    deployAutomation();
  };

  // Welcome Screen Logic: If no project is open, show the welcome portal
  if (!activeProjectId && !activeAutomationId) {
    return (
      <div className="flex flex-col h-screen th-bg">
         <WelcomeScreen />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen th-bg">
      <header className="h-13 border-b border-[var(--th-border-strong)] flex items-center justify-between px-5 shrink-0 th-surface relative z-50 shadow-sm">
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            
              <div className="flex flex-col gap-0.5">
                 <h1 className="text-[10px] font-black uppercase tracking-[0.2em] th-text opacity-90 leading-none group-hover:th-text transition-colors italic">Playground IDE</h1>
                 {intentSummary && (
                    <div className="flex items-center gap-1.5 opacity-60">
                       <div className="w-1 h-1 rounded-full bg-blue-500" />
                       <span className="text-[8px] font-bold th-text-tertiary uppercase tracking-widest truncate max-w-[180px]">{intentSummary}</span>
                    </div>
                 )}
              </div>
           </div>
           
           <div className="flex items-center gap-1 p-1 th-surface-elevated rounded-xl border border-[var(--th-border-strong)] shadow-inner">
               <button 
                onClick={() => setActiveView('compile')}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                  activeView === 'compile' ? "th-surface th-text shadow-sm border border-[var(--th-border-strong)]" : "th-text-tertiary hover:th-text"
                )}
              >
                 <Sparkles className={cn("w-3.5 h-3.5", activeView === 'compile' ? "text-[#FF4D4D]" : "th-text-tertiary")} /> Build
              </button>
              <button 
                onClick={() => setActiveView('simulation')}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                  activeView === 'simulation' ? "th-surface th-text shadow-sm border border-[var(--th-border-strong)]" : "th-text-tertiary hover:th-text"
                )}
              >
                 <Layout className={cn("w-3.5 h-3.5", activeView === 'simulation' ? "text-amber-500" : "th-text-tertiary")} /> Simulation
              </button>
           </div>
        </div>

        <div className="flex items-center gap-4">
           <ThemeToggle />
           <div className="flex items-center gap-1 px-1 py-1 th-surface-elevated rounded-xl border border-[var(--th-border-strong)] mr-2">
              <button 
                onClick={toggleSidebar}
                className={cn("p-2 rounded-lg transition-all", !isSidebarCollapsed ? "th-surface th-text shadow-sm" : "th-text-tertiary hover:th-text")}
                title="Toggle Sidebar"
              >
                 <PanelLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={toggleTerminal}
                className={cn("p-2 rounded-lg transition-all", !isTerminalCollapsed ? "th-surface th-text shadow-sm" : "th-text-tertiary hover:th-text")}
                title="Toggle Terminal"
              >
                 <Monitor className="w-4 h-4" />
              </button>
              <button 
                onClick={toggleChat}
                className={cn("p-2 rounded-lg transition-all", !isChatCollapsed ? "th-surface th-text shadow-sm" : "th-text-tertiary hover:th-text")}
                title="Toggle Chat"
              >
                 <PanelRight className="w-4 h-4" />
              </button>
           </div>

           <div className="h-9 px-4 flex items-center gap-2.5 th-surface-elevated rounded-xl border border-[var(--th-border-strong)] group hover:border-[var(--th-border-strong)] transition-all cursor-pointer">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
              <span className="text-[10px] font-bold th-text tracking-widest uppercase">
                 Algorand Testnet
              </span>
           </div>

           <div className="relative">
              <button 
                onClick={() => setShowProfile(!showProfile)}
                className="h-9 flex items-center gap-2.5 px-1.5 th-surface border border-[var(--th-border-strong)] rounded-xl hover:border-blue-500 transition-all group overflow-hidden shadow-sm"
              >
                 <div className="w-6.5 h-6.5 rounded-lg bg-gradient-to-br from-[#FF4D4D] to-rose-600 flex items-center justify-center text-white text-[9px] font-black shadow-md">
                    {address?.slice(0, 2).toUpperCase() || 'AE'}
                 </div>
                 <div className="flex flex-col items-start pr-2">
                    <span className="text-[8px] font-black th-text-tertiary uppercase tracking-widest leading-none mb-1">Balance</span>
                    <span className="text-[10px] font-bold th-text tracking-tight leading-none tabular-nums">
                       {formatAlgo(agentBalance).slice(0, 6)} {chainSymbol}
                    </span>
                 </div>
              </button>

              {showProfile && (
                <>
                  <div className="fixed inset-0 z-[-1]" onClick={() => setShowProfile(false)} />
                  <div className="absolute top-full right-0 mt-2 w-64 th-surface-elevated border border-[var(--th-border-strong)] rounded-2xl shadow-2xl p-2 z-[100] animate-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-[var(--th-border-strong)] mb-1">
                       <p className="text-[10px] font-black th-text-tertiary uppercase tracking-widest mb-1.5">Signed in as</p>
                       <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-bold th-text truncate font-mono">{address || 'Connecting...'}</p>
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
                       <button className="w-full px-4 py-2 flex items-center gap-3 hover:th-surface-hover transition-colors group rounded-xl">
                          <User className="w-3.5 h-3.5 th-text-tertiary group-hover:th-text" />
                          <span className="text-xs font-semibold th-text-secondary group-hover:th-text">Profile Settings</span>
                       </button>
                       <div className="px-4 py-2 flex items-center justify-between border-t border-[var(--th-border-strong)] mt-1 pt-3">
                          <span className="text-[10px] font-black th-text-tertiary uppercase tracking-widest">Theme</span>
                          <ThemeToggle />
                       </div>
                       <button className="w-full px-4 py-3 flex items-center gap-3 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors group mt-1 rounded-xl">
                          <LogOut className="w-3.5 h-3.5 text-rose-500" />
                          <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Logout</span>
                       </button>
                    </div>
                  </div>
                </>
              )}
           </div>
           <button 
             onClick={handleDeploy}
             className="h-9 px-4 flex items-center gap-2 bg-blue-950 text-white rounded-xl shadow-lg shadow-blue-950/10 hover:bg-blue-900 active:scale-95 transition-all group shrink-0 border border-blue-900/50"
           >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-[0.1em]">Deploy</span>
           </button>
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden">
        {!isSidebarCollapsed && <WorkspaceSidebar />}

        <div className="flex-1 flex overflow-hidden relative">
          <div className="flex-1 flex flex-col min-w-0 th-surface relative overflow-hidden">
            <main className="flex-1 flex flex-col relative min-h-0">
               {activeView === 'compile' && (
                  <div className="flex-1 flex flex-col h-full overflow-hidden" key="view-compile">
                    <div className="h-8 flex items-center th-surface-elevated border-b border-[var(--th-border-strong)] px-2 gap-0.5 overflow-x-auto custom-scrollbar-hide">
                        {openFiles.map(fileId => (
                          <div 
                            key={fileId}
                            onClick={() => setActiveTab(fileId)}
                            className={cn(
                              "px-3 h-full flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.1em] cursor-pointer border-r border-[var(--th-border-strong)] transition-all relative z-10 group",
                              activeTab === fileId ? "th-surface th-text" : "th-text-tertiary hover:th-text-secondary th-surface-elevated"
                            )}
                          >
                             {activeTab === fileId && <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-[#FF4D4D]" />}
                             {getTabIcon(fileId)} 
                             {getTabLabel(fileId)}
                             <X 
                              onClick={(e) => { e.stopPropagation(); closeFile(fileId); }}
                              className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-all" 
                             />
                          </div>
                        ))}
                    </div>

                    <div className="flex-1 flex flex-col relative overflow-hidden th-surface min-h-0">
                       {activeTab ? (
                          <IDEEditor 
                             id={findNode(activeTab, fileTree)?.name || activeTab}
                             value={getActiveContent()} 
                             language={getActiveLanguage()}
                             onChange={(val) => updateContent(activeTab, val)}
                             onCursorChange={setCursorPos}
                             className="animate-in fade-in duration-300"
                          />
                       ) : (
                            <div className="flex-1 flex items-center justify-center th-surface-elevated">
                               <div className="text-center space-y-4 opacity-20">
                                  <TerminalIcon className="w-12 h-12 mx-auto th-text" />
                                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">No File Opened Here</p>
                               </div>
                            </div>
                       )}
                    </div>
                 </div>
               )}

               {activeView === 'simulation' && (
                  <div className="flex-1 relative th-surface overflow-hidden flex items-center justify-center" key="view-simulation" style={{ backgroundImage: 'radial-gradient(circle, var(--th-border-strong) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
                     <div className="absolute top-8 left-8 flex flex-col gap-2 scale-in duration-500">
                        <h2 className="text-[12px] font-black uppercase tracking-widest th-text opacity-40">Neural Simulation Canvas</h2>
                        <p className="text-[9px] font-bold th-text-tertiary uppercase tracking-widest th-surface-elevated px-3 py-1 rounded-full border border-[var(--th-border-strong)] w-fit">Live Interaction Sandbox</p>
                     </div>
                     <div className="text-center space-y-6 max-w-md animate-in zoom-in duration-700">
                        <div className="w-20 h-20 mx-auto bg-blue-950 rounded-3xl flex items-center justify-center shadow-2xl rotate-[-6deg] group hover:rotate-0 transition-transform cursor-pointer">
                           <Layout className="w-10 h-10 text-white" />
                        </div>
                        <div className="space-y-2">
                           <h3 className="text-lg font-black tracking-tighter th-text uppercase">Simulation Mode Active</h3>
                           <p className="text-[11px] font-medium th-text-secondary leading-relaxed max-w-[280px] mx-auto italic">
                               Your agent's behavioral logic will manifest here as a functional preview.
                           </p>
                        </div>
                     </div>
                  </div>
               )}

            </main>

            <TerminalPanel onClose={toggleTerminal} isCollapsed={isTerminalCollapsed} />

            <footer className="h-7 th-surface-elevated border-t border-[var(--th-border-strong)] flex items-center justify-between px-6 shrink-0 z-30">
               <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-500">
                     <Network className="w-3.5 h-3.5" />
                     ALGORAND TESTNET
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest th-text-tertiary">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                     Active
                  </div>
               </div>
               <div className="flex items-center gap-6">
                  {cursorPos && (
                    <span className="text-[10px] font-bold th-text-tertiary uppercase tracking-widest">
                       Ln {cursorPos.line}, Col {cursorPos.column}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 text-[10px] font-black th-text tracking-widest uppercase italic">
                     Powered by Aegis
                  </div>
               </div>
            </footer>
          </div>

          {!isChatCollapsed && <AgentChatPanel />}
        </div>
      </div>
    </div>
  );
}
