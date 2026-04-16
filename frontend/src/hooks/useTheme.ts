import { create } from 'zustand';

type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  resolvedTheme: 'light' | 'dark';
}

function getSystemPref(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolve(theme: ThemeMode): 'light' | 'dark' {
  return theme === 'system' ? getSystemPref() : theme;
}

function applyTheme(resolved: 'light' | 'dark') {
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  root.style.colorScheme = resolved;
}

function getStored(): ThemeMode {
  try {
    const v = localStorage.getItem('aegis-theme');
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {}
  return 'dark'; // Default to dark
}

const initialTheme = getStored();
const initialResolved = resolve(initialTheme);

// Apply on module load (before first render)
if (typeof document !== 'undefined') {
  applyTheme(initialResolved);
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,
  resolvedTheme: initialResolved,
  setTheme: (theme: ThemeMode) => {
    const resolved = resolve(theme);
    applyTheme(resolved);
    try { localStorage.setItem('aegis-theme', theme); } catch {}
    set({ theme, resolvedTheme: resolved });
  },
}));

// Listen for system preference changes
if (typeof window !== 'undefined') {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => {
    const state = useThemeStore.getState();
    if (state.theme === 'system') {
      const resolved = getSystemPref();
      applyTheme(resolved);
      useThemeStore.setState({ resolvedTheme: resolved });
    }
  });
}
