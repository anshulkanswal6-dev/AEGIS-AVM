import { create } from 'zustand';

interface LayoutState {
  isSidebarCollapsed: boolean;
  isChatCollapsed: boolean;
  isTerminalCollapsed: boolean;
  terminalHeight: number;
  toggleSidebar: () => void;
  toggleChat: () => void;
  toggleTerminal: () => void;
  setTerminalHeight: (height: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setChatCollapsed: (collapsed: boolean) => void;
  setTerminalCollapsed: (collapsed: boolean) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  isSidebarCollapsed: false,
  isChatCollapsed: false,
  isTerminalCollapsed: false,
  terminalHeight: 240,
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  toggleChat: () => set((state) => ({ isChatCollapsed: !state.isChatCollapsed })),
  toggleTerminal: () => set((state) => ({ isTerminalCollapsed: !state.isTerminalCollapsed })),
  setTerminalHeight: (terminalHeight) => set({ terminalHeight }),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  setChatCollapsed: (collapsed) => set({ isChatCollapsed: collapsed }),
  setTerminalCollapsed: (collapsed) => set({ isTerminalCollapsed: collapsed }),
}));
