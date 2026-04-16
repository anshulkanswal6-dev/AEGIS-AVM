import { ChevronRight, ArrowLeft, ArrowRight, Sparkles, Zap, Globe, Shield, Cpu, BarChart3, Layers, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils/cn';

export default function DocsRoadmap() {
  const navigate = useNavigate();

  return (
    <div className="space-y-14">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1 mb-3">
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize cursor-pointer hover:th-text transition-colors" onClick={() => navigate('/documentation')}>Docs</span>
          <ChevronRight className="w-2 h-2 th-text-tertiary/50" />
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize cursor-pointer hover:th-text transition-colors" onClick={() => navigate('/documentation')}>Reference</span>
          <ChevronRight className="w-2 h-2 th-text-tertiary/50" />
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize">Roadmap</span>
        </div>
        <h1 className="text-3xl font-black th-text tracking-tight leading-[1.15] mb-4">
          Platform Roadmap
        </h1>
        <p className="text-sm th-text-secondary leading-relaxed max-w-2xl">
          The AEGIS roadmap outlines the <strong className="th-text">strategic evolution</strong> of the platform — from the current operational foundation through advanced execution models, expanded integration surfaces, and enterprise-grade operational capabilities.
        </p>
      </div>

      {/* Demo Video */}
      <div className="relative rounded-2xl border border-[var(--th-border-strong)] th-surface overflow-hidden aspect-video shadow-2xl">
        <iframe 
          className="w-full h-full"
          src="https://www.youtube.com/embed/gu8FRINJjB8?rel=0" 
          title="AEGIS AI - Demo" 
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        ></iframe>
      </div>

      {/* Current State */}
      <div className="th-surface rounded-xl border border-[var(--th-border-strong)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
          <h2 className="text-sm font-bold th-text capitalize tracking-wider">Current Release — v1.0</h2>
        </div>
        <p className="text-sm th-text-secondary leading-relaxed mb-4">
          AEGIS v1.0 delivers the complete foundation: agent-assisted automation building, deterministic runtime execution, wallet-scoped identity, Telegram integration with full remote control, and cross-surface observability.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            'Agent Workspace',
            'Runtime Engine',
            'Trigger Framework',
            'Telegram Bot',
            'Notification Pipeline',
            'Version Control',
            'Run Telemetry',
            'Wallet Integration',
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2 p-2.5 rounded-lg th-surface-elevated border border-[var(--th-border-strong)]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[11px] font-medium th-text">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Roadmap Phases */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Evolution Phases</h2>
        <div className="space-y-4">
          {[
            {
              phase: 'Phase 2',
              title: 'Advanced Execution & Multi-Chain',
              status: 'In Development',
              statusColor: 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950',
              items: [
                { icon: Cpu, label: 'Conditional Action Chains', desc: 'Branching action execution paths based on trigger context, runtime conditions, and previous action results. If-else, switch, and loop primitives for complex workflow orchestration.' },
                { icon: Globe, label: 'Multi-Chain Support', desc: 'Extended chain support beyond Algorand Testnet — Ethereum Mainnet, Arbitrum, Base, Polygon, and configurable custom RPC endpoints with chain-specific trigger adapters.' },
                { icon: Zap, label: 'Event-Driven Triggers', desc: 'WebSocket-based event subscription for real-time chain events (contract emissions, transfer events, block confirmations) with sub-block latency response times.' },
                { icon: Bot, label: 'Enhanced Agent Intelligence', desc: 'Multi-model agent routing, improved spec generation accuracy, context-aware automation suggestions, and iterative debugging assistance.' },
              ],
            },
            {
              phase: 'Phase 3',
              title: 'Team Collaboration & Marketplace',
              status: 'Planned',
              statusColor: 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950',
              items: [
                { icon: Shield, label: 'Team Workspaces', desc: 'Multi-user project access with role-based permissions (owner, editor, viewer). Shared automation management, collaborative debugging, and team notification routing.' },
                { icon: Layers, label: 'Automation Marketplace', desc: 'Community-driven automation template library. Publish, discover, fork, and customize automation templates with one-click deployment. Rating and attribution system.' },
                { icon: BarChart3, label: 'Advanced Analytics', desc: 'Execution performance dashboards, trigger match rate analytics, cost tracking for on-chain operations, and historical trend visualization.' },
                { icon: Globe, label: 'Discord & Slack Integration', desc: 'Extended integration surface to Discord servers and Slack workspaces. Channel-based notification routing, slash commands, and interactive message components.' },
              ],
            },
            {
              phase: 'Phase 4',
              title: 'Enterprise & Infrastructure',
              status: 'Vision',
              statusColor: 'th-text-tertiary border-[var(--th-border-strong)] th-surface-elevated',
              items: [
                { icon: Cpu, label: 'Distributed Execution', desc: 'Horizontally scaled execution runtime with worker pool management, load-balanced trigger evaluation, and geo-distributed execution nodes for reduced latency.' },
                { icon: Shield, label: 'Custom Deployment Targets', desc: 'Self-hosted execution runtime support. Deploy AEGIS workers on private infrastructure with custom RPC endpoints, VPC networking, and enterprise compliance controls.' },
                { icon: Sparkles, label: 'Autonomous Agent Mode', desc: 'Self-managing automation agents that monitor their own performance, adjust parameters, and suggest optimizations based on execution telemetry and outcome analysis.' },
                { icon: Layers, label: 'Cross-Platform Orchestration', desc: 'Composite automations spanning multiple chains, multiple protocols, and multiple external services. DAG-based workflow definitions with dependency resolution.' },
              ],
            },
          ].map(({ phase, title, status, statusColor, items }) => (
            <div key={phase} className="rounded-xl border border-[var(--th-border-strong)] th-surface overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--th-border-strong)] th-surface-elevated flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black th-text-tertiary tracking-[0.2em] capitalize">{phase}</span>
                  <h3 className="text-sm font-bold th-text">{title}</h3>
                </div>
                <span className={cn("text-[9px] font-black tracking-[0.15em] capitalize px-2.5 py-1 rounded-full border", statusColor)}>
                  {status}
                </span>
              </div>
              <div className="divide-y divide-[var(--th-border-strong)]">
                {items.map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="px-6 py-4 flex items-start gap-4">
                    <Icon className="w-4 h-4 th-text-tertiary mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold th-text mb-0.5">{label}</h4>
                      <p className="text-[11px] th-text-secondary leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Priorities */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Technical Priorities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: 'Horizontal Scalability', desc: 'Evolve from single-node execution to a distributed worker pool architecture. Enable automatic scaling based on automation count and evaluation load.' },
            { title: 'Event Sourcing', desc: 'Transition from polling-based trigger evaluation to event-sourced chain monitoring with WebSocket subscriptions for real-time reactivity.' },
            { title: 'Plugin Architecture', desc: 'Formalize the trigger and action extension model into a documented plugin system with versioned interfaces, sandboxed execution, and community contribution pipeline.' },
            { title: 'Observability v2', desc: 'OpenTelemetry-based distributed tracing across all system layers. Metrics export to Prometheus/Grafana for infrastructure-level monitoring and alerting.' },
          ].map(({ title, desc }) => (
            <div key={title} className="p-5 rounded-xl border border-[var(--th-border-strong)] th-surface">
              <h3 className="text-sm font-bold th-text mb-1.5">{title}</h3>
              <p className="text-xs th-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-2xl border border-[var(--th-border-strong)] th-surface-elevated p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.04)_0%,transparent_70%)] pointer-events-none" />
        <div className="relative">
          <h2 className="text-lg font-extrabold th-text tracking-tight mb-2">Build the Future of On-Chain Operations</h2>
          <p className="text-xs th-text-secondary max-w-lg mx-auto mb-5 leading-relaxed">
            AEGIS is evolving from an automation tool into a comprehensive operational infrastructure layer for blockchain workflows. The platform roadmap is shaped by real operator needs and execution at the frontier.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => navigate('/playground')} className="btn-primary flex items-center gap-2 text-xs h-9 px-6 rounded-lg">
              Start Building <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => navigate('/documentation')} className="btn-secondary flex items-center gap-2 text-xs h-9 px-6 rounded-lg">
              Back to Docs
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-start">
        <button onClick={() => navigate('/documentation/data-model')} className="btn-secondary flex items-center gap-2 text-xs h-9 px-5 rounded-lg">
          <ArrowLeft className="w-3.5 h-3.5" /> Data Model
        </button>
      </div>
    </div>
  );
}
