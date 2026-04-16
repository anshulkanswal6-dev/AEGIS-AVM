import { ChevronRight, ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DocsDataModel() {
  const navigate = useNavigate();

  return (
    <div className="space-y-14">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1 mb-3">
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize cursor-pointer hover:th-text transition-colors" onClick={() => navigate('/documentation')}>Docs</span>
          <ChevronRight className="w-2 h-2 th-text-tertiary/50" />
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize">Reference</span>
          <ChevronRight className="w-2 h-2 th-text-tertiary/50" />
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize">Data Model</span>
        </div>
        <h1 className="text-3xl font-black th-text tracking-tight leading-[1.15] mb-4">
          Data Model
        </h1>
        <p className="text-sm th-text-secondary leading-relaxed max-w-2xl">
          The AEGIS data model implements a <strong className="th-text">relational hierarchy</strong> spanning user identity, project organization, automation specification, version management, execution tracking, and log aggregation.
        </p>
      </div>

      {/* Entity Relationships */}
      <div className="th-surface rounded-xl border border-[var(--th-border-strong)] p-6 space-y-4">
        <h2 className="text-sm font-bold th-text capitalize tracking-wider">Entity Relationship Overview</h2>
        <p className="text-sm th-text-secondary leading-relaxed">
          The data model follows a <strong className="th-text">top-down ownership cascade</strong>: Profiles own Projects, Projects contain Automations, Automations produce Versions, and active Automations generate Runs and Logs. All entities use UUID primary keys with foreign key constraints enforcing referential integrity.
        </p>
        <div className="font-mono text-[11px] th-text-secondary leading-relaxed p-4 rounded-lg th-surface-elevated border border-[var(--th-border-strong)]">
          <div className="space-y-1">
            <p>Profile (1) ──→ (N) Project</p>
            <p>Project (1) ──→ (N) Automation</p>
            <p>Automation (1) ──→ (N) Version</p>
            <p>Automation (1) ──→ (N) Run</p>
            <p>Automation (1) ──→ (1) Deployment</p>
            <p>Project (1) ──→ (N) TerminalLog</p>
            <p>Profile (1) ──→ (N) TelegramLink</p>
          </div>
        </div>
      </div>

      {/* Entity Schemas */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Entity Schemas</h2>
        <div className="space-y-6">
          {[
            {
              name: 'profiles',
              desc: 'User identity records anchored to wallet addresses. Created on first wallet connection.',
              fields: [
                { name: 'id', type: 'uuid', note: 'Primary key. Deterministically derived from wallet address.' },
                { name: 'wallet_address', type: 'text', note: 'Ethereum wallet address (normalized lowercase). Unique constraint.' },
                { name: 'telegram_chat_id', type: 'text?', note: 'Linked Telegram chat ID for notification delivery.' },
                { name: 'telegram_user_id', type: 'text?', note: 'Linked Telegram user ID for identity resolution.' },
                { name: 'created_at', type: 'timestamptz', note: 'Profile creation timestamp.' },
              ],
            },
            {
              name: 'projects',
              desc: 'Top-level organizational containers for grouping related automations.',
              fields: [
                { name: 'id', type: 'uuid', note: 'Primary key.' },
                { name: 'name', type: 'text', note: 'Human-readable project name. Used in Telegram commands and dashboard.' },
                { name: 'user_id', type: 'uuid FK', note: 'References profiles(id). Ownership constraint.' },
                { name: 'wallet_address', type: 'text', note: 'Owner wallet for backward-compatible queries.' },
                { name: 'description', type: 'text?', note: 'Optional project description.' },
                { name: 'status', type: 'text', note: 'Project lifecycle status: draft, active, archived.' },
                { name: 'created_at', type: 'timestamptz', note: 'Creation timestamp.' },
              ],
            },
            {
              name: 'automations',
              desc: 'Deployable automation units with trigger logic, action sequences, and execution metadata.',
              fields: [
                { name: 'id', type: 'uuid', note: 'Primary key.' },
                { name: 'project_id', type: 'uuid FK', note: 'Parent project reference.' },
                { name: 'name', type: 'text', note: 'Automation name. Usually matches the project name.' },
                { name: 'spec_json', type: 'jsonb', note: 'Complete automation specification: trigger, actions, notifications, runtime config.' },
                { name: 'status', type: 'text', note: 'State machine value: draft, ready, active, paused, failed, completed.' },
                { name: 'run_count', type: 'integer', note: 'Total number of completed evaluation cycles.' },
                { name: 'error_count', type: 'integer', note: 'Total number of failed evaluation cycles.' },
                { name: 'last_run_at', type: 'timestamptz?', note: 'Timestamp of most recent execution.' },
                { name: 'next_run_at', type: 'timestamptz?', note: 'Scheduled time for next evaluation.' },
                { name: 'current_version_id', type: 'uuid?', note: 'Active version pointer.' },
              ],
            },
            {
              name: 'automation_versions',
              desc: 'Immutable snapshots of automation code and configuration at deployment time.',
              fields: [
                { name: 'id', type: 'uuid', note: 'Primary key.' },
                { name: 'automation_id', type: 'uuid FK', note: 'Parent automation reference.' },
                { name: 'version_number', type: 'integer', note: 'Monotonically incrementing per automation.' },
                { name: 'files', type: 'jsonb', note: 'Map of filename → content pairs for the version.' },
                { name: 'storage_path', type: 'text?', note: 'Object storage path for the ZIP bundle.' },
                { name: 'created_at', type: 'timestamptz', note: 'Version creation timestamp.' },
              ],
            },
            {
              name: 'automation_runs',
              desc: 'Execution run records capturing the full lifecycle of a single evaluation cycle.',
              fields: [
                { name: 'id', type: 'uuid', note: 'Primary key.' },
                { name: 'automation_id', type: 'uuid FK', note: 'Parent automation reference.' },
                { name: 'version_id', type: 'uuid?', note: 'Version that was active during this run.' },
                { name: 'status', type: 'text', note: 'Run status: running, success, failed.' },
                { name: 'trigger_payload', type: 'jsonb?', note: 'Trigger parameters that were evaluated.' },
                { name: 'result', type: 'jsonb?', note: 'Action execution results and output.' },
                { name: 'error_message', type: 'text?', note: 'Error details if the run failed.' },
                { name: 'started_at', type: 'timestamptz', note: 'Run start timestamp.' },
                { name: 'completed_at', type: 'timestamptz?', note: 'Run completion timestamp.' },
              ],
            },
            {
              name: 'terminal_logs',
              desc: 'Centralized structured log entries for all platform events.',
              fields: [
                { name: 'id', type: 'uuid', note: 'Primary key.' },
                { name: 'project_id', type: 'uuid FK', note: 'Scoping key for project-filtered retrieval.' },
                { name: 'level', type: 'text', note: 'Severity level: info, warn, error, debug.' },
                { name: 'message', type: 'text', note: 'Structured log message with optional tag prefix.' },
                { name: 'timestamp', type: 'timestamptz', note: 'Event timestamp.' },
                { name: 'cleared_at', type: 'timestamptz?', note: 'Soft-delete marker for terminal clear.' },
              ],
            },
          ].map(({ name, desc, fields }) => (
            <div key={name} className="rounded-xl border border-[var(--th-border-strong)] overflow-hidden th-surface">
              <div className="px-6 py-3 border-b border-[var(--th-border-strong)] th-surface-elevated">
                <code className="text-xs font-bold th-text">{name}</code>
                <p className="text-[10px] th-text-tertiary mt-0.5">{desc}</p>
              </div>
              <div className="divide-y divide-[var(--th-border-strong)]">
                {fields.map(({ name: fname, type, note }) => (
                  <div key={fname} className="px-6 py-2.5 flex items-start gap-4">
                    <div className="flex items-center gap-2 shrink-0 w-44">
                      <code className="text-[11px] font-bold th-text">{fname}</code>
                      <span className="text-[9px] th-text-tertiary font-mono">{type}</span>
                    </div>
                    <p className="text-[11px] th-text-secondary leading-relaxed">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Store Abstraction */}
      <div className="th-surface-elevated rounded-xl border border-[var(--th-border-strong)] p-6">
        <h2 className="text-sm font-bold th-text mb-3 capitalize tracking-wider">Store Abstraction Pattern</h2>
        <p className="text-xs th-text-secondary leading-relaxed">
          The data layer is accessed through a <strong className="th-text">RuntimeStore abstraction</strong> that defines a consistent interface for all CRUD operations. Three backend implementations exist: <code className="text-[11px] th-text px-1.5 py-0.5 rounded-md th-surface border border-[var(--th-border-strong)]">InMemoryStore</code> for testing, <code className="text-[11px] th-text px-1.5 py-0.5 rounded-md th-surface border border-[var(--th-border-strong)]">JSONFileStore</code> for local development, and <code className="text-[11px] th-text px-1.5 py-0.5 rounded-md th-surface border border-[var(--th-border-strong)]">SupabaseStore</code> for production. Backend selection is driven by the <code className="text-[11px] th-text px-1.5 py-0.5 rounded-md th-surface border border-[var(--th-border-strong)]">STORE_BACKEND</code> environment variable, enabling seamless development-to-production parity.
        </p>
      </div>

      <div className="flex justify-between">
        <button onClick={() => navigate('/documentation/api')} className="btn-secondary flex items-center gap-2 text-xs h-9 px-5 rounded-lg">
          <ArrowLeft className="w-3.5 h-3.5" /> API Surface
        </button>
        <button onClick={() => navigate('/documentation/roadmap')} className="btn-secondary flex items-center gap-2 text-xs h-9 px-5 rounded-lg">
          Next: Roadmap <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
