import React from 'react';
import { cn } from '../../lib/utils/cn';

/* Terminal-style code block with window chrome */
export function TerminalBlock({ title, children, className }: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-[var(--th-border-strong)] overflow-hidden flex flex-col h-full", className)}>
      {/* Window Chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1c24] dark:bg-[#0c0d12] border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        {title && (
          <span className="text-[10px] font-mono font-semibold text-[#6b7280] ml-2">{title}</span>
        )}
      </div>
      {/* Content */}
      <div className="bg-[#12131a] dark:bg-[#0a0b10] p-4 font-mono text-[11px] leading-[1.7] overflow-x-auto text-[#e8eaed] flex-1">
        {children}
      </div>
    </div>
  );
}

/* Styled code snippet with language badge */
export function CodeSnippet({ language, title, children, className }: {
  language: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-[var(--th-border-strong)] overflow-hidden flex flex-col h-full", className)}>
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1c24] dark:bg-[#0c0d12] border-b border-[rgba(255,255,255,0.06)]">
        <span className="text-[10px] font-mono text-[#6b7280]">{title || 'snippet'}</span>
        <span className="text-[9px] font-black tracking-wider text-[#4b5563] bg-[#1f2937] px-2 py-0.5 rounded-md">{language}</span>
      </div>
      <div className="bg-[#12131a] dark:bg-[#0a0b10] p-4 font-mono text-[11px] leading-[1.7] overflow-x-auto flex-1">
        {children}
      </div>
    </div>
  );
}

/* Terminal line helpers */
export function Line({ prompt, children, dim }: { prompt?: string; children: React.ReactNode; dim?: boolean }) {
  return (
    <div className={cn("flex gap-2", dim && "opacity-50")}>
      {prompt && <span className="text-emerald-400 shrink-0 select-none">{prompt}</span>}
      <span className="text-[#e8eaed]">{children}</span>
    </div>
  );
}

export function Comment({ children }: { children: React.ReactNode }) {
  return <div className="text-[#6b7280] italic">{children}</div>;
}

export function Keyword({ children }: { children: React.ReactNode }) {
  return <span className="text-[#c084fc]">{children}</span>;
}

export function Str({ children }: { children: React.ReactNode }) {
  return <span className="text-[#86efac]">{children}</span>;
}

export function Fn({ children }: { children: React.ReactNode }) {
  return <span className="text-[#93c5fd]">{children}</span>;
}

export function Num({ children }: { children: React.ReactNode }) {
  return <span className="text-[#fbbf24]">{children}</span>;
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-[#6b7280]">{children}</span>;
}

export function Success({ children }: { children: React.ReactNode }) {
  return <span className="text-emerald-400">{children}</span>;
}

export function Warn({ children }: { children: React.ReactNode }) {
  return <span className="text-amber-400">{children}</span>;
}

export function Err({ children }: { children: React.ReactNode }) {
  return <span className="text-rose-400">{children}</span>;
}
