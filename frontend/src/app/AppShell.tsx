import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { TerminalDrawer } from '../components/terminal/TerminalDrawer';
import { Sidebar } from '../components/layout/Sidebar';
import { PageContainer } from '../components/layout/LayoutPack';
import { cn } from '../lib/utils/cn';
import { useEffect } from 'react';
import { useAlgorand } from '../components/AlgorandProvider';
import { agentService } from '../services/agentService';
import { useTerminalStore } from '../store/terminalStore';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const { address, isLoggedIn, isConnected } = useAlgorand();
  const setLogs = useTerminalStore(s => s.setLogs);
  const isPlayground = location.pathname.startsWith('/playground');
  const isDocs = location.pathname.startsWith('/documentation');
  const isMarketing = location.pathname === '/';

  // Unified Activity Poller
  useEffect(() => {
    if (!address || !isLoggedIn || !isConnected || isMarketing) return;

    let mounted = true;
    const pollActivity = async () => {
      try {
        const data = await agentService.getAllActivity(address);
        if (mounted && data.logs) {
          // Convert RunLogEntry to TerminalLog structure
          const formattedLogs = data.logs.map((l: any) => {
             const txHash = l.details?.txId || l.details?.tx_hash || l.details?.txID;
             const explorerUrl = txHash ? `https://testnet.algoexplorer.io/tx/${txHash}` : undefined;
             
             // Smart Icon Mapping
             let logType = l.level === 'error' ? 'error' : (l.level === 'warn' ? 'warning' : (l.level === 'success' ? 'success' : 'info'));
             if (l.event === 'deposit' || l.event === 'withdraw' || l.event === 'create') logType = 'wallet';
             if (explorerUrl) logType = 'explorer';

             return {
                id: l.id,
                type: logType as any,
                message: l.message,
                timestamp: new Date(l.timestamp).getTime(),
                txHash: txHash,
                explorerUrl: explorerUrl
             };
          });
          setLogs(formattedLogs);
        }
      } catch (err) {
        console.warn("[AppShell] Activity poll error:", err);
      }
    };

    pollActivity(); // Initial fetch
    const interval = setInterval(pollActivity, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [address, isLoggedIn, isConnected, setLogs, isMarketing]);

  if (isMarketing) {
    return (
      <div className="min-h-screen bg-black text-white selection:bg-[#aef98e]/30 overflow-x-hidden">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen th-bg th-text font-sans flex overflow-x-hidden theme-transition">
      {/* Sidebar Navigation — hidden on docs (docs has its own sidebar) */}
      {!isDocs && <Sidebar />}

      {/* Main App Workspace */}
      {isDocs ? (
        <main className="flex-1 relative z-10 min-w-0">
          {children}
        </main>
      ) : (
        <PageContainer>
          <main className={cn("flex-1 relative z-10", !isPlayground && "pb-24")}>
            {children}
          </main>
        </PageContainer>
      )}

      {/* Global Terminal Console - Hidden on Playground and Docs */}
      {!isPlayground && !isDocs && <TerminalDrawer />}
      
      {/* Aesthetic Background Grain/Glow */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,0,0,0.01)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.01)_0%,transparent_50%)] pointer-events-none z-0" />
    </div>
  );
}
