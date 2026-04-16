import { ChevronRight, ArrowRight, ArrowLeft, Lock, Shield, Eye, Network, Fingerprint, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DocsSecurity() {
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
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize">Security Model</span>
        </div>
        <h1 className="text-3xl font-black th-text tracking-tight leading-[1.15] mb-4">
          Security & Access Control
        </h1>
        <p className="text-sm th-text-secondary leading-relaxed max-w-2xl">
          AEGIS implements a <strong className="th-text">wallet-anchored identity model</strong> with layered security boundaries, scoped execution isolation, and cryptographic verification at integration boundaries.
        </p>
      </div>

      {/* Identity Model */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Identity Model</h2>
        <div className="th-surface rounded-xl border border-[var(--th-border-strong)] p-6 space-y-4">
          <p className="text-sm th-text-secondary leading-relaxed">
            User identity in AEGIS is <strong className="th-text">derived from wallet address</strong> — the cryptographic proof of ownership provided by the Web3 wallet connection. There are no traditional username/password credentials. Identity is established through the EVM signature verification process handled by the wallet provider (MetaMask, WalletConnect, etc.).
          </p>
          <p className="text-sm th-text-secondary leading-relaxed">
            On first connection, a <strong className="th-text">profile record</strong> is created in the persistence layer, keyed by wallet address. All downstream resources (projects, automations, runs, logs) are ownership-scoped to this profile ID. Wallet addresses are normalized to lowercase for case-insensitive matching with backward compatibility for legacy mixed-case entries.
          </p>
        </div>
      </div>

      {/* Security Layers */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Security Boundaries</h2>
        <div className="space-y-3">
          {[
            { icon: Fingerprint, title: 'Wallet Authentication', desc: 'Cryptographic wallet signature provides authentication without credential storage. Session management is handled client-side through the wallet provider. No sensitive authentication data is stored on the backend.', accent: 'border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400' },
            { icon: Lock, title: 'Resource Ownership Scoping', desc: 'All database queries for user-facing resources include user_id/wallet_address filtering. Projects, automations, and execution history are strictly scoped to the authenticated wallet. Cross-user resource access is architecturally prevented at the query layer.', accent: 'border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400' },
            { icon: Shield, title: 'Agent Wallet Isolation', desc: 'AEGIS implements a smart contract-based Agent Wallet system via a Factory contract pattern. The Agent Wallet is a separate on-chain entity from the user\'s primary wallet, providing transaction isolation. Funds deposited to the Agent Wallet are operationally separated from the user\'s main holdings.', accent: 'border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400' },
            { icon: Key, title: 'Integration Link Verification', desc: 'Telegram account linking uses a one-time token-based verification flow. Tokens are generated server-side, transmitted to the user through the dashboard, and verified by the Telegram bot upon receipt. Each token is single-use with conflict detection for already-linked accounts.', accent: 'border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400' },
            { icon: Eye, title: 'Audit Trail', desc: 'Every automation execution, state transition, and operational action is logged with timestamps and contextual metadata. Execution logs are append-only with no deletion pathway. Run history provides a complete auditable record of all system operations.', accent: 'border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400' },
            { icon: Network, title: 'API Security', desc: 'Backend API endpoints implement validation at multiple layers. Request parameters are sanitized, UUID values are verified, and database operations use parameterized queries through the PostgREST layer to prevent injection attacks.', accent: 'border-cyan-100 bg-cyan-50 text-cyan-600 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-400' },
          ].map(({ icon: Icon, title, desc, accent }) => (
            <div key={title} className="flex items-start gap-4 p-5 rounded-xl border border-[var(--th-border-strong)] th-surface">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${accent}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold th-text mb-1">{title}</h3>
                <p className="text-xs th-text-secondary leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Execution Security */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Execution Security</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: 'Scoped Execution Boundaries', desc: 'Automations execute within defined operational boundaries. Each automation\'s execution context is isolated — it receives only the chain parameters, wallet addresses, and configuration specified in its own spec. No cross-automation state bleeding.' },
            { title: 'Error Containment', desc: 'Execution failures in one automation are contained and cannot cascade to other automations or system services. The runtime engine wraps every evaluation in an independent exception boundary with structured error logging.' },
            { title: 'Rate Limiting', desc: 'Scheduler-level safeguards prevent runaway execution. Minimum interval floors (5 seconds), non-overlapping execution constraints (max_instances=1), and notification cooldown windows protect against resource exhaustion.' },
            { title: 'Configuration Externalization', desc: 'All sensitive configuration (API keys, RPC endpoints, database credentials) is externalized to environment variables. No secrets are hardcoded in application code or stored in the client-side application bundle.' },
          ].map(({ title, desc }) => (
            <div key={title} className="p-5 rounded-xl border border-[var(--th-border-strong)] th-surface">
              <h3 className="text-sm font-bold th-text mb-1.5">{title}</h3>
              <p className="text-xs th-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Data Security */}
      <div className="th-surface-elevated rounded-xl border border-[var(--th-border-strong)] p-6">
        <h2 className="text-sm font-bold th-text mb-3 capitalize tracking-wider">Data Layer Security</h2>
        <p className="text-xs th-text-secondary leading-relaxed">
          The persistence layer leverages <strong className="th-text">Supabase's PostgreSQL-backed infrastructure</strong> with Row-Level Security (RLS) policies, encrypted connections (TLS), and API key-based authentication. Database access from the backend uses a service-role key with full table access, while thread-local connection isolation prevents SSL socket contention in concurrent access patterns. Automation code artifacts are stored in Supabase Object Storage with path-scoped access.
        </p>
      </div>

      <div className="flex justify-between">
        <button onClick={() => navigate('/documentation/integrations')} className="btn-secondary flex items-center gap-2 text-xs h-9 px-5 rounded-lg">
          <ArrowLeft className="w-3.5 h-3.5" /> Integrations
        </button>
        <button onClick={() => navigate('/documentation/observability')} className="btn-secondary flex items-center gap-2 text-xs h-9 px-5 rounded-lg">
          Next: Observability <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
