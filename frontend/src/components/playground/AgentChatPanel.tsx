
import { useLayoutStore } from '../../store/layoutStore';
import { usePlaygroundStore, type ChatMessage } from '../../store/playgroundStore';
import type { StructuredQuestion } from '../../services/agentService';
import { 
  Bot, Activity, ChevronDown, 
  ArrowRight, ChevronRight, PanelRightClose, Settings,
  Brain, BarChart3, HelpCircle, Clock, Cog,
  FileText, Wrench, FolderOpen, Search, CheckCircle2,
  AlertTriangle, ShieldCheck, RefreshCw
} from 'lucide-react';
import { useAgentWallet } from '../../hooks/useAgentWallet';
import { cn } from '../../lib/utils/cn';
import { useState, useRef, useEffect } from 'react';
import { BRANDING } from '../../lib/config/branding';


export function AgentChatPanel() {
  const { toggleChat } = useLayoutStore();
  const { 
    messages, status, 
    planningModel, codegenModel, setModels,
    availableModels, fetchModels,
    submitPrompt,
    structuredQuestions, submitFields,
    approvePlan,
  } = usePlaygroundStore();
  const { 
    agentWalletAddress, authorizePlatformExecutor, getExecutor 
  } = useAgentWallet();
  
  const [input, setInput] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [changeRequest, setChangeRequest] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSettingsCollapsed, setIsSettingsCollapsed] = useState(true);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, status]);

  useEffect(() => {
    fetchModels();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isBusy) return;
    const currentInput = input;
    setInput('');
    await submitPrompt(currentInput);
  };

  const handleFieldSubmit = async () => {
    if (isBusy) return;
    await submitFields(fieldValues);
    setFieldValues({});
  };

  const handleApprove = async () => {
    if (isBusy) return;
    await approvePlan(true);
  };

  const handleReject = async () => {
    if (isBusy) return;
    await approvePlan(false, changeRequest);
    setChangeRequest('');
  };

  const isBusy = [
    'understanding', 'analyzing', 'validating', 'planning', 
    'generating_code', 'creating_files'
  ].includes(status);

  const showQuestions = (status === 'asking_questions' || status === 'waiting_for_input') && structuredQuestions.length > 0;
  const showApproval = status === 'awaiting_approval';

  // Get status icon
  const getStatusIcon = (agentStatus: string) => {
    switch(agentStatus) {
      case 'understanding': return <Brain className="w-3.5 h-3.5" />;
      case 'analyzing': return <BarChart3 className="w-3.5 h-3.5" />;
      case 'asking': return <HelpCircle className="w-3.5 h-3.5" />;
      case 'waiting': return <Clock className="w-3.5 h-3.5" />;
      case 'validating': return <Cog className="w-3.5 h-3.5 animate-spin" />;
      case 'planning': return <FileText className="w-3.5 h-3.5" />;
      case 'generating': return <Wrench className="w-3.5 h-3.5" />;
      case 'creating_files': return <FolderOpen className="w-3.5 h-3.5" />;
      case 'gathering': return <Search className="w-3.5 h-3.5" />;
      case 'complete': return <CheckCircle2 className="w-3.5 h-3.5" />;
      default: return <Activity className="w-3.5 h-3.5" />;
    }
  };

  const getStatusColor = (agentStatus: string) => {
    switch(agentStatus) {
      case 'complete': return 'text-emerald-500 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20';
      case 'error': return 'text-rose-500 bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20';
      case 'waiting': return 'text-amber-500 bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20';
      default: return 'text-blue-500 bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20';
    }
  };

  const getInputType = (q: StructuredQuestion) => {
    switch(q.input_type) {
      case 'number': return 'number';
      case 'url': return 'url';
      case 'email': return 'email';
      default: return 'text';
    }
  };

  const getInputPlaceholder = (q: StructuredQuestion) => {
    switch(q.input_type) {
      case 'address': return '0x...';
      case 'url': return 'https://...';
      case 'email': return 'user@example.com';
      case 'number': return '0.0';
      case 'interval': return 'e.g. 5m, 1h, 24h';
      default: return `Enter ${q.field}...`;
    }
  };

  return (
    <div className="w-[420px] flex flex-col th-surface border-l border-[var(--th-border-strong)] h-full shadow-[-20px_0_40px_-20px_rgba(0,0,0,0.02)] dark:shadow-none transition-all animate-in slide-in-from-right-4 duration-500 relative z-20">
      
      {/* Header */}
      <div className="px-5 h-10 border-b border-[var(--th-border)] flex items-center justify-between th-surface shrink-0">
         <h3 className="text-[10px] font-black uppercase tracking-[0.2em] th-text font-inter flex items-center gap-2 opacity-80">
            Agent Chat
         </h3>
         <button 
           onClick={toggleChat}
           className="p-2 -mr-2 rounded-lg hover:th-surface-hover th-text-tertiary hover:th-text transition-all"
           title="Collapse Panel"
         >
            <PanelRightClose className="w-4 h-4" />
         </button>
      </div>


      {/* Conversation Thread */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5 custom-scrollbar" style={{ backgroundImage: 'radial-gradient(var(--th-border-strong) 1px, transparent 1px)', backgroundSize: '18px 18px' }}>
         {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40">
               <div className="w-16 h-16 rounded-3xl bg-blue-950 flex items-center justify-center text-white shadow-2xl rotate-3">
                  <Bot className="w-8 h-8" />
               </div>
               <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">{BRANDING.networkName.toUpperCase()}!</p>
                  <p className="text-[11px] font-medium italic max-w-[200px]">Tell me what you want to automate — I'll handle the rest.</p>
               </div>
            </div>
         ) : (
            messages.map((msg: ChatMessage, idx: number) => {
              // Agent status messages
              if (msg.role === 'agent_status') {
                return (
                  <div key={idx} className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold tracking-wider uppercase",
                      getStatusColor(msg.agentStatus || '')
                    )}>
                      {getStatusIcon(msg.agentStatus || '')}
                      <span>{msg.content}</span>
                    </div>
                  </div>
                );
              }

              // System messages
              if (msg.role === 'system') {
                return (
                  <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg th-surface-elevated border border-[var(--th-border-strong)] animate-in fade-in duration-300">
                    <AlertTriangle className="w-3 h-3 th-text-tertiary" />
                    <span className="text-[10px] font-bold th-text-secondary">{msg.content}</span>
                  </div>
                );
              }

              // User / Assistant messages
              return (
                <div key={idx} className={cn(
                  "flex flex-col gap-1.5 animate-in slide-in-from-bottom-2 duration-300",
                  msg.role === 'user' ? "items-end" : "items-start"
                )}>
                   <div className={cn(
                      "max-w-[90%] p-4 rounded-2xl text-[12px] leading-relaxed font-medium shadow-sm border",
                      msg.role === 'user' 
                         ? "bg-blue-950 text-white border-blue-950 rounded-tr-none" 
                         : "th-surface th-text border-[var(--th-border-strong)] rounded-tl-none"
                   )}>
                      {msg.content}
                   </div>
                   <span className="text-[9px] font-black uppercase tracking-widest th-text-tertiary px-1">
                      {msg.role === 'user' ? 'You' : 'Aegis Agent'}
                   </span>
                </div>
              );
            })
         )}
         
         {/* Live status indicator */}
         {isBusy && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl th-surface border border-[var(--th-border-strong)] w-fit shadow-sm">
               <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
               </div>
               <span className="text-[9px] font-black th-text uppercase tracking-[0.2em]">
                  {status === 'understanding' && 'Understanding...'}
                  {status === 'analyzing' && 'Analyzing...'}
                  {status === 'validating' && 'Validating...'}
                  {status === 'planning' && 'Planning...'}
                  {status === 'generating_code' && 'Generating code...'}
                  {status === 'creating_files' && 'Creating files...'}
               </span>
            </div>
         )}

         <div ref={messagesEndRef} />
      </div>

      {/* Dynamic Content Area */}
      <div className="border-t border-[var(--th-border)] th-surface shadow-[0_-10px_20px_rgba(0,0,0,0.01)] dark:shadow-none">

         {/* Follow-up Questions (Typed Inputs) */}
         {showQuestions && (
            <div className="p-4 border-b border-[var(--th-border)] animate-in slide-in-from-bottom-2 duration-300">
               <div className="bg-amber-50/50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                     <HelpCircle className="w-3.5 h-3.5" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Required Inputs</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                     {structuredQuestions.map((q: StructuredQuestion) => (
                        <div key={q.field} className="space-y-1.5">
                           <label className="text-[9px] font-black text-amber-600/80 dark:text-amber-400/80 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                              {q.input_type === 'address' && <span className="text-[8px] bg-amber-200/50 dark:bg-amber-500/20 px-1.5 py-0.5 rounded">EVM</span>}
                              {q.input_type === 'url' && <span className="text-[8px] bg-amber-200/50 dark:bg-amber-500/20 px-1.5 py-0.5 rounded">URL</span>}
                              {q.input_type === 'number' && <span className="text-[8px] bg-amber-200/50 dark:bg-amber-500/20 px-1.5 py-0.5 rounded">NUM</span>}
                              {q.input_type === 'email' && <span className="text-[8px] bg-amber-200/50 dark:bg-amber-500/20 px-1.5 py-0.5 rounded">EMAIL</span>}
                              {q.input_type === 'interval' && <span className="text-[8px] bg-amber-200/50 dark:bg-amber-500/20 px-1.5 py-0.5 rounded">INTERVAL</span>}
                              {q.question}
                           </label>
                           {q.input_type === 'select' && q.options ? (
                              <select
                                className="w-full th-surface border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-2 text-[11px] font-bold outline-none focus:border-amber-500 transition-all th-text"
                                value={fieldValues[q.field] || ''}
                                onChange={(e) => setFieldValues(prev => ({ ...prev, [q.field]: e.target.value }))}
                              >
                                <option value="">Select...</option>
                                {q.options.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                           ) : (
                              <input
                                type={getInputType(q)}
                                placeholder={getInputPlaceholder(q)}
                                className={cn(
                                  "w-full th-surface border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-2 text-[11px] font-bold outline-none focus:border-amber-500 transition-all placeholder:text-amber-200 dark:placeholder:text-amber-500/30 th-text",
                                  q.input_type === 'address' && "font-mono text-[10px]"
                                )}
                                value={fieldValues[q.field] || ''}
                                onChange={(e) => setFieldValues(prev => ({ ...prev, [q.field]: e.target.value }))}
                              />
                           )}
                        </div>
                     ))}
                  </div>
                  <button 
                     onClick={handleFieldSubmit}
                     disabled={isBusy}
                     className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl h-10 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all"
                  >
                     Submit & Continue
                  </button>
               </div>
            </div>
         )}

         {/* Approval UI */}
         {showApproval && (
            <div className="p-4 border-b border-[var(--th-border)] animate-in slide-in-from-bottom-2 duration-300">
               <div className="bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                     <FileText className="w-3.5 h-3.5" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Plan Review</span>
                  </div>
                  <p className="text-[11px] text-blue-700/70 dark:text-blue-400/70 font-medium">
                     Review the automation plan in the editor. When ready, approve to generate code.
                  </p>
                  <div className="flex gap-2">
                     <button 
                        onClick={handleApprove}
                        disabled={isBusy}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl h-10 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                     >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve Plan
                     </button>
                     <button 
                        onClick={() => {
                          const change = prompt('What changes would you like?');
                          if (change) {
                            setChangeRequest(change);
                            handleReject();
                          }
                        }}
                        disabled={isBusy}
                        className="flex-1 th-surface hover:th-surface-hover disabled:opacity-50 th-text border border-[var(--th-border-strong)] rounded-xl h-10 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                     >
                        ✏️ Request Changes
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* Standard Input */}
         <div className="p-3">
            <div className="relative group">
               <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder={
                    status === 'idle' ? "Describe your automation..." :
                    status === 'waiting_for_input' ? "Or type a response..." :
                    status === 'awaiting_approval' ? "Type feedback about the plan..." :
                    "Specify on-chain operation..."
                  }
                  className="w-full th-surface-input border border-[var(--th-border-strong)] rounded-xl p-3.5 pr-12 text-[11px] font-medium outline-none focus:border-blue-500 focus:th-surface transition-all resize-none min-h-[70px] shadow-sm group-hover:th-surface th-text placeholder:th-text-tertiary"
               />
               <button 
                  onClick={handleSend}
                  disabled={isBusy || !input.trim()}
                  className={cn(
                     "absolute right-3 bottom-3 w-8 h-8 rounded-xl flex items-center justify-center transition-all shadow-xl",
                     input.trim() && !isBusy 
                        ? "bg-blue-950 text-white hover:scale-110 active:scale-95 shadow-blue-950/20" 
                        : "th-surface-elevated th-text-tertiary"
                  )}
               >
                  <ArrowRight className="w-4 h-4" />
               </button>
            </div>
         </div>
      </div>

      {/* Model Selector (Collapsed by default) */}
      <div className="p-4 border-t border-[var(--th-border)] th-surface">
         <button 
           onClick={() => setIsSettingsCollapsed(!isSettingsCollapsed)}
           className="w-full flex items-center justify-between px-2 mb-2 group"
         >
            <div className="flex items-center gap-2">
               <Settings className="w-3.5 h-3.5 th-text-tertiary group-hover:th-text transition-colors" />
               <span className="text-[10px] font-black th-text-tertiary group-hover:th-text uppercase tracking-widest transition-colors">Model Settings</span>
            </div>
            {isSettingsCollapsed ? <ChevronRight className="w-3.5 h-3.5 th-text-tertiary" /> : <ChevronDown className="w-3.5 h-3.5 th-text-tertiary" />}
         </button>

         {!isSettingsCollapsed && (
            <div className="space-y-4 px-2 py-2 animate-in slide-in-from-top-2 duration-300">
               <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-1">
                     <label className="text-[8px] font-black th-text-tertiary uppercase tracking-widest opacity-60">Plan Model</label>
                     <select 
                       value={planningModel}
                       onChange={(e) => setModels(e.target.value, codegenModel)}
                       className="w-full th-surface-input border border-[var(--th-border-strong)] rounded-lg px-2.5 py-1.5 text-[10px] font-bold outline-none focus:border-blue-500 transition-all th-text"
                     >
                        {availableModels.map((m: any) => (
                           <option key={typeof m === 'string' ? m : m.id} value={typeof m === 'string' ? m : m.id}>
                              {typeof m === 'string' ? m : m.label}
                           </option>
                        ))}
                     </select>
                  </div>
                  <div className="flex-1 space-y-1">
                     <label className="text-[8px] font-black th-text-tertiary uppercase tracking-widest opacity-60">Code Model</label>
                     <select 
                       value={codegenModel}
                       onChange={(e) => setModels(planningModel, e.target.value)}
                       className="w-full th-surface-input border border-[var(--th-border-strong)] rounded-lg px-2.5 py-1.5 text-[10px] font-bold outline-none focus:border-blue-500 transition-all th-text"
                     >
                        {availableModels.map((m: any) => (
                           <option key={typeof m === 'string' ? m : m.id} value={typeof m === 'string' ? m : m.id}>
                              {typeof m === 'string' ? m : m.label}
                           </option>
                        ))}
                     </select>
                  </div>
               </div>
            </div>
         )}
      </div>
    </div>
  );
}
