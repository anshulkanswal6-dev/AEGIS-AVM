import { ChevronRight, ArrowRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils/cn';
import { TerminalBlock, Line, Str, Muted } from './components';

export default function DocsAPI() {
  const navigate = useNavigate();

  return (
    <div className="space-y-14">
      <div>
        <div className="flex items-center gap-1 mb-3">
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize cursor-pointer hover:th-text transition-colors" onClick={() => navigate('/documentation')}>Docs</span>
          <ChevronRight className="w-2 h-2 th-text-tertiary/50" />
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize cursor-pointer hover:th-text transition-colors" onClick={() => navigate('/documentation')}>Reference</span>
          <ChevronRight className="w-2 h-2 th-text-tertiary/50" />
          <span className="text-[9px] font-bold tracking-[0.15em] th-text-tertiary capitalize">API Surface</span>
        </div>
        <h1 className="text-3xl font-black th-text tracking-tight leading-[1.15] mb-4">
          API Surface
        </h1>
        <p className="text-sm th-text-secondary leading-relaxed max-w-2xl mb-8">
          The AEGIS backend exposes a <strong className="th-text">RESTful API surface</strong> for all platform operations. All endpoints return JSON responses and follow consistent error handling, pagination, and parameter validation patterns.
        </p>

        <TerminalBlock title="curl --request GET">
          <Line prompt="$">curl -X GET <Str>"https://api.aegis.system/v1/projects"</Str> \</Line>
          <Line prompt=" ">  -H <Str>"Authorization: Bearer &lt;wallet_session_token&gt;"</Str></Line>
          <Line prompt=" "><Muted># Response (200 OK)</Muted></Line>
          <Line prompt=" ">[</Line>
          <Line prompt=" ">  <Muted>{"{"}</Muted> <Str>"id"</Str>: <Str>"prj_9fb..."</Str>, <Str>"name"</Str>: <Str>"Liquidity Guard"</Str>, <Str>"status"</Str>: <Str>"active"</Str> <Muted>{"}"}</Muted>,</Line>
          <Line prompt=" ">  <Muted>{"{"}</Muted> <Str>"id"</Str>: <Str>"prj_2c1..."</Str>, <Str>"name"</Str>: <Str>"Vault Monitor"</Str>, <Str>"status"</Str>: <Str>"active"</Str> <Muted>{"}"}</Muted></Line>
          <Line prompt=" ">]</Line>
        </TerminalBlock>
      </div>

      {/* API Overview */}
      <div className="th-surface rounded-xl border border-[var(--th-border-strong)] p-6 space-y-4">
        <h2 className="text-sm font-bold th-text capitalize tracking-wider">API Design Principles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { label: 'Protocol', value: 'REST over HTTPS' },
            { label: 'Format', value: 'JSON request/response' },
            { label: 'Auth', value: 'Wallet-derived session tokens' },
            { label: 'Framework', value: 'FastAPI with Pydantic validation' },
            { label: 'CORS', value: 'Configurable origin whitelist' },
            { label: 'Error Model', value: 'Structured error responses with codes' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between p-3 rounded-lg th-surface-elevated border border-[var(--th-border-strong)]">
              <span className="text-[10px] font-black th-text-tertiary capitalize tracking-wider">{label}</span>
              <span className="text-[11px] font-semibold th-text">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Endpoint Groups */}
      <div>
        <h2 className="text-lg font-extrabold th-text tracking-tight mb-6">Endpoint Groups</h2>
        <div className="space-y-6">
          {[
            {
              group: 'Agent & Conversation',
              base: '/api/agent',
              endpoints: [
                { method: 'POST', path: '/chat', desc: 'Submit a user message to the AEGIS agent for conversational processing. Returns agent response with updated workspace state.' },
                { method: 'POST', path: '/deploy', desc: 'Deploy the current workspace specification as an active automation. Triggers the full deployment pipeline.' },
                { method: 'GET', path: '/session/:id', desc: 'Retrieve the current agent session state, including conversation history and generated artifacts.' },
              ],
            },
            {
              group: 'Project Management',
              base: '/api/projects',
              endpoints: [
                { method: 'GET', path: '/', desc: 'List all projects for the authenticated wallet address. Supports pagination and status filtering.' },
                { method: 'GET', path: '/:id', desc: 'Retrieve detailed project information including associated automations, status, and metadata.' },
                { method: 'DELETE', path: '/:id', desc: 'Delete a project and cascade-delete all associated automations, versions, runs, and logs.' },
              ],
            },
            {
              group: 'Automation Control',
              base: '/api/automations',
              endpoints: [
                { method: 'GET', path: '/', desc: 'List all automations with optional status and project_id filtering. Returns full automation records with execution metadata.' },
                { method: 'GET', path: '/:id', desc: 'Retrieve a single automation with complete specification, status, metrics, and recent log entries.' },
                { method: 'POST', path: '/:id/pause', desc: 'Pause an active automation. Preserves state and scheduler registration but skips evaluation cycles.' },
                { method: 'POST', path: '/:id/resume', desc: 'Resume a paused automation. Restarts evaluation cycles from the next scheduled interval.' },
                { method: 'DELETE', path: '/:id', desc: 'Permanently delete an automation. Removes scheduler job, run history, logs, and version artifacts.' },
              ],
            },
            {
              group: 'Execution & Logs',
              base: '/api',
              endpoints: [
                { method: 'GET', path: '/runs/:automationId', desc: 'Retrieve paginated run history for an automation. Each run includes status, timing, trigger payload, and result.' },
                { method: 'GET', path: '/logs/:projectId', desc: 'Retrieve structured terminal logs for a project. Supports timestamp-based filtering and cleared-log exclusion.' },
                { method: 'POST', path: '/logs/:projectId/clear', desc: 'Soft-delete visible logs by setting cleared_at timestamp. Logs remain in the database for audit purposes.' },
              ],
            },
            {
              group: 'Wallet & On-Chain',
              base: '/api/wallet',
              endpoints: [
                { method: 'GET', path: '/agent/:address', desc: 'Resolve the Agent Wallet address for a given owner address via the Factory smart contract.' },
                { method: 'GET', path: '/balance/:address', desc: 'Query native token balance for any address via Web3 RPC. Returns raw wei value and formatted ether amount.' },
                { method: 'POST', path: '/deposit', desc: 'Initiate a deposit transaction to the Agent Wallet. Constructs and returns the transaction parameters for client-side signing.' },
              ],
            },
            {
              group: 'Integrations',
              base: '/api/integrations',
              endpoints: [
                { method: 'GET', path: '/telegram/status', desc: 'Check the linking status of the authenticated user\'s Telegram account. Returns linked/unlinked with chat metadata.' },
                { method: 'POST', path: '/telegram/generate-token', desc: 'Generate a one-time linking token for Telegram account connection. Token is valid for a single /start command.' },
                { method: 'POST', path: '/telegram/test', desc: 'Send a test notification to the linked Telegram chat to verify integration health and delivery capability.' },
              ],
            },
          ].map(({ group, base, endpoints }) => (
            <div key={group} className="rounded-xl border border-[var(--th-border-strong)] overflow-hidden th-surface">
              <div className="px-6 py-3 border-b border-[var(--th-border-strong)] th-surface-elevated">
                <h3 className="text-xs font-bold th-text capitalize tracking-wider">{group}</h3>
                <code className="text-[10px] th-text-tertiary font-mono">{base}</code>
              </div>
              <div className="divide-y divide-[var(--th-border-strong)]">
                {endpoints.map(({ method, path, desc }) => (
                  <div key={`${method}-${path}`} className="px-6 py-3 flex items-start gap-3">
                    <span className={cn(
                      "text-[9px] font-black tracking-wider px-2 py-0.5 rounded-md border shrink-0 mt-0.5",
                      method === 'GET' ? 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950'
                        : method === 'POST' ? 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950'
                        : 'text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950'
                    )}>{method}</span>
                    <div>
                      <code className="text-[11px] font-bold th-text">{path}</code>
                      <p className="text-[11px] th-text-secondary leading-relaxed mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error Model */}
      <div className="th-surface-elevated rounded-xl border border-[var(--th-border-strong)] p-6">
        <h2 className="text-sm font-bold th-text mb-3 capitalize tracking-wider">Error Response Model</h2>
        <p className="text-xs th-text-secondary leading-relaxed mb-3">
          All error responses follow a consistent structure with HTTP status codes, machine-readable error codes, and human-readable messages. FastAPI's built-in validation returns 422 for malformed requests with per-field error details.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { code: '400', label: 'Bad Request' },
            { code: '404', label: 'Not Found' },
            { code: '422', label: 'Validation Error' },
            { code: '500', label: 'Internal Error' },
          ].map(({ code, label }) => (
            <div key={code} className="text-center p-3 rounded-lg th-surface border border-[var(--th-border-strong)]">
              <p className="text-sm font-mono font-bold th-text mb-0.5">{code}</p>
              <p className="text-[10px] th-text-tertiary">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={() => navigate('/documentation/observability')} className="btn-secondary flex items-center gap-2 text-xs h-9 px-5 rounded-lg">
          <ArrowLeft className="w-3.5 h-3.5" /> Observability
        </button>
        <button onClick={() => navigate('/documentation/data-model')} className="btn-secondary flex items-center gap-2 text-xs h-9 px-5 rounded-lg">
          Next: Data Model <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
