import { useAlgorand } from '../AlgorandProvider';
import { LogOut, Settings, Github, MessageSquare, HelpCircle, ChevronRight, Globe, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils/cn';
import { formatAddress } from '../../lib/utils/format';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../ui/UIPack';

export function ProfileMenu() {
  const { address, isConnected, disconnect } = useAlgorand();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isConnected) return null;

  return (
    <div className="relative z-50" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 p-1 rounded-full hover:th-surface-hover transition-all active:scale-95 group",
          isOpen && "th-surface-hover"
        )}
      >
        <div className="w-8 h-8 rounded-full th-surface-elevated border border-[var(--th-border-strong)] flex items-center justify-center overflow-hidden">
           <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`} alt="Avatar" className="w-full h-full object-cover" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-4 w-64 th-surface-elevated border border-[var(--th-border-strong)] rounded-xl shadow-[var(--th-shadow-xl)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Account Header */}
          <div className="p-4 border-b border-[var(--th-border-strong)]">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full th-surface-elevated flex items-center justify-center th-text border border-[var(--th-border-strong)]">
                   <User className="w-5 h-5 th-text-tertiary" />
                </div>
                <div className="flex flex-col min-w-0">
                   <span className="text-xs font-bold th-text truncate">{formatAddress(address!)}</span>
                   <span className="text-[10px] th-text-tertiary font-medium">Owner Account</span>
                </div>
             </div>
          </div>

          {/* Menu Sections */}
          <div className="py-2">
             <div className="px-3 py-1 text-[10px] font-bold th-text-tertiary uppercase tracking-wider">Account</div>
             <button 
                onClick={() => { navigate('/wallet'); setIsOpen(false); }}
                className="w-full flex items-center px-4 py-2 hover:th-surface-hover text-xs font-medium th-text transition-colors"
             >
                <Settings className="w-4 h-4 mr-3 th-text-tertiary" />
                Account Settings
                <ChevronRight className="w-3 h-3 ml-auto th-text-tertiary" />
             </button>
             <button className="w-full flex items-center px-4 py-2 hover:th-surface-hover text-xs font-medium th-text transition-colors">
                <Globe className="w-4 h-4 mr-3 th-text-tertiary" />
                Language
                <span className="ml-auto text-[10px] th-text-tertiary">EN</span>
             </button>
          </div>

          {/* Theme Toggle */}
          <div className="px-4 py-3 border-t border-[var(--th-border-strong)] flex items-center justify-between">
            <span className="text-[10px] font-bold th-text-tertiary uppercase tracking-widest">Theme</span>
            <ThemeToggle />
          </div>

          <div className="py-2 border-t border-[var(--th-border-strong)]">
             <div className="px-3 py-1 text-[10px] font-bold th-text-tertiary uppercase tracking-wider">Platform</div>
             <a href="https://github.com/ansbulkanswal6-dev" target="_blank" rel="noopener noreferrer" className="w-full flex items-center px-4 py-2 hover:th-surface-hover text-xs font-medium th-text transition-colors">
                <Github className="w-4 h-4 mr-3 th-text-tertiary" />
                GitHub Repositories
             </a>
             <button className="w-full flex items-center px-4 py-2 hover:th-surface-hover text-xs font-medium th-text transition-colors">
                <MessageSquare className="w-4 h-4 mr-3 th-text-tertiary" />
                Join Community
             </button>
             <button className="w-full flex items-center px-4 py-2 hover:th-surface-hover text-xs font-medium th-text transition-colors">
                <HelpCircle className="w-4 h-4 mr-3 th-text-tertiary" />
                Help Center
             </button>
          </div>

          <div className="mt-2 border-t border-[var(--th-border-strong)]">
             <button 
               onClick={() => { disconnect(); setIsOpen(false); }}
               className="w-full flex items-center px-4 py-3 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-xs font-bold text-rose-500 transition-colors"
             >
                <LogOut className="w-4 h-4 mr-3" />
                Logout
             </button>
          </div>
        </div>
      )}
    </div>
  );
}

