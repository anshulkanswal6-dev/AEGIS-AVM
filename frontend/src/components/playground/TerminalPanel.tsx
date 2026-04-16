import React, { useEffect, useRef } from 'react';
import { Trash2, ChevronDown, ChevronUp, Activity, Info } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import { usePlaygroundStore } from '../../store/playgroundStore';

interface TerminalPanelProps {
  onClose?: () => void;
  isCollapsed?: boolean;
}

export function TerminalPanel({ onClose, isCollapsed }: TerminalPanelProps) {
  const { 
    terminalLogs,
    automationLogs,
    clearLogs,
    activeBottomTab: currentTab,
    setActiveBottomTab: setTab,
    activeAutomationId
  } = usePlaygroundStore();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const logsToDisplay = currentTab === 'automation' ? (automationLogs || []) : (terminalLogs || []);

  useEffect(() => {
    if (scrollRef.current && !isCollapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logsToDisplay, isCollapsed]);

  return (
    <div 
      className={cn(
        "flex flex-col th-surface scroll-smooth border-t border-[var(--th-border-strong)] relative z-40 transition-all duration-300 shrink-0",
        isCollapsed ? "h-9" : "h-[240px]"
      )}
    >
      <div className="flex flex-col h-full overflow-hidden">

      {/* Terminal Header */}
      <div 
         className={cn(
           "h-9 px-5 flex items-center justify-between th-surface shrink-0 relative z-10 cursor-pointer transition-colors",
           !isCollapsed ? "border-b border-[var(--th-border)]" : "hover:th-surface-hover"
         )}
         onClick={isCollapsed ? onClose : undefined}
      >
          <div className="flex items-center gap-1.5 p-1 scale-90 -ml-1">
             <button 
                onClick={(e) => { e.stopPropagation(); setTab('compile'); }}
                className={cn(
                  "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
                  currentTab === 'compile' ? "th-surface th-text shadow-sm" : "th-text-tertiary hover:th-text"
                )}
             >
                System Logs
             </button>
             <button 
                onClick={(e) => { e.stopPropagation(); setTab('automation'); }}
                className={cn(
                  "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all flex items-center gap-1.5",
                  currentTab === 'automation' ? "th-surface text-emerald-500 shadow-sm" : "th-text-tertiary hover:th-text"
                )}
             >
                <div className={cn("w-1 h-1 rounded-full", currentTab === 'automation' ? "bg-emerald-500" : "bg-zinc-600")} />
                Automation Logs
             </button>
          </div>
         <div className="flex items-center gap-4">
            {!isCollapsed && (
              <button 
                 onClick={(e) => { e.stopPropagation(); clearLogs(); }}
                 className="p-1 px-2 rounded hover:th-surface-hover flex items-center gap-1.5 transition-colors group"
              >
                 <Trash2 className="w-3 h-3 th-text-tertiary group-hover:text-rose-500 transition-colors" />
                 <span className="text-[9px] font-black uppercase tracking-widest th-text-tertiary group-hover:text-rose-600 transition-colors">Clear</span>
              </button>
            )}
            
            <div className="w-px h-4 bg-[var(--th-border-strong)]" />
            
            <button 
              onClick={(e) => { e.stopPropagation(); onClose?.(); }} 
              className="p-1 rounded hover:th-surface-hover transition-colors th-text-tertiary hover:th-text"
            >
               {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
         </div>
      </div>

      {/* Terminal Content */}
      <div 
        ref={scrollRef}
        id="main-terminal-container"
        className={cn(
          "flex-1 overflow-y-scroll p-4 pr-12 font-mono text-[11px] leading-relaxed custom-scrollbar th-surface-low min-h-0 relative",
          isCollapsed ? "hidden" : "block"
        )}
      >
         <div className="space-y-1 pb-10">
            {logsToDisplay.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full py-10 opacity-30 select-none">
                  <Activity className="w-6 h-6 mb-3 animate-pulse" />
                  <p className="text-[10px] uppercase font-bold tracking-[0.2em] th-text-tertiary">
                     {currentTab === 'automation' ? (activeAutomationId ? 'Awaiting instance feedback...' : 'Deploy to view execution logs') : 'System terminal idle'}
                  </p>
               </div>
            ) : (
               logsToDisplay.map((log: string, idx: number) => {
                  if (!log) return null;
                  // Filter poll noise
                  if (log.includes('checked condition') || log.includes('Checking condition')) return null;
                  
                  return (
                    <div key={`${idx}-${log.substring(0, 10)}`} className="flex gap-3 group animate-in slide-in-from-left-1 duration-200">
                       <span className="th-text-tertiary w-10 shrink-0 text-right selection:hidden tabular-nums font-bold opacity-40 text-[10px]">
                          {idx + 1}
                       </span>
                       <p className={cn(
                         "font-semibold break-words flex-1",
                         log.includes('[Internal]') || log.includes('[System]') ? "text-blue-500" :
                         log.includes('Success') || log.includes('OK') || log.includes('Triggered') || log.includes('live') || log.includes('delivered') ? "text-emerald-500" :
                         log.includes('CRITICAL') || log.includes('ERROR') || log.includes('failed') ? "text-rose-500" :
                         "th-text opacity-90"
                       )}>{log}</p>
                    </div>
                  );
               })
            )}
            {/* Terminal Cursor fallback */}
            {currentTab !== 'automation' && logsToDisplay.length > 0 && (
              <div className="flex gap-4 pt-1">
                 <span className="text-[#FF4D4D] w-10 shrink-0 text-right font-black selection:hidden">$</span>
                 <div className="w-1.5 h-4 bg-emerald-500/30 rounded-full animate-pulse" />
              </div>
            )}
         </div>

         {/* Snap to Bottom Button */}
         {logsToDisplay.length > 5 && (
            <div className="absolute bottom-6 right-10 z-[60]">
               
            </div>
         )}
        </div>
      </div>
    </div>
  );
}

