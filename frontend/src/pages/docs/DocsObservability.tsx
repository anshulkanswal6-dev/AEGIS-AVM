import { ChevronRight, ArrowRight, ArrowLeft, Terminal, BarChart3, Sparkles, Activity, Radio, Gauge } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DocsObservability() {
  const navigate = useNavigate();

  return (
    <div className="space-y-14">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1 mb-3">
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize cursor-pointer hover:th-text transition-colors" onClick={() => navigate('/documentation')}>Docs</span>
          <ChevronRight className="w-2 h-2 th-text-tertiary/50" />
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize">Platform</span>
          <ChevronRight className="w-2 h-2 th-text-tertiary/50" />
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize">Observability</span>
        </div>
        <h1 className="text-3xl font-black th-text tracking-tight leading-[1.15] mb-4">
          Observability & Monitoring
        </h1>
        <p className="text-sm th-text-secondary leading-relaxed max-w-2xl">
          AEGIS provides <strong className="th-text">full-stack observability</strong> across the automation lifecycle — from real-time structured logging and execution telemetry to cross-surface status propagation and system health diagnostics.
        </p>
      </div>

      {/* Observability Pillars */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Observability Pillars</h2>
        <div className="th-surface rounded-xl border border-[var(--th-border-strong)] overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--th-border-strong)]">
            {[
              { icon: Terminal, title: 'Structured Logging', desc: 'Every automation event is captured as a structured log entry with timestamp, severity level, event type, message, and contextual metadata. Logs are stored in a centralized table with project-scoped filtering and tag-based retrieval for cross-panel visibility.' },
              { icon: BarChart3, title: 'Execution Telemetry', desc: 'Complete run lifecycle tracking — each execution cycle creates an immutable run record capturing start time, end time, trigger payload, execution result, status, and error details. Run history supports temporal analysis and failure pattern detection.' },
              { icon: Activity, title: 'System Health', desc: 'Multi-probe health diagnostics assessing worker process status, database connectivity, RPC endpoint availability, and Telegram bot responsiveness. Accessible from both the dashboard and remote Telegram /health command.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-6">
                <Icon className="w-5 h-5 th-text-secondary mb-3" />
                <h3 className="text-sm font-bold th-text mb-2">{title}</h3>
                <p className="text-xs th-text-secondary leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Log Architecture */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Log Architecture</h2>
        <div className="space-y-3">
          {[
            { label: 'Terminal Logs', desc: 'Primary log surface visible in the workspace terminal panel. Project-scoped entries with soft-delete (clear) support. Includes both agent conversation output and automation execution logs. Polled in real-time from the frontend for live streaming visibility.', tag: 'Real-Time' },
            { label: 'Automation Logs', desc: 'Tagged log entries prefixed with [AUTO:{automation_id}] for cross-filtering. Written to the same terminal_logs table but retrievable independently via tag-based queries. Supports event-type classification: trigger_check, trigger_matched, action_executed, error.', tag: 'Tagged' },
            { label: 'Run Records', desc: 'Immutable execution records in the automation_runs table. Each record captures the full lifecycle of a single evaluation cycle — from trigger payload to execution result. Status-tracked (running, success, failed) with timing metadata.', tag: 'Immutable' },
          ].map(({ label, desc, tag }) => (
            <div key={label} className="p-5 rounded-xl border border-[var(--th-border-strong)] th-surface">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold th-text">{label}</h3>
                <span className="text-[9px] font-black tracking-[0.15em] capitalize th-text-tertiary px-2 py-0.5 rounded-full border border-[var(--th-border-strong)] th-surface-elevated">{tag}</span>
              </div>
              <p className="text-xs th-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Log Entry Structure */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Log Entry Schema</h2>
        <div className="th-surface rounded-xl border border-[var(--th-border-strong)] divide-y divide-[var(--th-border-strong)]">
          {[
            { field: 'id', type: 'uuid', desc: 'Unique identifier for each log entry. Auto-generated at write time.' },
            { field: 'project_id', type: 'uuid', desc: 'Scoping key linking the log to its parent project for filtered retrieval.' },
            { field: 'timestamp', type: 'iso8601', desc: 'UTC timestamp of log emission. Used for chronological ordering and temporal filtering.' },
            { field: 'level', type: 'enum', desc: 'Severity classification: info, warn, error, debug. Drives visual treatment in the terminal UI.' },
            { field: 'message', type: 'string', desc: 'Structured log message with optional automation tag prefix and event classification.' },
            { field: 'cleared_at', type: 'iso8601?', desc: 'Soft-delete timestamp. When set, the entry is excluded from active terminal views but retained for audit.' },
          ].map(({ field, type, desc }) => (
            <div key={field} className="px-6 py-3 flex items-start gap-4">
              <div className="flex items-center gap-2 shrink-0 w-32">
                <code className="text-[11px] font-bold th-text">{field}</code>
                <span className="text-[9px] th-text-tertiary font-mono">{type}</span>
              </div>
              <p className="text-[11px] th-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cross-Surface Observability */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Cross-Surface Status Propagation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { icon: Radio, title: 'Dashboard → Telegram', desc: 'Automation status changes, execution results, and trigger matches are propagated as Telegram notifications to linked users. Real-time alerts bring operational awareness to mobile surfaces.' },
            { icon: Gauge, title: 'Telegram → Dashboard', desc: 'Remote control actions (/pause, /resume, /delete) modify automation state in the persistence layer, which is immediately reflected in the dashboard UI through polling-based synchronization.' },
            { icon: Terminal, title: 'Runtime → Terminal', desc: 'Execution logs emitted by the runtime engine are written to terminal_logs and surfaced in the workspace terminal panel with sub-second latency through frontend polling.' },
            { icon: Sparkles, title: 'Health → All Surfaces', desc: 'System health status (worker, database, RPC, bot) is queryable from both the dashboard and the Telegram /health command, providing consistent diagnostics regardless of access surface.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-5 rounded-xl border border-[var(--th-border-strong)] th-surface">
              <Icon className="w-4 h-4 th-text-secondary mb-3" />
              <h3 className="text-sm font-bold th-text mb-1.5">{title}</h3>
              <p className="text-xs th-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Deployment Heartbeat */}
      <div className="th-surface-elevated rounded-xl border border-[var(--th-border-strong)] p-6">
        <h2 className="text-sm font-bold th-text mb-3 capitalize tracking-wider">Deployment Heartbeat</h2>
        <p className="text-xs th-text-secondary leading-relaxed">
          Active automations emit a <strong className="th-text">heartbeat signal</strong> on each evaluation cycle, updating the <code className="text-[11px] th-text px-1.5 py-0.5 rounded-md th-surface border border-[var(--th-border-strong)]">last_heartbeat_at</code> timestamp in the deployments table. This enables liveness detection — stale heartbeats indicate that an automation's execution has stalled and may require intervention. Heartbeat data powers the real-time status indicators shown in the project dashboard and Telegram status responses.
        </p>
      </div>

      <div className="flex justify-between">
        <button onClick={() => navigate('/documentation/security')} className="btn-secondary flex items-center gap-2 text-xs h-9 px-5 rounded-lg">
          <ArrowLeft className="w-3.5 h-3.5" /> Security Model
        </button>
        <button onClick={() => navigate('/documentation/api')} className="btn-secondary flex items-center gap-2 text-xs h-9 px-5 rounded-lg">
          Next: API Surface <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
