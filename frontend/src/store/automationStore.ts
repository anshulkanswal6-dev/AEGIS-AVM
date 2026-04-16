import { create } from 'zustand';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8002'}/automations`;

export interface DeployedAutomation {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'failed' | 'ready_for_deploy';
  spec_json: any;
  created_at: string;
  updated_at: string;
  last_run_at: string | null;
  next_run_at: string | null;
  run_count: number;
  error_count: number;
  last_error: string | null;
  files: Record<string, string>;
}

interface AutomationState {
  automations: DeployedAutomation[];
  isLoading: boolean;
  error: string | null;
  fetchAutomations: (wallet?: string) => Promise<void>;
  pauseAutomation: (id: string) => Promise<void>;
  resumeAutomation: (id: string) => Promise<void>;
  updateAutomation: (id: string, updates: Partial<DeployedAutomation>) => Promise<void>;
  deleteAutomation: (id: string) => Promise<void>;
}

export const useAutomationStore = create<AutomationState>((set) => ({
  automations: [],
  isLoading: false,
  error: null,

  fetchAutomations: async (wallet?: string) => {
    set({ isLoading: true, error: null });
    try {
      // Build the URL with wallet_address for privacy scoping
      const params = new URLSearchParams();
      if (wallet) {
        params.set('wallet_address', wallet);
      }
      const queryString = params.toString();
      const url = `${API_BASE_URL}/${queryString ? `?${queryString}` : ''}`;
      
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Failed to fetch automations');
      const data = await resp.json();
      set({ automations: data.automations, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      console.error('Failed to fetch automations:', err);
    }
  },

  pauseAutomation: async (id: string) => {
    try {
      const resp = await fetch(`${API_BASE_URL}/${id}/pause`, { method: 'POST' });
      if (!resp.ok) throw new Error('Failed to pause automation');
      
      set((state) => ({
        automations: state.automations.map((a) =>
          a.id === id ? { ...a, status: 'paused' } : a
        ),
      }));
    } catch (err: any) {
      console.error('Failed to pause automation:', err);
      throw err;
    }
  },

  resumeAutomation: async (id: string) => {
    try {
      const resp = await fetch(`${API_BASE_URL}/${id}/resume`, { method: 'POST' });
      if (!resp.ok) throw new Error('Failed to resume automation');

      set((state) => ({
        automations: state.automations.map((a) =>
          a.id === id ? { ...a, status: 'active' } : a
        ),
      }));
    } catch (err: any) {
      console.error('Failed to resume automation:', err);
      throw err;
    }
  },

  updateAutomation: async (id: string, updates: Partial<DeployedAutomation>) => {
    try {
      const resp = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!resp.ok) throw new Error('Failed to update automation');
      
      const data = await resp.json();
      set((state) => ({
        automations: state.automations.map((a) =>
          a.id === id ? { ...a, ...data.automation } : a
        ),
      }));
    } catch (err: any) {
      console.error('Failed to update automation:', err);
      throw err;
    }
  },

  deleteAutomation: async (id: string) => {
    try {
      const resp = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error('Failed to delete automation');

      set((state) => ({
        automations: state.automations.filter((a) => a.id !== id),
      }));
    } catch (err: any) {
      console.error('Failed to delete automation:', err);
      throw err;
    }
  },
}));
