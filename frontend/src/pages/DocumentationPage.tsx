import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils/cn';
import {
  Zap, Shield, Eye, Terminal, Layers, Bell, Bot,
  Workflow, Database, Globe, ArrowRight, ChevronRight,
  Cpu, Network, Lock, BarChart3, MessageSquare, Sparkles, BookOpen
} from 'lucide-react';

/* ─────────────────────────────────────────────────────
   SECTION NAV CONFIG
   ───────────────────────────────────────────────────── */
const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'what-is-aegis', label: 'What is AEGIS' },
  { id: 'capabilities', label: 'Core Capabilities' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'projects', label: 'Projects & Automations' },
  { id: 'security', label: 'Security & Control' },
  { id: 'monitoring', label: 'Monitoring' },
  { id: 'developer-experience', label: 'Developer Experience' },
] as const;

/* ─────────────────────────────────────────────────────
   REUSABLE COMPONENTS
   ───────────────────────────────────────────────────── */

function SectionHeading({ id, badge, title, subtitle }: {
  id: string; badge: string; title: string; subtitle?: string;
}) {
  return (
    <div id={id} className="scroll-mt-24 mb-10">
      <span className="inline-block text-[10px] font-black tracking-[0.2em] uppercase th-text-tertiary mb-3 px-2 py-1 rounded-md border border-[var(--th-border-strong)] th-surface-elevated">
        {badge}
      </span>
      <h2 className="text-2xl font-extrabold th-text tracking-tight leading-tight">{title}</h2>
      {subtitle && (
        <p className="mt-2 text-sm th-text-secondary leading-relaxed max-w-2xl">{subtitle}</p>
      )}
    </div>
  );
}

function CapabilityCard({ icon: Icon, title, description }: {
  icon: React.ElementType; title: string; description: string;
}) {
  return (
    <div className="group p-5 rounded-xl border border-[var(--th-border-strong)] th-surface hover:border-[var(--th-text-tertiary)] transition-all duration-300 hover:shadow-lg">
      <div className="w-9 h-9 rounded-lg th-surface-elevated border border-[var(--th-border-strong)] flex items-center justify-center mb-4 group-hover:border-[var(--th-text-tertiary)] transition-colors">
        <Icon className="w-4 h-4 th-text-secondary group-hover:th-text transition-colors" />
      </div>
      <h3 className="text-sm font-bold th-text mb-1.5 tracking-tight">{title}</h3>
      <p className="text-xs th-text-secondary leading-relaxed">{description}</p>
    </div>
  );
}

function ArchitectureLayer({ label, description, icon: Icon, accent }: {
  label: string; description: string; icon: React.ElementType; accent: string;
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-[var(--th-border-strong)] th-surface group hover:border-[var(--th-text-tertiary)] transition-all">
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border",
        accent
      )}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div>
        <h4 className="text-sm font-bold th-text mb-1">{label}</h4>
        <p className="text-xs th-text-secondary leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function IntegrationCard({ icon: Icon, name, description, status }: {
  icon: React.ElementType; name: string; description: string; status: 'live' | 'coming';
}) {
  return (
    <div className="p-5 rounded-xl border border-[var(--th-border-strong)] th-surface hover:border-[var(--th-text-tertiary)] transition-all group">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg th-surface-elevated border border-[var(--th-border-strong)] flex items-center justify-center group-hover:border-[var(--th-text-tertiary)] transition-colors">
          <Icon className="w-4 h-4 th-text-secondary" />
        </div>
        <span className={cn(
          "text-[9px] font-black tracking-[0.15em] uppercase px-2 py-0.5 rounded-full border",
          status === 'live'
            ? "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950"
            : "th-text-tertiary border-[var(--th-border-strong)] th-surface-elevated"
        )}>
          {status === 'live' ? 'Live' : 'Coming Soon'}
        </span>
      </div>
      <h3 className="text-sm font-bold th-text mb-1">{name}</h3>
      <p className="text-xs th-text-secondary leading-relaxed">{description}</p>
    </div>
  );
}

function ConceptRow({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[var(--th-border)] last:border-b-0">
      <ChevronRight className="w-3.5 h-3.5 th-text-tertiary shrink-0 mt-0.5" />
      <div>
        <span className="text-xs font-bold th-text">{label}</span>
        <span className="text-xs th-text-secondary ml-1.5">— {description}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   MAIN PAGE
   ───────────────────────────────────────────────────── */
export default function DocumentationPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection observer for sticky nav highlight
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen th-bg th-text">
      {/* ════════ HERO ════════ */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.06)_0%,transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.04)_0%,transparent_60%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-8 pt-16 pb-12 relative">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="w-4 h-4 th-text-tertiary" />
            <span className="text-[10px] font-black tracking-[0.2em] uppercase th-text-tertiary">Documentation</span>
            <span className="text-[10px] th-text-tertiary mx-1">·</span>
            <span className="text-[10px] font-semibold th-text-tertiary">v1.0</span>
          </div>

          <h1 className="text-4xl font-black th-text tracking-tight leading-[1.1] mb-4 max-w-xl">
            AEGIS Platform
          </h1>
          <p className="text-base th-text-secondary leading-relaxed max-w-2xl mb-6 font-medium">
            The automation platform for on-chain workflows, agent-driven execution, and cross-surface operational control.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/playground')}
              className="btn-primary flex items-center gap-2 text-xs h-9 px-5 rounded-lg"
            >
              Open Playground <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => scrollTo('what-is-aegis')}
              className="btn-secondary flex items-center gap-2 text-xs h-9 px-5 rounded-lg"
            >
              Read Docs
            </button>
          </div>
        </div>
      </div>

      {/* ════════ CONTENT GRID ════════ */}
      <div className="max-w-7xl mx-auto px-8 pb-24">
        <div className="flex gap-12">

          {/* ─── Sticky Side Nav ─── */}
          <nav className="hidden lg:block w-48 shrink-0">
            <div className="sticky top-8 space-y-0.5">
              <p className="text-[10px] font-black tracking-[0.2em] uppercase th-text-tertiary mb-4 px-3">On this page</p>
              {SECTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 rounded-md text-[12px] font-medium transition-all",
                    activeSection === id
                      ? "th-text th-surface-elevated border border-[var(--th-border-strong)]"
                      : "th-text-tertiary hover:th-text-secondary hover:th-surface-hover border border-transparent"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </nav>

          {/* ─── Main Content ─── */}
          <div className="flex-1 min-w-0 space-y-20">

            {/* ── Section: Overview ── */}
            <section>
              <SectionHeading
                id="overview"
                badge="Introduction"
                title="What you need to know"
                subtitle="A concise overview of the AEGIS platform, its purpose, and what it enables for operators and builders in the on-chain ecosystem."
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl border border-[var(--th-border-strong)] th-surface">
                  <div className="text-lg mb-2">⚡</div>
                  <h3 className="text-xs font-bold th-text mb-1.5 uppercase tracking-wider">Automated</h3>
                  <p className="text-xs th-text-secondary leading-relaxed">Define once, run continuously. Automations operate on schedules, triggers, and conditions without manual intervention.</p>
                </div>
                <div className="p-5 rounded-xl border border-[var(--th-border-strong)] th-surface">
                  <div className="text-lg mb-2">🧠</div>
                  <h3 className="text-xs font-bold th-text mb-1.5 uppercase tracking-wider">Intelligent</h3>
                  <p className="text-xs th-text-secondary leading-relaxed">Agent-assisted workflows understand intent, generate operational logic, and adapt to complex on-chain conditions.</p>
                </div>
                <div className="p-5 rounded-xl border border-[var(--th-border-strong)] th-surface">
                  <div className="text-lg mb-2">🛡️</div>
                  <h3 className="text-xs font-bold th-text mb-1.5 uppercase tracking-wider">Controlled</h3>
                  <p className="text-xs th-text-secondary leading-relaxed">Wallet-scoped execution, monitored runs, and real-time visibility across every operation.</p>
                </div>
              </div>
            </section>

            {/* ── Section: What is AEGIS ── */}
            <section>
              <SectionHeading
                id="what-is-aegis"
                badge="Platform"
                title="What is AEGIS"
                subtitle="AEGIS is a full-stack automation environment purpose-built for on-chain operations."
              />
              <div className="th-surface rounded-xl border border-[var(--th-border-strong)] p-6 space-y-4">
                <p className="text-sm th-text-secondary leading-relaxed">
                  AEGIS combines a <strong className="th-text">project-based workspace</strong>, an <strong className="th-text">agent-assisted automation builder</strong>, a <strong className="th-text">persistent runtime engine</strong>, and <strong className="th-text">multi-surface control</strong> into a unified platform for building, deploying, and managing on-chain workflows.
                </p>
                <p className="text-sm th-text-secondary leading-relaxed">
                  It enables operators to define complex automation logic through a conversational interface, deploy automations that execute against live blockchain state, and monitor everything from a centralized dashboard or remotely via integrated channels.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  {[
                    { label: 'Projects', value: 'Organized' },
                    { label: 'Runtime', value: 'Persistent' },
                    { label: 'Agent', value: 'Assistive' },
                    { label: 'Control', value: 'Multi-Surface' },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center p-3 rounded-lg th-surface-elevated border border-[var(--th-border-strong)]">
                      <p className="text-[10px] font-black th-text-tertiary uppercase tracking-widest mb-1">{label}</p>
                      <p className="text-xs font-bold th-text">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Section: Core Capabilities ── */}
            <section>
              <SectionHeading
                id="capabilities"
                badge="Capabilities"
                title="Core Capabilities"
                subtitle="A high-level view of what the platform enables across the automation lifecycle."
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <CapabilityCard
                  icon={Bot}
                  title="Automation Builder"
                  description="Define automation logic through an interactive agent workspace. Specify triggers, conditions, and actions using natural conversation."
                />
                <CapabilityCard
                  icon={Workflow}
                  title="Deployment Lifecycle"
                  description="Seamless transition from draft to active deployment. Version-controlled, with full rollback and redeployment support."
                />
                <CapabilityCard
                  icon={Cpu}
                  title="Runtime Execution"
                  description="A persistent execution engine that evaluates triggers, runs action sequences, and maintains execution state across cycles."
                />
                <CapabilityCard
                  icon={Eye}
                  title="Execution Monitoring"
                  description="Real-time visibility into automation runs, trigger evaluations, and action outcomes through integrated log streams."
                />
                <CapabilityCard
                  icon={Bell}
                  title="Notification System"
                  description="Multi-channel alert delivery for automation events, with intelligent cooldown management and delivery confirmation."
                />
                <CapabilityCard
                  icon={Shield}
                  title="Wallet-Aware Operations"
                  description="Automations operate within wallet-scoped contexts, enabling balance monitoring, transaction verification, and on-chain interaction."
                />
              </div>
            </section>

            {/* ── Section: Architecture ── */}
            <section>
              <SectionHeading
                id="architecture"
                badge="Architecture"
                title="Platform Architecture"
                subtitle="A conceptual overview of the system layers that power the AEGIS platform."
              />
              <div className="space-y-3">
                <ArchitectureLayer
                  icon={Layers}
                  label="Workspace Layer"
                  description="Project-scoped workspace with an interactive IDE, conversational agent, and visual automation builder for defining workflows."
                  accent="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                />
                <ArchitectureLayer
                  icon={Network}
                  label="Orchestration Layer"
                  description="Core backend services that handle deployment, scheduling, trigger evaluation, and action execution coordination."
                  accent="border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400"
                />
                <ArchitectureLayer
                  icon={Database}
                  label="Persistence Layer"
                  description="Durable storage for projects, automations, versions, run history, logs, and user profiles with full data lifecycle support."
                  accent="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400"
                />
                <ArchitectureLayer
                  icon={Cpu}
                  label="Execution Runtime"
                  description="Background execution engine with scheduled polling, trigger evaluation, and action dispatch against live blockchain state."
                  accent="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                />
                <ArchitectureLayer
                  icon={Globe}
                  label="Integration Surface"
                  description="External communication and control channels including Telegram for remote monitoring, command execution, and alert delivery."
                  accent="border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400"
                />
              </div>
            </section>

            {/* ── Section: Integrations ── */}
            <section>
              <SectionHeading
                id="integrations"
                badge="Integrations"
                title="Connected Surfaces"
                subtitle="Extend operational reach beyond the dashboard with integrated communication and control channels."
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <IntegrationCard
                  icon={MessageSquare}
                  name="Telegram Bot"
                  description="Full remote command and control surface. Monitor projects, view logs, manage automations, and receive real-time alerts — all from Telegram."
                  status="live"
                />
                <IntegrationCard
                  icon={Bell}
                  name="Smart Notifications"
                  description="Intelligent alert routing with cooldown management, delivery confirmation, and multi-channel dispatch for automation events."
                  status="live"
                />
                <IntegrationCard
                  icon={Globe}
                  name="Webhook Endpoints"
                  description="Programmable webhook integrations for connecting AEGIS events to external services, dashboards, and operational pipelines."
                  status="coming"
                />
                <IntegrationCard
                  icon={Zap}
                  name="Discord Integration"
                  description="Notification delivery, status reporting, and operational command execution via Discord server channels."
                  status="coming"
                />
              </div>
            </section>

            {/* ── Section: Projects & Automations ── */}
            <section>
              <SectionHeading
                id="projects"
                badge="Data Model"
                title="Projects & Automations"
                subtitle="Understanding the organizational hierarchy that structures automation workflows in AEGIS."
              />
              <div className="th-surface rounded-xl border border-[var(--th-border-strong)] p-6">
                <ConceptRow label="Project" description="The top-level container that groups related automations, configurations, and execution history under a single workspace." />
                <ConceptRow label="Automation" description="A deployable unit of logic with a defined trigger, action sequence, and notification configuration. Belongs to a project." />
                <ConceptRow label="Version" description="Immutable snapshot of an automation's code and configuration at a point in time. Supports rollback and audit." />
                <ConceptRow label="Run" description="A single execution cycle of an automation, capturing trigger evaluation, action results, and timing metadata." />
                <ConceptRow label="Log" description="Granular event stream produced during automation execution. Includes trigger checks, action outcomes, and error traces." />
              </div>
              <div className="mt-4 p-4 rounded-xl th-surface-elevated border border-[var(--th-border-strong)]">
                <p className="text-xs th-text-secondary leading-relaxed">
                  <strong className="th-text">Lifecycle: </strong>
                  Draft → Deploy → Active → Monitor → Pause / Resume → Version Update → Redeploy. Each stage is tracked, versioned, and visible from both the dashboard and remote control surfaces.
                </p>
              </div>
            </section>

            {/* ── Section: Security & Control ── */}
            <section>
              <SectionHeading
                id="security"
                badge="Security"
                title="Security & Control"
                subtitle="How AEGIS maintains operational integrity and scoped access across all platform interactions."
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl border border-[var(--th-border-strong)] th-surface">
                  <Lock className="w-4 h-4 th-text-secondary mb-3" />
                  <h3 className="text-sm font-bold th-text mb-1.5">Wallet-Linked Identity</h3>
                  <p className="text-xs th-text-secondary leading-relaxed">User identity is anchored to wallet address. All operations, projects, and automation ownership are scoped to the authenticated wallet session.</p>
                </div>
                <div className="p-5 rounded-xl border border-[var(--th-border-strong)] th-surface">
                  <Shield className="w-4 h-4 th-text-secondary mb-3" />
                  <h3 className="text-sm font-bold th-text mb-1.5">Scoped Execution</h3>
                  <p className="text-xs th-text-secondary leading-relaxed">Automations execute within defined operational boundaries. Agent wallets isolate transaction capability from the primary connected wallet.</p>
                </div>
                <div className="p-5 rounded-xl border border-[var(--th-border-strong)] th-surface">
                  <Eye className="w-4 h-4 th-text-secondary mb-3" />
                  <h3 className="text-sm font-bold th-text mb-1.5">Full Audit Trail</h3>
                  <p className="text-xs th-text-secondary leading-relaxed">Every run, trigger evaluation, and action result is logged with timestamps. Execution history is preserved and queryable.</p>
                </div>
                <div className="p-5 rounded-xl border border-[var(--th-border-strong)] th-surface">
                  <Network className="w-4 h-4 th-text-secondary mb-3" />
                  <h3 className="text-sm font-bold th-text mb-1.5">Integration Control</h3>
                  <p className="text-xs th-text-secondary leading-relaxed">External integrations are user-initiated and link-verified. Telegram connections use token-based one-time linking with conflict detection.</p>
                </div>
              </div>
            </section>

            {/* ── Section: Monitoring ── */}
            <section>
              <SectionHeading
                id="monitoring"
                badge="Observability"
                title="Monitoring & Visibility"
                subtitle="Comprehensive observability into every layer of automation execution."
              />
              <div className="th-surface rounded-xl border border-[var(--th-border-strong)] overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--th-border-strong)]">
                  {[
                    {
                      icon: Terminal,
                      title: 'Live Logs',
                      desc: 'Real-time event streaming from the execution runtime. View trigger evaluations, action outcomes, and error traces as they happen.',
                    },
                    {
                      icon: BarChart3,
                      title: 'Run History',
                      desc: 'Complete execution history with status tracking, timing data, and result payloads for every automation run cycle.',
                    },
                    {
                      icon: Sparkles,
                      title: 'Health Monitoring',
                      desc: 'Platform-wide system health visibility including worker status, database connectivity, RPC availability, and bot status.',
                    },
                  ].map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="p-6">
                      <Icon className="w-4.5 h-4.5 th-text-secondary mb-3" />
                      <h3 className="text-sm font-bold th-text mb-2">{title}</h3>
                      <p className="text-xs th-text-secondary leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Section: Developer Experience ── */}
            <section>
              <SectionHeading
                id="developer-experience"
                badge="DX"
                title="Developer Experience"
                subtitle="Built for operators who value speed, clarity, and control."
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: 'Conversational Builder', desc: 'Describe your automation in natural language. The agent translates intent into deployable logic.' },
                  { title: 'Integrated Workspace', desc: 'A unified IDE with code editor, terminal, live logs, and deployment controls in a single view.' },
                  { title: 'Remote Control via Telegram', desc: 'Manage your entire automation fleet remotely. Check status, view logs, pause/resume — all from chat.' },
                  { title: 'Dashboard-First Design', desc: 'Projects, automations, wallet state, and execution health — visible at a glance from the landing dashboard.' },
                ].map(({ title, desc }) => (
                  <div key={title} className="p-5 rounded-xl border border-[var(--th-border-strong)] th-surface hover:border-[var(--th-text-tertiary)] transition-all">
                    <h3 className="text-sm font-bold th-text mb-1.5">{title}</h3>
                    <p className="text-xs th-text-secondary leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── CTA ── */}
            <section className="pt-4">
              <div className="relative rounded-2xl border border-[var(--th-border-strong)] th-surface-elevated p-10 text-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.04)_0%,transparent_70%)] pointer-events-none" />
                <div className="relative">
                  <h2 className="text-xl font-extrabold th-text tracking-tight mb-2">Start Building</h2>
                  <p className="text-sm th-text-secondary max-w-md mx-auto mb-6 leading-relaxed">
                    AEGIS is built for operators who need intelligent automation, reliable execution, and full operational visibility — all in one platform.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => navigate('/playground')}
                      className="btn-primary flex items-center gap-2 text-xs h-9 px-6 rounded-lg"
                    >
                      Open Playground <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => navigate('/projects')}
                      className="btn-secondary flex items-center gap-2 text-xs h-9 px-6 rounded-lg"
                    >
                      View Projects
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Footer ── */}
            <footer className="pt-8 pb-4 border-t border-[var(--th-border-strong)]">
              <div className="flex items-center justify-between">
                <p className="text-[10px] th-text-tertiary font-bold tracking-wider uppercase">
                  © 2026 AEGIS · Documentation v1.0
                </p>
                <p className="text-[10px] th-text-tertiary">
                  Built for operators, by operators.
                </p>
              </div>
            </footer>

          </div>
        </div>
      </div>
    </div>
  );
}
