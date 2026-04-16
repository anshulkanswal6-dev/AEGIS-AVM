import { ChevronRight, ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TerminalBlock, Line, Str, Fn, Keyword, Muted, Success, Num } from './components';

export default function DocsRuntime() {
  const navigate = useNavigate();

  return (
    <div className="space-y-14">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1 mb-3">
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize cursor-pointer hover:th-text transition-colors" onClick={() => navigate('/documentation')}>Docs</span>
          <ChevronRight className="w-2 h-2 th-text-tertiary/50" />
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize">Core Systems</span>
          <ChevronRight className="w-2 h-2 th-text-tertiary/50" />
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize">Runtime Engine</span>
        </div>
        <h1 className="text-3xl font-black th-text tracking-tight leading-[1.15] mb-4">
          Runtime Engine
        </h1>
        <p className="text-sm th-text-secondary leading-relaxed max-w-2xl mb-8">
          The AEGIS Runtime Engine is the <strong className="th-text">persistent execution substrate</strong> that powers all automation evaluation and action dispatch. It implements deterministic scheduling, trigger condition evaluation against live blockchain state, and fault-tolerant action execution.
        </p>

        <TerminalBlock title="aegis-worker --pipeline-trace">
          <Line prompt="STEP 01"><Muted>Fetch automation record:</Muted> <Str>"price_watcher_01"</Str></Line>
          <Line prompt="STEP 02"><Muted>Status check:</Muted> <Success>ACTIVE</Success></Line>
          <Line prompt="STEP 04"><Muted>Query RPC:</Muted> <Fn>eth_getBalance</Fn>(<Str>"0x7...2f"</Str>)</Line>
          <Line prompt="STEP 05"><Muted>Condition:</Muted> <Num>1.5</Num> &lt; <Num>2.0</Num> → <Success>TRUE</Success></Line>
          <Line prompt="STEP 06"><Muted>Dispatch:</Muted> <Fn>send_notification</Fn>(target=<Str>"telegram"</Str>)</Line>
          <Line prompt="STEP 07"><Muted>Commit:</Muted> Updated <Keyword>last_run_at</Keyword> in relational store</Line>
        </TerminalBlock>
      </div>

      {/* Engine Overview */}
      <div className="th-surface rounded-xl border border-[var(--th-border-strong)] p-6 space-y-4">
        <h2 className="text-sm font-bold th-text capitalize tracking-wider">Engine Architecture</h2>
        <p className="text-sm th-text-secondary leading-relaxed">
          The runtime engine operates as a <strong className="th-text">dual-mode execution system</strong>: a primary <strong className="th-text">APScheduler-based deterministic scheduler</strong> handles time-driven automation jobs, while a secondary <strong className="th-text">background polling worker</strong> provides dynamic automation discovery and fallback execution for newly deployed automations.
        </p>
        <p className="text-sm th-text-secondary leading-relaxed">
          Both execution paths converge on the same evaluation pipeline — loading the automation specification, assembling a trigger context from live chain state, evaluating conditions through the trigger framework, and dispatching actions through the execution service upon match.
        </p>
      </div>

      {/* Worker Architecture */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Worker Architecture</h2>
        <div className="space-y-3">
          {[
            { title: 'Scheduler (Primary)', desc: 'APScheduler\'s BackgroundScheduler manages repeating IntervalTrigger jobs for each active automation. Jobs are registered at deployment time with configurable intervals (minimum 5s safety floor). Each job executes on its own thread with max_instances=1 to prevent overlapping evaluations of the same automation. Job lifecycle is managed through schedule/unschedule operations tied to automation state transitions.', tag: 'Deterministic' },
            { title: 'Polling Worker (Secondary)', desc: 'A daemon background thread that runs a discovery loop at configurable intervals. It queries the persistence layer for active automations not yet registered in the scheduler, and dynamically registers them. This handles edge cases like automations deployed while the scheduler was starting, or recovered from database state after a restart.', tag: 'Discovery' },
            { title: 'Startup Bootstrap', desc: 'On worker initialization, all active automations are loaded from the persistence layer and bulk-registered with the scheduler. This ensures that automation execution resumes automatically after any system restart without manual intervention. Interval extraction supports multiple specification formats for backward compatibility.', tag: 'Recovery' },
          ].map(({ title, desc, tag }) => (
            <div key={title} className="p-5 rounded-xl border border-[var(--th-border-strong)] th-surface">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold th-text">{title}</h3>
                <span className="text-[9px] font-black tracking-[0.15em] capitalize th-text-tertiary px-2 py-0.5 rounded-full border border-[var(--th-border-strong)] th-surface-elevated">{tag}</span>
              </div>
              <p className="text-xs th-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Evaluation Pipeline */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Evaluation Pipeline</h2>
        <p className="text-sm th-text-secondary leading-relaxed mb-6">
          Each automation evaluation follows a <strong className="th-text">strict sequential pipeline</strong> with well-defined stages. The pipeline is designed to be <strong className="th-text">idempotent</strong> — repeated evaluations against unchanged chain state produce identical results.
        </p>
        <div className="th-surface rounded-xl border border-[var(--th-border-strong)] overflow-hidden">
          {[
            { step: '01', label: 'Record Load', desc: 'Fetch the full automation record from the persistence layer, including specification, status, and execution metadata.' },
            { step: '02', label: 'Status Gate', desc: 'Verify the automation status is "active". Non-active automations (paused, completed, failed) are short-circuited immediately.' },
            { step: '03', label: 'Context Assembly', desc: 'Build a TriggerContext object with chain parameters, RPC endpoint, wallet address, current timestamp, and any automation-specific memory state.' },
            { step: '04', label: 'Chain State Query', desc: 'Query live blockchain state (balances, block numbers, contract reads) via Web3 RPC to populate condition evaluation inputs.' },
            { step: '05', label: 'Trigger Evaluation', desc: 'Pass the assembled context and trigger parameters to the TriggerEngine for condition evaluation. Returns a boolean match result.' },
            { step: '06', label: 'Action Dispatch', desc: 'On trigger match: create a run record, execute all action sequences through the execution service, capture results, and update run status.' },
            { step: '07', label: 'State Update', desc: 'Update automation metrics (run_count, last_run_at, next_run_at, error_count) and persist to the data layer. Update heartbeat timestamp for liveness monitoring.' },
            { step: '08', label: 'Log Emission', desc: 'Emit structured log entries for each pipeline stage — trigger checks, matches, action results, and errors — to the terminal_logs table for cross-surface observability.' },
          ].map(({ step, label, desc }, i) => (
            <div key={step} className={`flex items-start gap-4 px-6 py-4 ${i < 7 ? 'border-b border-[var(--th-border-strong)]' : ''}`}>
              <span className="text-[10px] font-black th-text-tertiary w-6 shrink-0 pt-0.5">{step}</span>
              <div>
                <h4 className="text-xs font-bold th-text mb-0.5">{label}</h4>
                <p className="text-[11px] th-text-secondary leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Execution Guarantees */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Execution Guarantees</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: 'Non-Overlapping Execution', desc: 'APScheduler\'s max_instances=1 constraint ensures that a single automation cannot have concurrent evaluation cycles, preventing duplicate trigger matches and double action execution.' },
            { title: 'Fault Isolation', desc: 'Each evaluation runs in an independent try/catch boundary. Trigger evaluation failures, action execution errors, and logging failures are isolated — one failing automation cannot affect others.' },
            { title: 'Automatic Recovery', desc: 'The worker bootstrap process reloads all active automations from persistent state on startup. Combined with the polling discovery loop, this ensures no automation is "forgotten" after a restart or crash.' },
            { title: 'Graceful Degradation', desc: 'Network failures (DNS resolution, SSL errors, RPC timeouts) trigger exponential backoff with structured retry logic. The system continues operating with degraded functionality rather than halting entirely.' },
          ].map(({ title, desc }) => (
            <div key={title} className="p-5 rounded-xl border border-[var(--th-border-strong)] th-surface">
              <h3 className="text-sm font-bold th-text mb-1.5">{title}</h3>
              <p className="text-xs th-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Interval Parsing */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Interval Specification</h2>
        <div className="th-surface rounded-xl border border-[var(--th-border-strong)] p-6">
          <p className="text-xs th-text-secondary leading-relaxed mb-4">
            The runtime engine supports flexible interval specification with automatic normalization. Intervals are extracted from the automation spec via a multi-fallback resolution chain and parsed using a human-friendly format.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { format: '30s', meaning: '30 seconds' },
              { format: '5m', meaning: '5 minutes' },
              { format: '1h', meaning: '1 hour' },
              { format: '24h', meaning: '24 hours' },
            ].map(({ format, meaning }) => (
              <div key={format} className="text-center p-3 rounded-lg th-surface-elevated border border-[var(--th-border-strong)]">
                <p className="text-sm font-mono font-bold th-text mb-0.5">{format}</p>
                <p className="text-[10px] th-text-tertiary">{meaning}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Thread Safety */}
      <div className="th-surface-elevated rounded-xl border border-[var(--th-border-strong)] p-6">
        <h2 className="text-sm font-bold th-text mb-3 capitalize tracking-wider">Thread Safety Model</h2>
        <p className="text-xs th-text-secondary leading-relaxed">
          The runtime engine operates across multiple concurrent threads — the main API thread, the scheduling worker thread, and individual APScheduler job threads. Database access is protected through <strong className="th-text">thread-local connection isolation</strong>, where each thread lazily initializes its own Supabase client instance. This eliminates SSL socket contention that would otherwise cause <code className="text-[11px] th-text px-1.5 py-0.5 rounded-md th-surface border border-[var(--th-border-strong)]">DECRYPTION_FAILED_OR_BAD_RECORD_MAC</code> errors under concurrent access.
        </p>
      </div>

      {/* Nav */}
      <div className="flex justify-between">
        <button onClick={() => navigate('/documentation/architecture')} className="btn-secondary flex items-center gap-2 text-xs h-9 px-5 rounded-lg">
          <ArrowLeft className="w-3.5 h-3.5" /> Architecture
        </button>
        <button onClick={() => navigate('/documentation/automations')} className="btn-secondary flex items-center gap-2 text-xs h-9 px-5 rounded-lg">
          Next: Automation Lifecycle <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
