import React, { useEffect, useRef, useState } from 'react';
import { useTerminalStore } from '../../store/terminalStore';
import { TerminalLogLine } from './TerminalLogLine';
import { Trash2, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

export function TerminalDrawer() {
  const { logs, clearLogs, isExpanded, toggleExpanded, height, setHeight } = useTerminalStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const [activeResizing, setActiveResizing] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isExpanded]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    setActiveResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const newHeight = window.innerHeight - e.clientY - 24; // 24 for the bottom margin
    if (newHeight >= 44 && newHeight <= window.innerHeight * 0.8) {
      setHeight(newHeight);
    }
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    setActiveResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
      className={cn(
        "fixed bottom-6 left-[25%] right-[25%] z-[60] border border-[var(--th-border-strong)] th-surface shadow-xl rounded-xl overflow-hidden flex flex-col",
        !activeResizing && "transition-all duration-300 ease-in-out",
        !isExpanded && "h-11 translate-y-0 hover:th-surface-hover"
      )}
      style={{ height: isExpanded ? `${height}px` : '44px' }}
    >
      {/* Visual Resize Handle (IDE Style) */}
      {isExpanded && (
        <div 
          className="absolute top-0 left-0 right-0 h-[3px] cursor-ns-resize z-[70] group/resizer"
          onMouseDown={handleMouseDown}
        >
          <div className="w-full h-full bg-[var(--th-border-strong)] group-hover/resizer:bg-blue-500/50 transition-colors" />
        </div>
      )}

      {/* Header Area */}
      <div 
        className="flex items-center justify-between px-5 h-11 min-h-[44px] cursor-pointer select-none border-b border-[var(--th-border)] group th-surface relative z-10"
        onClick={toggleExpanded}
      >
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold th-text-tertiary group-hover:th-text uppercase tracking-wider transition-colors">
            {'>_'} Activity Logs {logs.length > 0 && `(${logs.length})`}
          </span>
          {logs.some(l => l.type === 'pending') && (
            <div className="flex items-center gap-2 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
              <span className="text-[9px] font-bold th-text uppercase tracking-widest">Running</span>
            </div>
          )}
        </div>

        
        <div className="flex items-center gap-4">
          <button 
            onClick={(e) => { e.stopPropagation(); clearLogs(); }}
            className="p-1.5 th-text-tertiary hover:text-rose-500 transition-all hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded"
            title="Clear Console"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-[var(--th-border-strong)]" />
          <div className="p-1 rounded th-text-tertiary group-hover:th-text transition-all">
             {isExpanded ? (
               <ChevronDown className="w-4 h-4" />
             ) : (
               <ChevronUp className="w-4 h-4" />
             )}
          </div>
        </div>
      </div>

      {/* Narrative Region */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto custom-scrollbar th-surface-low">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full th-text-tertiary font-medium italic text-xs uppercase tracking-widest">
               No recent activity
            </div>
          ) : (
            <div className="p-4 space-y-1 font-mono">
              {logs.map((log) => (
                <TerminalLogLine key={log.id} log={log} />
              ))}
              <div ref={bottomRef} className="h-4" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

