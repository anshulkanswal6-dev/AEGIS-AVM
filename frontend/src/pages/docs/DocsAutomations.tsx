import { ChevronRight, ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DocsAutomations() {
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
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize">Automation Lifecycle</span>
        </div>
        <h1 className="text-3xl font-black th-text tracking-tight leading-[1.15] mb-4">
          Automation Lifecycle
        </h1>
        <p className="text-sm th-text-secondary leading-relaxed max-w-2xl">
          Understanding the full lifecycle of an AEGIS automation — from conversational intent capture through versioned deployment to active runtime execution and beyond.
        </p>
      </div>

      {/* Lifecycle States */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">State Machine</h2>
        <p className="text-sm th-text-secondary leading-relaxed mb-6">
          Every automation in AEGIS follows a <strong className="th-text">deterministic state machine</strong> model. State transitions are driven by user actions, system events, and runtime conditions — each transition is logged and auditable.
        </p>
        <div className="th-surface rounded-xl border border-[var(--th-border-strong)] overflow-hidden">
          {[
            { state: 'DRAFT', color: 'th-text-tertiary', desc: 'Initial state. The automation specification is being authored through the agent-assisted workspace. No execution occurs. The user is iterating on trigger conditions, action sequences, and notification configuration through the conversational builder.' },
            { state: 'READY', color: 'text-amber-500', desc: 'The automation spec has been validated and approved for deployment. All required parameters are present, trigger types are recognized, and action sequences are well-formed. Awaiting user-initiated deployment.' },
            { state: 'DEPLOYING', color: 'text-blue-500', desc: 'Transient state during the deployment pipeline. The system is creating a version record, bundling code artifacts, uploading to storage, registering with the scheduler, and activating the runtime evaluation loop.' },
            { state: 'ACTIVE', color: 'text-emerald-500', desc: 'The automation is live and being evaluated on its configured interval. The scheduler fires evaluation cycles, the trigger engine checks conditions, and actions are dispatched on match. Full telemetry is active.' },
            { state: 'PAUSED', color: 'text-amber-500', desc: 'The automation is temporarily suspended. The scheduler job remains registered but evaluations are skipped via a status gate check. Can be resumed to ACTIVE without redeployment. All state and history is preserved.' },
            { state: 'FAILED', color: 'text-rose-500', desc: 'The automation has encountered repeated execution errors. Error count threshold has been reached or a critical failure has occurred. Requires investigation and manual intervention to resume.' },
            { state: 'COMPLETED', color: 'text-violet-500', desc: 'Terminal state for single-execution automations (run_once_at_datetime trigger type). The automation has successfully executed its intended operation and will not be re-evaluated.' },
          ].map(({ state, color, desc }, i) => (
            <div key={state} className={`px-6 py-4 ${i < 6 ? 'border-b border-[var(--th-border-strong)]' : ''}`}>
              <div className="flex items-center gap-3 mb-1.5">
                <span className={`text-xs font-black tracking-wider ${color}`}>{state}</span>
              </div>
              <p className="text-xs th-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Deployment Pipeline */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Deployment Pipeline</h2>
        <p className="text-sm th-text-secondary leading-relaxed mb-6">
          The deployment pipeline transforms an automation specification into a live, scheduled execution job. The pipeline is <strong className="th-text">atomic</strong> — either all stages complete successfully and the automation goes active, or the entire deployment is rolled back.
        </p>
        <div className="space-y-3">
          {[
            { phase: 'Spec Extraction', desc: 'The automation specification (trigger type, parameters, action sequence, notification config, runtime settings) is extracted from the agent session and validated against the trigger catalogue.' },
            { phase: 'Identity Resolution', desc: 'The deploying user\'s profile is resolved via wallet address. Project ownership is verified or a new project record is created. All downstream records inherit the resolved user_id and project_id.' },
            { phase: 'Record Reconciliation', desc: 'Existing automations for the same project are checked — if found, the deployment performs an upsert (update existing record) rather than creating a duplicate. This supports iterative redeployment without automation proliferation.' },
            { phase: 'Version Creation', desc: 'A new immutable version record is created. All generated code files are bundled into a ZIP archive and uploaded to object storage. The version record captures the storage path, version number, and entrypoint.' },
            { phase: 'Scheduler Registration', desc: 'The automation is registered with the APScheduler as a repeating interval job. The execution interval is extracted from the spec with fallback chain resolution (runtime.interval_seconds → trigger.params.interval → default).' },
            { phase: 'Activation & Logging', desc: 'The automation status is set to "active", is_enabled flag is set, next_run_at is calculated, and a deployment log entry is emitted to the terminal logs for real-time UI visibility.' },
          ].map(({ phase, desc }, i) => (
            <div key={phase} className="flex items-start gap-4 p-4 rounded-xl border border-[var(--th-border-strong)] th-surface">
              <span className="text-[10px] font-black th-text-tertiary w-6 shrink-0 pt-0.5">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h4 className="text-xs font-bold th-text mb-0.5">{phase}</h4>
                <p className="text-[11px] th-text-secondary leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Versioning */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Versioning Strategy</h2>
        <div className="th-surface rounded-xl border border-[var(--th-border-strong)] p-6 space-y-4">
          <p className="text-sm th-text-secondary leading-relaxed">
            AEGIS implements an <strong className="th-text">append-only versioning model</strong> for automation code. Each deployment creates a new, immutable version record — previous versions are never modified or deleted. This provides a complete audit trail and supports rollback scenarios.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: 'Storage', value: 'ZIP bundles in Object Storage' },
              { label: 'Numbering', value: 'Monotonically incrementing per automation' },
              { label: 'Reference', value: 'current_version_id on automation record' },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-lg th-surface-elevated border border-[var(--th-border-strong)]">
                <p className="text-[9px] font-black th-text-tertiary capitalize tracking-[0.2em] mb-1">{label}</p>
                <p className="text-[11px] font-semibold th-text">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent-Assisted Building */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Agent-Assisted Specification</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: 'Conversational Intent Capture', desc: 'Users describe automation behavior in natural language. The AEGIS agent parses intent, identifies trigger types from the catalogue, and maps user requirements to structured specification parameters.' },
            { title: 'Spec Generation Pipeline', desc: 'The agent generates a complete config.json specification including trigger configuration, action sequences, notification rules, wallet parameters, and runtime settings — all from the conversational context.' },
            { title: 'Iterative Refinement', desc: 'Specifications are refined through multi-turn conversation. The agent validates changes against the trigger catalogue, warns about missing parameters, and confirms changes before persisting to the workspace.' },
            { title: 'Code Artifact Generation', desc: 'Beyond configuration, the agent generates executable code files (main.py, helpers) that implement custom logic, data transformations, and integration glue that the execution service runs at evaluation time.' },
          ].map(({ title, desc }) => (
            <div key={title} className="p-5 rounded-xl border border-[var(--th-border-strong)] th-surface">
              <h3 className="text-sm font-bold th-text mb-1.5">{title}</h3>
              <p className="text-xs th-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={() => navigate('/documentation/runtime')} className="btn-secondary flex items-center gap-2 text-xs h-9 px-5 rounded-lg">
          <ArrowLeft className="w-3.5 h-3.5" /> Runtime Engine
        </button>
        <button onClick={() => navigate('/documentation/triggers')} className="btn-secondary flex items-center gap-2 text-xs h-9 px-5 rounded-lg">
          Next: Trigger Framework <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
