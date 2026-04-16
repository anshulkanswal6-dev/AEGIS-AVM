import React from 'react';
import { cn } from '../../lib/utils/cn';
import { Loader2, Monitor, Sun, MoonStar } from 'lucide-react';
import { useThemeStore } from '../../hooks/useTheme';

// --- BUTTON PRIMITIVE ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  icon?: React.ElementType;
}

export function Button({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  icon: Icon,
  children, 
  ...props 
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center gap-2 font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer";
  
  const variants = {
    primary: "bg-blue-950 text-white hover:bg-blue-900 shadow-lg shadow-blue-950/20 border border-blue-950",
    secondary: "th-surface border th-border hover:th-surface-hover shadow-sm th-text",
    outline: "bg-transparent border th-border th-text-secondary hover:th-text hover:border-current",
    ghost: "bg-transparent th-text-tertiary hover:th-text hover:th-surface-hover",
    danger: "bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-500 hover:text-white dark:bg-rose-500/10 dark:border-rose-500/20",
    white: "th-surface th-text border th-border hover:shadow-md"
  };

  const sizes = {
    sm: "h-8 px-3 text-[9px] rounded-lg",
    md: "h-11 px-5 text-[10px] rounded-xl",
    lg: "h-13 px-7 text-[11px] rounded-2xl",
    xl: "h-15 px-9 text-[12px] rounded-2xl"
  };

  return (
    <button className={cn(baseStyles, variants[variant], sizes[size], className)} disabled={isLoading || props.disabled} {...props}>
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4" />}
          {children}
        </>
      )}
    </button>
  );
}

// --- CARD PRIMITIVE ---
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass';
}

export function Card({ className, variant = 'default', ...props }: CardProps) {
  const baseStyles = "rounded-2xl transition-all duration-300";
  const variants = {
    default: "th-surface border th-border shadow-sm",
    elevated: "th-surface border th-border shadow-xl hover:shadow-2xl hover:translate-y-[-2px]",
    glass: "glass shadow-lg"
  };

  return <div className={cn(baseStyles, variants[variant], className)} {...props} />;
}

// --- BADGE PRIMITIVE ---
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'premium';
  className?: string;
}

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  const baseStyles = "inline-flex items-center px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-all shadow-sm";
  const variants = {
    success: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    warning: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    error: "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
    info: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    neutral: "bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
    premium: "bg-blue-950 text-white border-blue-950"
  };

  return (
    <div className={cn(baseStyles, variants[variant], className)}>
      {children}
    </div>
  );
}


// --- THEME TOGGLE PRIMITIVE ---
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useThemeStore();
  
  return (
    <div className={cn("flex items-center gap-1 p-1 rounded-xl border th-border", "bg-[var(--th-surface-low)]", className)}>
      <button 
        onClick={() => setTheme('system')}
        title="System"
        className={cn("p-1.5 rounded-lg transition-all", theme === 'system' ? "bg-blue-950 text-white shadow-lg" : "th-text-tertiary hover:th-text")}
      >
        <Monitor className="w-3.5 h-3.5" />
      </button>
      <button 
        onClick={() => setTheme('light')}
        title="Light"
        className={cn("p-1.5 rounded-lg transition-all", theme === 'light' ? "bg-blue-950 text-white shadow-lg" : "th-text-tertiary hover:th-text")}
      >
        <Sun className="w-3.5 h-3.5" />
      </button>
      <button 
        onClick={() => setTheme('dark')}
        title="Dark"
        className={cn("p-1.5 rounded-lg transition-all", theme === 'dark' ? "bg-blue-950 text-white shadow-lg" : "th-text-tertiary hover:th-text")}
      >
        <MoonStar className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
