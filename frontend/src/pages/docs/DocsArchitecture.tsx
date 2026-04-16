import { Layers, ArrowRight, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils/cn';
import { TerminalBlock, Line, Comment, Muted, Success, Keyword, Str, Fn } from './components';

export default function DocsArchitecture() {
  const navigate = useNavigate();

  return (
    <div className="space-y-14">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1 mb-3">
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize cursor-pointer hover:th-text transition-colors" onClick={() => navigate('/documentation')}>Docs</span>
          <ChevronRight className="w-2 h-2 th-text-tertiary/50" />
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize cursor-pointer hover:th-text transition-colors" onClick={() => navigate('/documentation')}>Getting Started</span>
          <ChevronRight className="w-2 h-2 th-text-tertiary/50" />
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize">Architecture</span>
        </div>
        <h1 className="text-3xl font-black th-text tracking-tight leading-[1.15] mb-4">
          Platform Architecture
        </h1>
        <p className="text-sm th-text-secondary leading-relaxed max-w-2xl mb-8">
          AEGIS implements a <strong className="th-text">layered, event-driven architecture</strong> with strict separation of concerns between the interactive workspace, backend orchestration, persistent state, runtime execution, and external integration surfaces.
        </p>

        <TerminalBlock title="aegis --trace-flow">
          <Line prompt="[L1]">Workspace: Capture Intent → Generate Automation Spec</Line>
          <Line prompt="[L2]">Orchestrator: Validate Spec → Register Job → Initialize Worker</Line>
          <Line prompt="[L3]" dim>Persistence: Commit <Str>"0x...81"</Str> deployment record to relational store</Line>
          <Line prompt="[L4]">Runtime: Tick <Muted>(30s)</Muted> → Evaluate On-Chain Context → Execute Hook</Line>
          <Line prompt="[L5]"><Success>INTEGRATION</Success>: Broadcast payload to <Fn>TelegramAdapter</Fn></Line>
          <Line prompt="[!]"><Muted>// Flow follows strict directional propagation across system boundaries</Muted></Line>
        </TerminalBlock>
      </div>

      {/* Architecture Philosophy */}
      <div className="th-surface rounded-xl border border-[var(--th-border-strong)] p-6 space-y-4">
        <h2 className="text-sm font-bold th-text capitalize tracking-wider">Architectural Philosophy</h2>
        <p className="text-sm th-text-secondary leading-relaxed">
          The system is designed around <strong className="th-text">modular composability</strong> — each layer operates as an independent subsystem with well-defined interfaces. This enables horizontal scaling of individual components, fault isolation between system boundaries, and the ability to swap implementations without cascading changes.
        </p>
        <p className="text-sm th-text-secondary leading-relaxed">
          Communication between layers follows a <strong className="th-text">request-response model</strong> for synchronous operations (deployment, queries) and an <strong className="th-text">event-driven model</strong> for asynchronous workflows (trigger evaluation, notification dispatch, remote command execution).
        </p>
      </div>

      {/* System Layers */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">System Layers</h2>
        <div className="space-y-4">
          {[
            {
              layer: 'L1',
              name: 'Presentation Layer',
              subtitle: 'Interactive Workspace & Dashboard',
              desc: 'React-based single-page application providing the project workspace, automation builder, IDE-grade code editor, real-time terminal output, and operational dashboard. Implements a reactive state management architecture with Zustand stores for cross-component synchronization. Communicates with the orchestration layer via RESTful API calls.',
              tech: ['React 18', 'TypeScript', 'Zustand', 'TailwindCSS', 'Vite', 'Defly Connect'],
              accent: 'border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400',
            },
            {
              layer: 'L2',
              name: 'Orchestration Layer',
              subtitle: 'API Gateway & Service Coordination',
              desc: 'FastAPI-based backend service that acts as the primary orchestration node. Handles API request routing, business logic execution, deployment coordination, and cross-service communication. Implements stateless request handling with dependency injection for store and service resolution. Manages the deployment pipeline from spec validation through version creation to runtime scheduling.',
              tech: ['FastAPI', 'Python 3.11+', 'Uvicorn', 'Pydantic'],
              accent: 'border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400',
            },
            {
              layer: 'L3',
              name: 'Persistence Layer',
              subtitle: 'Relational Data & Object Storage',
              desc: 'Relational storage for structured data (profiles, projects, automations, runs, logs) and object storage for versioned automation code bundles. Implements a store abstraction pattern with multiple backend support (InMemory, JSON File, Supabase) for development-to-production parity. Thread-safe connection management with per-thread client isolation for concurrent access patterns.',
              tech: ['PostgreSQL', 'Algorand Indexer', 'File Storage', 'Row-Level Security'],
              accent: 'border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400',
            },
            {
              layer: 'L4',
              name: 'Execution Runtime',
              subtitle: 'Background Worker & Scheduler',
              desc: 'Persistent background execution engine comprising a task scheduler for deterministic interval execution and a background polling worker for dynamic automation discovery. Evaluates trigger conditions against live Algorand state, dispatches action sequences through the execution service, and manages automation lifecycle transitions using native AVM logic.',
              tech: ['APScheduler', 'Threading', 'py-algorand-sdk', 'AVM Workers'],
              accent: 'border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400',
            },
            {
              layer: 'L5',
              name: 'Integration Surface',
              subtitle: 'External Channels & Notification Routing',
              desc: 'Multi-channel integration layer providing bidirectional communication with external platforms. Implements a long-polling Telegram bot with a full command router for remote platform control, a notification adapter with intelligent cooldown management for alert delivery, and a webhook ingestion pipeline for incoming events. Operates independently from the core execution runtime to prevent integration failures from affecting automation evaluation.',
              tech: ['Telegram Bot API', 'HTTP Polling', 'Notification Router', 'Webhook Handlers'],
              accent: 'border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400',
            },
          ].map(({ layer, name, subtitle, desc, tech, accent }) => (
            <div key={layer} className={cn("rounded-xl border p-6 th-surface", "border-[var(--th-border-strong)]")}>
              <div className="flex items-start gap-4">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border text-xs font-black", accent)}>
                  {layer}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold th-text">{name}</h3>
                  <p className="text-[11px] th-text-tertiary font-medium mb-2">{subtitle}</p>
                  <p className="text-xs th-text-secondary leading-relaxed mb-3">{desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tech.map((t) => (
                      <span key={t} className="text-[10px] font-semibold th-text-tertiary px-2 py-0.5 rounded-md border border-[var(--th-border-strong)] th-surface-elevated">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Flow */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Data Flow Patterns</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: 'Deployment Pipeline', desc: 'User intent → Agent conversation → Spec generation → Validation → Version creation → Code bundling → Storage upload → Scheduler registration → Runtime activation', flow: 'Synchronous' },
            { title: 'Execution Cycle', desc: 'Scheduler tick → Automation load → Trigger context assembly → Chain state query → Condition evaluation → Action dispatch → Result capture → Run logging → Next-run scheduling', flow: 'Background' },
            { title: 'Notification Pipeline', desc: 'Trigger match → Notification spec extraction → Cooldown check → Channel resolution → Template rendering → Delivery dispatch → Confirmation logging', flow: 'Async' },
            { title: 'Remote Control Flow', desc: 'Telegram message → Poller capture → Command parsing → User resolution → Authorization → Handler dispatch → Database query → Response rendering → Message delivery', flow: 'Event-Driven' },
          ].map(({ title, desc, flow }) => (
            <div key={title} className="p-5 rounded-xl border border-[var(--th-border-strong)] th-surface">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold th-text">{title}</h3>
                <span className="text-[9px] font-black tracking-[0.15em] capitalize th-text-tertiary px-2 py-0.5 rounded-full border border-[var(--th-border-strong)] th-surface-elevated">{flow}</span>
              </div>
              <p className="text-[11px] th-text-secondary leading-relaxed font-mono">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cross-Cutting Concerns */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Cross-Cutting Concerns</h2>
        <div className="th-surface rounded-xl border border-[var(--th-border-strong)] divide-y divide-[var(--th-border-strong)]">
          {[
            { label: 'Thread Safety', desc: 'Thread-local storage for database connections, mutex-protected shared state, daemon thread lifecycle management, and non-overlapping job execution guarantees.' },
            { label: 'Error Boundaries', desc: 'Per-layer exception handling with structured error propagation. Execution failures are isolated from scheduling, notification failures are isolated from execution, and integration failures are isolated from core operations.' },
            { label: 'Configuration Management', desc: 'Environment-variable-driven configuration with sensible defaults. Store backend selection, chain parameters, API keys, and feature flags are externalized from application code.' },
            { label: 'State Consistency', desc: 'Optimistic state updates on the frontend with server-side reconciliation. Backend operations are idempotent where possible, with upsert semantics for automation records and append-only patterns for logs and runs.' },
          ].map(({ label, desc }) => (
            <div key={label} className="px-6 py-4">
              <h3 className="text-xs font-bold th-text mb-1">{label}</h3>
              <p className="text-xs th-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Next */}
      <div className="flex justify-end">
        <button onClick={() => navigate('/documentation/runtime')} className="btn-secondary flex items-center gap-2 text-xs h-9 px-5 rounded-lg">
          Next: Runtime Engine <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
