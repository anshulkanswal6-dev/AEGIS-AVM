import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { cn } from '../../lib/utils/cn';
import { useThemeStore } from '../../hooks/useTheme';
import {
  BookOpen, Layers, Cpu, Workflow, Globe, Shield, BarChart3,
  Sparkles, Zap, ChevronRight, ArrowLeft, Code2, Network, Box,
  Sun, Moon, Monitor, ArrowUp
} from 'lucide-react';

const DOC_NAV: { group: string; items: { label: string; to: string; icon: React.ElementType; exact?: boolean }[] }[] = [
  {
    group: 'Getting Started',
    items: [
      { label: 'Overview', to: '/documentation', icon: BookOpen, exact: true },
      { label: 'Architecture', to: '/documentation/architecture', icon: Layers },
    ],
  },
  {
    group: 'Core Systems',
    items: [
      { label: 'Runtime Engine', to: '/documentation/runtime', icon: Cpu },
      { label: 'Automation Lifecycle', to: '/documentation/automations', icon: Workflow },
      { label: 'Trigger Framework', to: '/documentation/triggers', icon: Zap },
    ],
  },
  {
    group: 'Platform',
    items: [
      { label: 'Integrations', to: '/documentation/integrations', icon: Globe },
      { label: 'Security Model', to: '/documentation/security', icon: Shield },
      { label: 'Observability', to: '/documentation/observability', icon: BarChart3 },
    ],
  },
  {
    group: 'Reference',
    items: [
      { label: 'API Surface', to: '/documentation/api', icon: Code2 },
      { label: 'Data Model', to: '/documentation/data-model', icon: Box },
      { label: 'Roadmap', to: '/documentation/roadmap', icon: Sparkles },
    ],
  },
];

export default function DocsLayout() {
  const location = useLocation();
  const { theme, setTheme, resolvedTheme } = useThemeStore();
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen th-bg th-text flex">
      {/* ─── Docs Sidebar ─── */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-[var(--th-border-strong)] th-surface fixed top-0 left-0 bottom-0 z-10 overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-6 pb-4 border-b border-[var(--th-border-strong)]">
          <NavLink to="/documentation" className="flex items-center gap-2.5 group cursor-pointer text-inherit no-underline">
            <div className="w-8 h-8 rounded-lg">
              <img src="/logo.png" alt="" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h2 className="text-xs font-black th-text tracking-tight capitalize group-hover:th-text transition-colors">AEGIS Documentation</h2>
              <p className="text-[9px] th-text-tertiary font-bold tracking-widest uppercase">v1.0.0</p>
            </div>
          </NavLink>
        </div>

        {/* Nav Groups */}
        <nav className="flex-1 px-3 py-6 space-y-6 overflow-y-auto custom-scrollbar">
          <NavLink
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold th-text-tertiary transition-all border border-[var(--th-border-strong)] hover:border-gray-400 hover:th-text cursor-pointer no-underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </NavLink>
        
          {DOC_NAV.map((group) => (
            <div key={group.group}>
              <p className="text-[9px] font-black tracking-[0.2em] uppercase th-text-tertiary mb-3 px-3">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.exact}
                    className={({ isActive }) => cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all group cursor-pointer",
                      isActive
                        ? "th-text th-surface-elevated border border-[var(--th-border-strong)] shadow-sm"
                        : "th-text-secondary hover:th-text hover:th-surface-hover border border-transparent"
                    )}
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className={cn("w-3.5 h-3.5 shrink-0 transition-colors", isActive ? "th-text" : "th-text-tertiary group-hover:th-text")} />
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer with Theme Toggler */}
        <div className="px-4 py-4 border-t border-[var(--th-border-strong)] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black th-text-tertiary tracking-widest pl-1">Theme</span>
            <div className="flex bg-[var(--th-surface-elevated)] p-1 rounded-lg border border-[var(--th-border-strong)] shadow-inner">
              {[
                { value: 'system', icon: Monitor },
                { value: 'light', icon: Sun },
                { value: 'dark', icon: Moon },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value as any)}
                  className={cn(
                    "p-1.5 rounded-md transition-all active:scale-90 cursor-pointer",
                    theme === t.value 
                      ? "bg-blue-950 text-white shadow-lg shadow-blue-950/20 border border-blue-900" 
                      : "th-text-tertiary hover:th-text"
                  )}
                  title={`Mode: ${t.value}`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>

        </div>
      </aside>

      {/* ─── Mobile Nav Bar ─── */}
      <div className="lg:hidden fixed top-0 left-16 right-0 z-40 th-surface border-b border-[var(--th-border-strong)] px-4 py-2 overflow-x-auto custom-scrollbar-hide">
        <div className="flex items-center gap-1 min-w-max">
          {DOC_NAV.flatMap(g => g.items).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) => cn(
                "px-3 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer",
                isActive
                  ? "th-text th-surface-elevated border border-[var(--th-border-strong)]"
                  : "th-text-tertiary hover:th-text"
              )}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>

      {/* ─── Content Area ─── */}
      <div className="flex-1 min-w-0 lg:ml-64">
        <div className="max-w-4xl mx-auto px-8 py-12 lg:py-20 relative">
          <Outlet />

          {/* Return to Top Button */}
          <button
            onClick={scrollToTop}
            className={cn(
              "fixed bottom-8 right-8 z-50 p-2.5 rounded-xl transition-all duration-300 active:scale-95 group cursor-pointer shadow-2xl border",
              resolvedTheme === 'dark' ? "bg-white border-black/10" : "bg-black border-white/10",
              showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
            )}
          >
            {/* Tooltip Cloud */}
            <div className={cn(
              "absolute bottom-full right-0 mb-3 px-3 py-1.5 rounded-lg whitespace-nowrap text-[10px] font-bold tracking-wider",
              "opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 pointer-events-none shadow-xl border",
              resolvedTheme === 'dark' 
                ? "bg-white text-black border-black/5" 
                : "bg-black text-white border-white/5"
            )}>
              Return to Top
              {/* Little arrow below cloud */}
              <div className={cn(
                "absolute top-full right-4 w-2 h-2 rotate-45 -translate-y-1",
                resolvedTheme === 'dark' ? "bg-white" : "bg-black"
              )} />
            </div>

            <div className="relative">
              <ArrowUp className={cn("w-4 h-4 transition-colors relative z-10", resolvedTheme === 'dark' ? "text-black" : "text-white")} />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
