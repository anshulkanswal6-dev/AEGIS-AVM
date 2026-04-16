import { ChevronRight, ArrowRight, ArrowLeft, MessageSquare, Bell, Globe, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils/cn';
import { TerminalBlock, Line, Str, Fn, Keyword, Muted, Success } from './components';

export default function DocsIntegrations() {
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
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize">Integrations</span>
        </div>
        <h1 className="text-3xl font-black th-text tracking-tight leading-[1.15] mb-4">
          Integration Layer
        </h1>
        <p className="text-sm th-text-secondary leading-relaxed max-w-2xl mb-8">
          The AEGIS integration layer extends platform reach beyond the dashboard, providing <strong className="th-text">multi-surface operational control</strong>, <strong className="th-text">intelligent notification routing</strong>, and <strong className="th-text">bidirectional communication</strong> with external channels.
        </p>
      </div>

        <TerminalBlock title="telegram --user-interaction">
          <Line prompt="User: ">/projects</Line>
          <Line prompt="Bot: ">Listing active projects for 0x...81f:</Line>
          <Line prompt=" ">  1. <Str>"Liquidity Guard"</Str> (<Success>ACTIVE</Success>)</Line>
          <Line prompt=" ">  2. <Str>"Vault Monitor"</Str> (<Success>ACTIVE</Success>)</Line>
          <Line prompt="User: ">/status 1</Line>
          <Line prompt="Bot: "><Keyword>Project: Liquidity Guard</Keyword></Line>
          <Line prompt=" ">  Status: <Success>RUNNING</Success></Line>
          <Line prompt=" ">  Worker ID: <Muted>worker_71a...92</Muted></Line>
          <Line prompt=" ">  Last Evaulation: <Muted>20s ago</Muted></Line>
          <Line prompt=" ">  Next Run: <Muted>in 10s</Muted></Line>
        </TerminalBlock>

      {/* Telegram Deep Dive */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Telegram Integration</h2>
        <div className="th-surface rounded-xl border border-[var(--th-border-strong)] p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold th-text">Telegram Bot — Full Remote Control Surface</h3>
              <span className="text-[9px] font-black tracking-[0.15em] capitalize text-emerald-600 dark:text-emerald-400">Live · Production</span>
            </div>
          </div>
          <p className="text-sm th-text-secondary leading-relaxed">
            The Telegram integration provides a <strong className="th-text">complete remote operational interface</strong> to the AEGIS platform. Users can query project status, view execution logs, manage automation lifecycle, check wallet balances, and receive real-time alerts — all from a Telegram conversation.
          </p>
        </div>
      </div>

      {/* Telegram Architecture */}
      <div>
        <h3 className="text-base font-extrabold th-text tracking-tight mb-4">Telegram Architecture</h3>
        <div className="space-y-3">
          {[
            { component: 'Long-Polling Poller', desc: 'Daemon thread that continuously polls the Telegram Bot API via getUpdates with 30-second long-polling timeout. Processes incoming messages and dispatches to the appropriate handler. Includes automatic webhook cleanup to prevent conflict with existing webhook configurations.' },
            { component: 'Command Router', desc: 'Stateless command dispatcher that parses incoming messages, extracts command names and arguments, resolves user identity from chat_id, and routes to the appropriate handler function. Supports bot-suffixed commands (@bot suffix stripping) and argument sanitization.' },
            { component: 'Account Linking', desc: 'Token-based one-time linking flow. Users generate a unique linking token from the web dashboard, send it to the bot via /start, and the system creates a verified mapping between telegram_user_id, chat_id, and platform user_id. Includes conflict detection for already-linked accounts.' },
            { component: 'Notification Adapter', desc: 'Outbound notification delivery system that routes automation alerts to linked Telegram chats. Implements per-user notification cooldown to prevent alert fatigue, delivery confirmation logging, and graceful handling of unreachable chats.' },
          ].map(({ component, desc }) => (
            <div key={component} className="p-4 rounded-xl border border-[var(--th-border-strong)] th-surface">
              <h4 className="text-xs font-bold th-text mb-1">{component}</h4>
              <p className="text-[11px] th-text-secondary leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Command Categories */}
      <div>
        <h3 className="text-base font-extrabold th-text tracking-tight mb-4">Command Surface</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              category: 'Information',
              commands: ['/projects', '/deployed', '/automation', '/status', '/logs', '/runs', '/next'],
              desc: 'Read-only queries against platform state. Project listings, automation details, execution logs, run history, and scheduled execution timestamps.',
            },
            {
              category: 'Wallet',
              commands: ['/wallet', '/agentwallet', '/balance'],
              desc: 'Wallet state queries with live on-chain balance fetching via Web3 RPC. Separate commands for connected Metamask wallet and Agent Wallet with blockchain contract lookup.',
            },
            {
              category: 'Control',
              commands: ['/pause', '/resume', '/delete'],
              desc: 'Automation lifecycle management commands with confirmation flows. /delete implements a two-step confirmation with expiring state to prevent accidental data loss.',
            },
            {
              category: 'System',
              commands: ['/health', '/test_telegram', '/unlink'],
              desc: 'Platform diagnostics including worker status, database connectivity, RPC availability, and bot health. Integration management for account linking and delivery testing.',
            },
          ].map(({ category, commands, desc }) => (
            <div key={category} className="p-5 rounded-xl border border-[var(--th-border-strong)] th-surface">
              <h4 className="text-xs font-bold th-text mb-1 capitalize tracking-wider">{category}</h4>
              <p className="text-[11px] th-text-secondary leading-relaxed mb-2">{desc}</p>
              <div className="flex flex-wrap gap-1">
                {commands.map((c) => (
                  <code key={c} className="text-[10px] font-mono th-text-tertiary px-1.5 py-0.5 rounded-md border border-[var(--th-border-strong)] th-surface-elevated">{c}</code>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notification System */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Notification System</h2>
        <div className="th-surface rounded-xl border border-[var(--th-border-strong)] p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold th-text">Smart Notification Pipeline</h3>
              <span className="text-[9px] font-black tracking-[0.15em] capitalize text-emerald-600 dark:text-emerald-400">Active</span>
            </div>
          </div>
          <p className="text-sm th-text-secondary leading-relaxed">
            The notification pipeline is designed for <strong className="th-text">intelligent, non-intrusive alert delivery</strong>. It implements per-user cooldown windows, channel-specific delivery adapters, structured message formatting, and delivery confirmation tracking.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: 'Cooldown', value: 'Per-user time-windowed suppression' },
              { label: 'Delivery', value: 'Confirmed with status logging' },
              { label: 'Routing', value: 'Multi-channel with fallback' },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-lg th-surface-elevated border border-[var(--th-border-strong)]">
                <p className="text-[9px] font-black th-text-tertiary capitalize tracking-[0.2em] mb-1">{label}</p>
                <p className="text-[11px] font-semibold th-text">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Future Integrations */}
     

      <div className="flex justify-between">
        <button onClick={() => navigate('/documentation/triggers')} className="btn-secondary flex items-center gap-2 text-xs h-9 px-5 rounded-lg">
          <ArrowLeft className="w-3.5 h-3.5" /> Trigger Framework
        </button>
        <button onClick={() => navigate('/documentation/security')} className="btn-secondary flex items-center gap-2 text-xs h-9 px-5 rounded-lg">
          Next: Security Model <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

}
