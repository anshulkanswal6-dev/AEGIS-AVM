import { ChevronRight, ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils/cn';

export default function DocsTriggers() {
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
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize">Trigger Framework</span>
        </div>
        <h1 className="text-3xl font-black th-text tracking-tight leading-[1.15] mb-4">
          Trigger Framework
        </h1>
        <p className="text-sm th-text-secondary leading-relaxed max-w-2xl">
          The Trigger Framework is a <strong className="th-text">modular, extensible condition evaluation system</strong> that determines when automations should fire. It provides composable primitives for on-chain state monitoring, temporal scheduling, and cross-domain event detection.
        </p>
      </div>

      {/* Evaluation Model */}
      <div className="th-surface rounded-xl border border-[var(--th-border-strong)] p-6 space-y-4">
        <h2 className="text-sm font-bold th-text capitalize tracking-wider">Evaluation Model</h2>
        <p className="text-sm th-text-secondary leading-relaxed">
          The TriggerEngine implements a <strong className="th-text">strategy pattern</strong> — each trigger type is a self-contained evaluation function that receives a <code className="text-[11px] th-text px-1.5 py-0.5 rounded-md th-surface-elevated border border-[var(--th-border-strong)]">TriggerContext</code> and trigger-specific parameters, and returns a boolean match result. The engine dispatches to the appropriate strategy based on the trigger type string.
        </p>
        <p className="text-sm th-text-secondary leading-relaxed">
          All evaluations are <strong className="th-text">side-effect-free</strong> — they read chain state and compute conditions without mutating any state. This ensures that repeated evaluations against the same chain state are fully idempotent.
        </p>
      </div>

      {/* Trigger Context */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Trigger Context</h2>
        <p className="text-sm th-text-secondary leading-relaxed mb-4">
          Every trigger evaluation receives a <strong className="th-text">TriggerContext</strong> object assembled by the runtime engine. This provides all the environmental data needed for condition evaluation.
        </p>
        <div className="th-surface rounded-xl border border-[var(--th-border-strong)] divide-y divide-[var(--th-border-strong)]">
          {[
            { field: 'chain', type: 'string', desc: 'Target blockchain identifier (e.g., "Algorand Testnet"). Used for chain-specific logic branching.' },
            { field: 'rpc_url', type: 'string', desc: 'Algod node endpoint for chain state queries. Configurable per-automation or from global defaults.' },
            { field: 'wallet_address', type: 'string', desc: 'Target wallet address for balance and transaction monitoring. Resolved from automation spec.' },
            { field: 'now', type: 'datetime', desc: 'Current UTC timestamp at evaluation time. Used for temporal trigger calculations and scheduling.' },
            { field: 'memory', type: 'dict', desc: 'Stateful memory map for cross-evaluation persistence. Enables triggers that track state changes over time.' },
            { field: 'automation_created_at', type: 'datetime', desc: 'Creation timestamp of the automation. Used for relative time-based triggers.' },
          ].map(({ field, type, desc }) => (
            <div key={field} className="px-6 py-3 flex items-start gap-4">
              <div className="flex items-center gap-2 shrink-0 w-40">
                <code className="text-[11px] font-bold th-text">{field}</code>
                <span className="text-[9px] th-text-tertiary font-mono">{type}</span>
              </div>
              <p className="text-[11px] th-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trigger Types */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Supported Trigger Types</h2>
        <div className="space-y-3">
          {[
            {
              type: 'run_every_interval',
              category: 'Temporal',
              desc: 'Always returns true on every evaluation cycle. Combined with the scheduler interval, this creates a simple periodic execution pattern. Useful for monitoring, reporting, and polling-based workflows.',
              params: ['interval'],
            },
            {
              type: 'run_once_at_datetime',
              category: 'Temporal',
              desc: 'Evaluates to true when the current UTC time exceeds a specified datetime threshold. Supports both absolute ISO timestamps and relative dynamic placeholders computed from automation creation time. Triggers exactly once, then sets automation to COMPLETED.',
              params: ['datetime', 'dynamic_offset'],
            },
            {
              type: 'wallet_balance_below',
              category: 'On-Chain',
              desc: 'Queries the target wallet\'s native token balance via Algod node and evaluates to true when the balance drops below a specified threshold. Supports configurable denomination (microalgos/algo) and dynamic threshold specification.',
              params: ['wallet_address', 'threshold', 'unit'],
            },
            {
              type: 'wallet_balance_above',
              category: 'On-Chain',
              desc: 'Inverse of wallet_balance_below — triggers when the wallet balance exceeds a threshold. Useful for monitoring incoming deposits, faucet claims, or reward distributions.',
              params: ['wallet_address', 'threshold', 'unit'],
            },
            {
              type: 'price_above / price_below',
              category: 'Market',
              desc: 'Monitors token price data against configurable thresholds. Supports multiple price feed sources with fallback resolution. Evaluates against the latest available price data at each cycle.',
              params: ['token', 'threshold', 'source'],
            },
            {
              type: 'gas_price_below',
              category: 'On-Chain',
              desc: 'Monitors network congestion (simulated or real pool fee density) and triggers when network costs drop below a threshold. Enables cost-optimized transaction execution by waiting for favorable conditions.',
              params: ['threshold'],
            },
          ].map(({ type, category, desc, params }) => (
            <div key={type} className="p-5 rounded-xl border border-[var(--th-border-strong)] th-surface">
              <div className="flex items-center justify-between mb-2">
                <code className="text-xs font-bold th-text">{type}</code>
                <span className={cn(
                  "text-[9px] font-black tracking-[0.15em] capitalize px-2 py-0.5 rounded-full border",
                  category === 'Temporal' ? 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950'
                    : category === 'On-Chain' ? 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950'
                    : 'text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950'
                )}>{category}</span>
              </div>
              <p className="text-xs th-text-secondary leading-relaxed mb-2">{desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {params.map((p) => (
                  <span key={p} className="text-[10px] font-mono th-text-tertiary px-2 py-0.5 rounded-md border border-[var(--th-border-strong)] th-surface-elevated">{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Extensibility */}
      <div className="th-surface-elevated rounded-xl border border-[var(--th-border-strong)] p-6">
        <h2 className="text-sm font-bold th-text mb-3 capitalize tracking-wider">Extensibility Model</h2>
        <p className="text-xs th-text-secondary leading-relaxed">
          The trigger framework is designed for <strong className="th-text">horizontal extensibility</strong>. New trigger types are added by implementing a single evaluation function that conforms to the <code className="text-[11px] th-text px-1.5 py-0.5 rounded-md th-surface border border-[var(--th-border-strong)]">(params, context) → bool</code> signature and registering it in the TriggerEngine dispatcher. The trigger catalogue (catalogue.json) provides metadata for the agent's trigger discovery and parameter guidance, enabling the conversational builder to automatically support new trigger types without frontend changes.
        </p>
      </div>

      <div className="flex justify-between">
        <button onClick={() => navigate('/documentation/automations')} className="btn-secondary flex items-center gap-2 text-xs h-9 px-5 rounded-lg">
          <ArrowLeft className="w-3.5 h-3.5" /> Automation Lifecycle
        </button>
        <button onClick={() => navigate('/documentation/integrations')} className="btn-secondary flex items-center gap-2 text-xs h-9 px-5 rounded-lg">
          Next: Integrations <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
