export interface Project {
  id: string;
  name: string;
  prompt: string;
  status: 'draft' | 'ready' | 'active' | 'error';
  chain: 'ALGO' | 'Algorand' | 'Ethereum' | 'Base' | 'BNB';
  lastUpdated: string;
  trigger: string;
  actions: string[];
  spec: string;
  code: string;
}

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Yield Optimizer Alpha',
    prompt: 'Check for high yield opportunities on DEXes daily and move funds if yield increases by 2%.',
    status: 'active',
    chain: 'ALGO',
    lastUpdated: '2026-03-20T10:00:00Z',
    trigger: 'Daily Check (Every 24h)',
    actions: ['Fetch Algorand APR', 'Compare with current storage', 'Execute Swap'],
    spec: `{
  "trigger": "cron:daily",
  "conditions": [
    { "type": "threshold", "value": "2%" }
  ],
  "actions": ["swap:yield"]
}`,
    code: `// Yield Optimizer Alpha
import agent from "@onchain-agent/sdk";

export default async function run(ctx) {
  const yields = await agent.dex.getYields("Pact");
  if (yields.alpha > 0.05) {
    await agent.wallet.swap("ALGO", "USDC", ctx.balance);
  }
}`
  },
  {
    id: 'proj-2',
    name: 'Stop-Loss Sentry',
    prompt: 'Monitor ETH price. If it drops below $2500, swap all USDC to WBTC.',
    status: 'ready',
    chain: 'Ethereum',
    lastUpdated: '2026-03-19T15:20:00Z',
    trigger: 'Price Feed Change',
    actions: ['Monitor ETH/USDC', 'Check Threshold', 'Approve WBTC'],
    spec: `{
  "trigger": "price:eth-usdc",
  "conditions": [{ "type": "below", "value": 2500 }],
  "actions": ["swap:all"]
}`,
    code: `// Stop-Loss Sentry
async function monitor(price) {
  if (price < 2500) {
    await wallet.executeSwap("USDC", "WBTC");
  }
}`
  },
  {
    id: 'proj-3',
    name: 'Uniswap v3 Rebalancer',
    prompt: 'Keep my liquidity position centered within 5% of current price.',
    status: 'draft',
    chain: 'Base',
    lastUpdated: '2026-03-18T09:45:00Z',
    trigger: 'Block confirmed',
    actions: ['Check position tick', 'Calculate rebalance', 'Remove & Add Liquidity'],
    spec: `{ "trigger": "block:finalized", "logic": "uniswap-v3-rebalance" }`,
    code: `// Drafting rebalancer...`
  }
];
