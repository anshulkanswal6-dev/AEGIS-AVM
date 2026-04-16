import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Layers, Cpu, Workflow, Globe, Shield,
  BarChart3, Zap, Code2, Sparkles, Box, ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import { BRANDING } from '../../lib/config/branding';

import { TerminalBlock, CodeSnippet, Line, Comment, Muted, Success, Warn, Keyword, Str, Fn, Num } from './components';

const CARDS = [
  {
    icon: Layers,
    title: 'Platform Architecture',
    desc: 'Multi-layered orchestration architecture with decoupled frontend workspace, backend services, and persistent execution runtime.',
    to: '/documentation/architecture',
  },
  {
    icon: Cpu,
    title: 'Runtime Engine',
    desc: 'Persistent execution runtime with deterministic scheduling, trigger evaluation pipelines, and fault-tolerant action dispatch.',
    to: '/documentation/runtime',
  },
  {
    icon: Workflow,
    title: 'Automation Lifecycle',
    desc: 'End-to-end lifecycle management from draft inception through versioned deployment to active monitored execution.',
    to: '/documentation/automations',
  },
  {
    icon: Zap,
    title: 'Trigger Framework',
    desc: 'Extensible trigger evaluation system with composable condition primitives, on-chain state readers, and temporal scheduling.',
    to: '/documentation/triggers',
  },
  {
    icon: Globe,
    title: 'Integrations',
    desc: 'Multi-surface integration layer supporting Telegram command/control, webhook dispatch, and cross-channel notification routing.',
    to: '/documentation/integrations',
  },
  {
    icon: Shield,
    title: 'Security Model',
    desc: 'Wallet-anchored identity model with scoped execution boundaries, agent wallet isolation, and cryptographic link verification.',
    to: '/documentation/security',
  },
  {
    icon: BarChart3,
    title: 'Observability',
    desc: 'Full-stack observability with structured log aggregation, run telemetry, system health probes, and cross-surface status propagation.',
    to: '/documentation/observability',
  },
  {
    icon: Code2,
    title: 'API Surface',
    desc: 'RESTful API surface for automation management, project CRUD, execution control, and real-time status polling.',
    to: '/documentation/api',
  },
  {
    icon: Box,
    title: 'Data Model',
    desc: 'Relational data model spanning profiles, projects, automations, versions, runs, logs, and deployment state.',
    to: '/documentation/data-model',
  },
];

export default function DocsOverview() {
  const navigate = useNavigate();

  return (
    <div className="space-y-16">
      {/* Hero */}
      <div>
        <div className="flex items-center gap-1 mb-3">
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize">Docs</span>
          <ChevronRight className="w-2 h-2 th-text-tertiary/50" />
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize">Getting Started</span>
          <ChevronRight className="w-2 h-2 th-text-tertiary/50" />
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize">Overview</span>
        </div>
        <h1 className="text-3xl font-black th-text tracking-tight leading-[1.15] mb-4">
          AEGIS Platform Documentation
        </h1>
        <p className="text-sm th-text-secondary leading-relaxed max-w-2xl">
          AEGIS is an <strong className="th-text">intelligent automation platform</strong> for on-chain workflows, combining agent-driven computation, deterministic execution scheduling, and multi-surface operational control into a unified infrastructure layer for blockchain operations.
        </p>
      </div>

      {/* Key Metrics */}
      {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Architecture', value: 'Event-Driven' },
          { label: 'Execution Model', value: 'Deterministic' },
          { label: 'State Management', value: 'Persistent' },
          { label: 'Integration', value: 'Multi-Surface' },
        ].map(({ label, value }) => (
          <div key={label} className="text-center p-4 rounded-xl th-surface border border-[var(--th-border-strong)]">
            <p className="text-[9px] font-black th-text-tertiary capitalize tracking-[0.2em] mb-1.5">{label}</p>
            <p className="text-xs font-bold th-text">{value}</p>
          </div>
        ))}
      </div> */}

      {/* Platform Summary */}
      <div className="th-surface rounded-xl border border-[var(--th-border-strong)] p-6 space-y-3">
        <h2 className="text-sm font-bold th-text capitalize tracking-wider">Platform Abstract</h2>
        <p className="text-sm th-text-secondary leading-relaxed">
          AEGIS provides a vertically integrated automation stack purpose-built for on-chain operational workflows. The platform orchestrates the full lifecycle of blockchain automations — from intent capture through an <strong className="th-text">agent-assisted conversational interface</strong>, to <strong className="th-text">deterministic runtime execution</strong> against live chain state, to <strong className="th-text">multi-channel observability and control</strong>.
        </p>
        <p className="text-sm th-text-secondary leading-relaxed">
          The system architecture separates concerns across discrete layers: a reactive frontend workspace, a stateless orchestration service, a persistent relational data layer, a background execution runtime with APScheduler-based job management, and an integration surface that extends operational reach to external communication channels.
        </p>
      </div>

      {/* Visual Tech Demos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TerminalBlock title="aegis-runtime --live">
          <Line prompt="[08:42:01]">Initialising evaluation cycle...</Line>
          <Line prompt="[08:42:01]" dim>Loading automation: <Str>"Vault Rebalancer"</Str></Line>
          <Line prompt="[08:42:02]">Querying {BRANDING.networkName} RPC state...</Line>
          <Line prompt="[08:42:03]">Trigger check: <Keyword>wallet_balance_below</Keyword></Line>
          <Line prompt="[08:42:03]" dim>Current: 1.25 {BRANDING.currencySymbol} | Threshold: 5.0 {BRANDING.currencySymbol}</Line>
          <Line prompt="[08:42:03]"><Success>MATCH</Success> Trigger condition satisfied.</Line>
          <Line prompt="[08:42:04]" dim>Assembling action payload...</Line>
          <Line prompt="[08:42:05]">Executing: <Fn>dispatch_gas_refill</Fn>(target=<Str>"0x71...f2"</Str>)</Line>
          <Line prompt="[08:42:06]"><Success>OK</Success> Action executed successfully.</Line>
          <Line prompt="[08:42:06]">Notifying channel: <Keyword>telegram</Keyword></Line>
          <Line prompt="[08:42:07]"><Success>DONE</Success> Cycle complete. Next run in 30s.</Line>
        </TerminalBlock>

        <CodeSnippet language="json" title="automation-spec.v1.json">
          <Line><Muted>{"{"}</Muted></Line>
          <Line>  <Str>"id"</Str>: <Str>"auto_9f2...81a"</Str>,</Line>
          <Line>  <Str>"trigger"</Str>: <Muted>{"{"}</Muted></Line>
          <Line>    <Str>"type"</Str>: <Str>"price_below"</Str>,</Line>
          <Line>    <Str>"params"</Str>: <Muted>{"{"}</Muted> <Str>"token"</Str>: <Str>"MON"</Str>, <Str>"threshold"</Str>: <Num>3.50</Num> <Muted>{"}"}</Muted></Line>
          <Line>  <Muted>{"}"}</Muted>,</Line>
          <Line>  <Str>"actions"</Str>: <Muted>[</Muted></Line>
          <Line>    <Muted>{"{"}</Muted> <Str>"call"</Str>: <Str>"execute_swap"</Str>, <Str>"params"</Str>: <Muted>{"{"}</Muted> <Str>"to"</Str>: <Str>"USDC"</Str> <Muted>{"}"}</Muted> <Muted>{"}"}</Muted></Line>
          <Line>  <Muted>]</Muted>,</Line>
          <Line>  <Str>"notifications"</Str>: <Muted>[</Muted> <Str>"telegram"</Str> <Muted>]</Muted></Line>
          <Line><Muted>{"}"}</Muted></Line>
        </CodeSnippet>
      </div>

      {/* Core Principles */}
      <div className=''>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Design Principles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { title: 'Separation of Concerns', desc: 'Discrete system boundaries between workspace, orchestration, persistence, execution, and integration — enabling independent scaling and fault isolation.' },
            { title: 'Deterministic Execution', desc: 'Automation evaluations produce consistent, reproducible results given identical chain state. No ambient side effects between evaluation cycles.' },
            { title: 'Operational Transparency', desc: 'Every trigger evaluation, action execution, and state transition is logged, timestamped, and surfaced through structured telemetry channels.' },
            { title: 'Progressive Disclosure', desc: 'Complexity is layered — conversational builder for rapid prototyping, full IDE for advanced control, remote surfaces for operational monitoring.' },
          ].map(({ title, desc }) => (
            <div key={title} className="p-5 rounded-xl border border-[var(--th-border-strong)] th-surface">
              <h3 className="text-sm font-bold th-text mb-1.5">{title}</h3>
              <p className="text-xs th-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Cards */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Explore the Documentation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CARDS.map(({ icon: Icon, title, desc, to }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="text-left p-5 rounded-xl border border-[var(--th-border-strong)] th-surface hover:border-[var(--th-text-tertiary)] transition-all group"
            >
              <div className="w-8 h-8 rounded-lg th-surface-elevated border border-[var(--th-border-strong)] flex items-center justify-center mb-3 group-hover:border-[var(--th-text-tertiary)] transition-colors">
                <Icon className="w-4 h-4 th-text-secondary" />
              </div>
              <h3 className="text-sm font-bold th-text mb-1 flex items-center gap-1.5">
                {title}
                <ChevronRight className="w-3 h-3 th-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-[11px] th-text-secondary leading-relaxed">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-2xl border border-[var(--th-border-strong)] th-surface-elevated p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.04)_0%,transparent_70%)] pointer-events-none" />
        <div className="relative">
          <h2 className="text-lg font-extrabold th-text tracking-tight mb-2">Ready to Build?</h2>
          <p className="text-xs th-text-secondary max-w-md mx-auto mb-5 leading-relaxed">
            Launch the Playground to start building your first automation, or dive deeper into the technical documentation.
          </p>
          <button
            onClick={() => navigate('/playground')}
            className="btn-primary flex items-center gap-2 text-xs h-9 px-6 rounded-lg mx-auto"
          >
            Open Playground <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
