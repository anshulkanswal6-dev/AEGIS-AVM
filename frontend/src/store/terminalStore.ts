import { create } from 'zustand';
import type { TerminalLog } from '../types/terminal';

interface TerminalState {
  logs: TerminalLog[];
  isExpanded: boolean;
  addLog: (log: Omit<TerminalLog, 'id' | 'timestamp'>) => void;
  height: number;
  setHeight: (height: number) => void;
  clearLogs: () => void;
  setLogs: (logs: TerminalLog[]) => void;
  toggleExpanded: () => void;
  setExpanded: (expanded: boolean) => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
  logs: [],
  isExpanded: false,
  height: 256,
  setHeight: (height: number) => set({ height }),
  addLog: (log) =>
    set((state) => ({
      logs: [
        ...state.logs,
        {
          ...log,
          id: Math.random().toString(36).substring(7),
          timestamp: Date.now(),
        },
      ],
      // Auto-expand on new important logs if closed
      isExpanded: log.type !== 'info' ? true : state.isExpanded,
    })),
  clearLogs: () => set({ logs: [] }),
  setLogs: (logs) => set({ logs }),
  toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),
  setExpanded: (expanded: boolean) => set({ isExpanded: expanded }),
}));
