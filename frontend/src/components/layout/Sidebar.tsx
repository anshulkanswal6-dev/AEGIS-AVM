import { NavLink } from 'react-router-dom';
import { Wallet, LayoutGrid, Play, ChevronRight, ChevronLeft, HelpCircle, LogOut, HomeIcon, Sun, Moon, Monitor, Puzzle, BookOpen, Store } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import { useLayoutStore } from '../../store/layoutStore';
import { useThemeStore } from '../../hooks/useTheme';
import logoPng from '../../assets/Copy of AEGIS (640 x 640 px) (1).png';

const NAV_ITEMS = [
  { label: 'Home', to: '/', icon: HomeIcon },
  { label: 'Network Wallet', to: '/wallet', icon: Wallet },
  { label: 'Playground', to: '/playground', icon: Play },
  { label: 'Projects', to: '/projects', icon: LayoutGrid },
  { label: 'Integrations', to: '/integrations', icon: Puzzle },
];

import { useAlgorand } from '../../components/AlgorandProvider';

export function Sidebar() {
  const { isSidebarCollapsed, toggleSidebar } = useLayoutStore();
  const { isConnected, disconnect, connect } = useAlgorand();
  const { theme, setTheme } = useThemeStore();

  const toggleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <aside className={cn(
      "fixed left-0 top-0 bottom-0 th-surface border-r border-[var(--th-border-strong)] z-50 flex flex-col transition-all duration-300 ease-in-out shadow-sm",
      isSidebarCollapsed ? "w-16" : "w-64"
    )}>
      {/* Brand Section */}
      <div className={cn(
        "h-16 flex items-center border-b border-[var(--th-border-strong)] transition-all",
        isSidebarCollapsed ? "justify-center" : "px-6 gap-3"
      )}>
        <img 
          src={logoPng} 
          alt="AEGIS Logo" 
          className="w-10 h-10 rounded-lg shrink-0 cursor-pointer shadow-sm active:scale-95 transition-transform"
          onClick={() => window.location.href = '/'}
        />
        {!isSidebarCollapsed && (
          <div className="overflow-hidden whitespace-nowrap">
            <h1 className="font-black text-base tracking-tighter th-text leading-tight uppercase italic text-orange-600">AEGIS AI</h1>
            <p className="text-[10px] th-text-tertiary font-bold tracking-widest">Prompt to Onchain Jobs</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              "flex items-center rounded-md transition-all h-10 overflow-hidden group outline-none focus:outline-none",
              isActive 
                ? "th-surface-elevated th-text border border-[var(--th-border-strong)] shadow-sm" 
                : "th-text-secondary hover:th-text hover:th-surface-hover border border-transparent"
            )}
          >
            {({ isActive }) => (
              <div className={cn("flex items-center h-full w-full", isSidebarCollapsed ? "justify-center" : "px-3")}>
                <item.icon className={cn("w-4.5 h-4.5 shrink-0 transition-colors", isActive ? "th-text" : "th-text-tertiary group-hover:th-text")} />
                {!isSidebarCollapsed && (
                  <span className="ml-3 font-medium text-[13px]">{item.label}</span>
                )}
                {isActive && !isSidebarCollapsed && (
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 ml-auto" />
                )}
              </div>
            )}
          </NavLink>
        ))}

        {/* Marketplace — Coming Soon */}
        <div 
          className={cn(
            "flex items-center rounded-md transition-all h-10 overflow-hidden group outline-none focus:outline-none th-text-secondary cursor-not-allowed border border-transparent"
          )}
        >
          <div className={cn("flex items-center h-full w-full", isSidebarCollapsed ? "justify-center" : "px-3")}>
            <Store className="w-4.5 h-4.5 opacity-70 shrink-0 transition-colors" />
            {!isSidebarCollapsed && (
              <>
                <span className="ml-3 font-medium text-[13px]">Marketplace</span>
                <div className="ml-auto flex items-center h-full">
                  <span className="text-[7px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-600 border border-orange-500/40 whitespace-nowrap scale-90">
                    Coming Soon
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Documentation — opens in new tab */}
        <a
          href="/documentation"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center rounded-md transition-all h-10 overflow-hidden group outline-none focus:outline-none th-text-secondary hover:th-text hover:th-surface-hover border border-transparent"
          )}
        >
          <div className={cn("flex items-center h-full w-full", isSidebarCollapsed ? "justify-center" : "px-3.5")}>
            <BookOpen className="w-4.5 h-4.5 shrink-0 transition-colors th-text-tertiary group-hover:th-text" />
            {!isSidebarCollapsed && (
              <span className="ml-3 font-medium text-[13px]">Documentation</span>
            )}
          </div>
        </a>
      </nav>

      <div className="px-3 py-4 border-t border-[var(--th-border-strong)] space-y-1">
        <button 
          onClick={toggleTheme}
          className={cn(
            "w-full flex items-center h-10 rounded-md th-text-secondary hover:th-text hover:th-surface-hover transition-all group outline-none focus:outline-none",
            isSidebarCollapsed ? "justify-center" : "px-3"
          )}
          title={`Active Theme: ${theme}`}
        >
          <ThemeIcon className="w-4.5 h-4.5 th-text-tertiary group-hover:th-text transition-colors" />
          {!isSidebarCollapsed && (
            <div className="ml-3 flex items-center justify-between flex-1">
              <span className="font-medium text-[13px]">Theme</span>
              <span className="text-[10px] th-text-tertiary font-bold capitalize tracking-tighter bg-[var(--th-surface-elevated)] px-1.5 py-0.5 rounded-sm border border-[var(--th-border-strong)]">{theme}</span>
            </div>
          )}
        </button>
        <button className={cn(
          "w-full flex items-center h-10 rounded-md th-text-secondary hover:th-text hover:th-surface-hover transition-all group outline-none focus:outline-none",
          isSidebarCollapsed ? "justify-center" : "px-3"
        )}>
          <HelpCircle className="w-4.5 h-4.5 th-text-tertiary group-hover:th-text transition-colors" />
          {!isSidebarCollapsed && <span className="ml-3 font-medium text-[13px]">Help Center</span>}
        </button>

        {isConnected ? (
          <button 
            onClick={() => disconnect()}
            className={cn(
              "w-full flex items-center h-10 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all group outline-none focus:outline-none",
              isSidebarCollapsed ? "justify-center" : "px-3"
            )}
          >
            <LogOut className="w-4.5 h-4.5 text-rose-400 group-hover:text-rose-600 transition-colors" />
            {!isSidebarCollapsed && <span className="ml-3 font-bold text-[13px]">Logout</span>}
          </button>
        ) : (
          <button 
            onClick={() => connect()}
            className={cn(
              "w-full flex items-center h-10 rounded-md th-text hover:th-surface-hover transition-all group border border-dashed border-[var(--th-border-strong)] outline-none focus:outline-none",
              isSidebarCollapsed ? "justify-center" : "px-3"
            )}
          >
            <Wallet className="w-4.5 h-4.5 th-text-tertiary group-hover:th-text transition-colors" />
            {!isSidebarCollapsed && <span className="ml-3 font-bold text-[13px]">Connect</span>}
          </button>
        )}
        
        <button 
          onClick={toggleSidebar}
          className={cn(
            "w-full h-10 rounded-md flex items-center th-text-tertiary hover:th-text hover:th-surface-hover transition-all group outline-none focus:outline-none",
            isSidebarCollapsed ? "justify-center" : "px-3"
          )}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4.5 h-4.5" /> : <ChevronLeft className="w-4.5 h-4.5" />}
          {!isSidebarCollapsed && <span className="ml-3 font-medium text-[13px]">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

