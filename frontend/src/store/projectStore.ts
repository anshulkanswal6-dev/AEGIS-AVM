import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Project } from '../lib/mock/projects';

interface ProjectState {
  projects: Project[];
  isLoading: boolean;
  selectedProject: Project | null;
  searchQuery: string;
  selectedFilter: 'all' | 'draft' | 'ready' | 'active' | 'error';
  fetchProjects: (wallet: string) => Promise<void>;
  setSearchQuery: (q: string) => void;
  setSelectedFilter: (f: 'all' | 'draft' | 'ready' | 'active' | 'error') => void;
  selectProject: (id: string | null) => void;
  createProject: (name: string, prompt: string, wallet: string) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  isLoading: false,
  selectedProject: null,
  searchQuery: '',
  selectedFilter: 'all',
  
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSelectedFilter: (f) => set({ selectedFilter: f }),
  
  selectProject: (id) => set((state) => ({
    selectedProject: id ? state.projects.find(p => p.id === id) || null : null
  })),

  fetchProjects: async (wallet) => {
    if (!wallet) return;
    set({ isLoading: true });
    try {
      const normalizedWallet = wallet.toLowerCase();
      // First find profile by wallet (try normalized first)
      let { data: profiles } = await supabase.from('profiles').select('id').eq('wallet_address', normalizedWallet);
      
      if (!profiles || profiles.length === 0) {
          // Fallback to original case
          const { data: fallbackProfiles } = await supabase.from('profiles').select('id').eq('wallet_address', wallet);
          profiles = fallbackProfiles;
      }

      if (!profiles || profiles.length === 0) {
          set({ projects: [], isLoading: false });
          return;
      }
      
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', profiles[0].id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      const uiProjects: Project[] = (projects || []).map(p => ({
          id: p.id,
          name: p.name,
          prompt: p.description || '',
          status: p.status as any,
          chain: p.chain || 'ALGO',
          lastUpdated: p.updated_at,
          trigger: '',
          actions: [],
          spec: '{}',
          code: ''
      }));

      set({ projects: uiProjects, isLoading: false });
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      set({ isLoading: false });
    }
  },

  createProject: async (name, prompt, wallet) => {
    if (!name || name.trim().length === 0) throw new Error("Project name cannot be empty");
    
    try {
      const normalizedWallet = wallet.toLowerCase();
      let profileId = "";
      
      let { data: profiles } = await supabase.from('profiles').select('id').eq('wallet_address', normalizedWallet);
      
      if (!profiles || profiles.length === 0) {
         // Try fallback
         const { data: fallbackProfiles } = await supabase.from('profiles').select('id').eq('wallet_address', wallet);
         if (!fallbackProfiles || fallbackProfiles.length === 0) {
            const { data: newProfile, error: profErr } = await supabase.from('profiles').insert({ wallet_address: normalizedWallet }).select();
            if (profErr) throw profErr;
            profileId = newProfile?.[0]?.id;
         } else {
            profileId = fallbackProfiles[0].id;
         }
      } else {
         profileId = profiles[0].id;
      }

      const { data, error } = await supabase.from('projects').insert({
        name,
        description: prompt,
        user_id: profileId,
        status: 'draft',
        chain: 'Algorand Testnet'
      }).select().single();

      if (error) throw error;
      
      const newProject: Project = {
          id: data.id,
          name: data.name,
          prompt: data.description || '',
          status: data.status as any,
          chain: data.chain || 'ALGO',
          lastUpdated: data.updated_at,
          trigger: '',
          actions: [],
          spec: '{}',
          code: ''
      };

      await get().fetchProjects(wallet);
      return newProject;
    } catch (err) {
      console.error('Failed to create project:', err);
      throw err;
    }
  },

  updateProject: async (id, updates) => {
    try {
      await supabase.from('projects').update(updates).eq('id', id);
      set((state) => ({
        projects: state.projects.map(p => p.id === id ? { ...p, ...updates } : p)
      }));
    } catch (err) {
      console.error('Failed to update project:', err);
    }
  },

  deleteProject: async (id) => {
    try {
      await supabase.from('projects').delete().eq('id', id);
      set((state) => ({
        projects: state.projects.filter(p => p.id !== id)
      }));
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  }
}));
