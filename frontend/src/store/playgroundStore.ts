
import { create } from 'zustand';
import { agentService, type StructuredQuestion } from '../services/agentService';
import { useAgentWalletStore } from './walletStore';
import { saveChatSession, loadChatSession } from '../services/chatSessionService';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'agent_status';
  content: string;
  timestamp: string;
  agentStatus?: string;
  icon?: string;
}

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

interface ValidationResult {
  id: string;
  type: 'success' | 'warning' | 'error';
  message: string;
}

export type PlaygroundStatus = 
  | 'idle' 
  | 'understanding' 
  | 'analyzing' 
  | 'asking_questions' 
  | 'waiting_for_input' 
  | 'validating' 
  | 'planning' 
  | 'awaiting_approval' 
  | 'generating_code' 
  | 'generating' 
  | 'creating_files' 
  | 'success' 
  | 'error';

export interface PlaygroundState {
  currentPrompt: string;
  messages: ChatMessage[];
  status: PlaygroundStatus;
  sessionId: string | null;
  walletAddress: string | null;
  
  // Model Config
  planningModel: string;
  codegenModel: string;
  availableModels: any[];
  
  // Agent Planning Data
  intentSummary: string;
  candidateTriggers: any[];
  candidateActions: any[];
  reasoning: string;
  extractedFields: Record<string, any>;
  missingFields: any[];
  followUpQuestions: any[];
  structuredQuestions: StructuredQuestion[];
  
  // Workspace Artifacts
  activeView: 'compile' | 'simulation' | 'automation';
  activeTab: string | null;
  openFiles: string[];
  spec: string;
  code: string;
  planMd: string;
  customFiles: Record<string, string>;
  terminalLogs: string[];
  automationLogs: string[];
  activeBottomTab: 'compile' | 'simulation' | 'automation';
  validations: ValidationResult[];
  fileTree: FileNode[];
  activeAutomationId: string | null;
  activeProjectId: string | null;
  projectDescription: string | null;

  // Actions
  setPrompt: (p: string) => void;
  setActiveView: (view: 'compile' | 'simulation' | 'automation') => void;
  setActiveTab: (tab: string | null) => void;
  setActiveBottomTab: (tab: 'compile' | 'simulation' | 'automation') => void;
  updateContent: (id: string, content: string) => void;
  openFile: (id: string) => void;
  closeFile: (id: string) => void;
  deleteFile: (id: string) => void;
  createFile: (name: string, folderId: string | null) => void;
  createFolder: (name: string, parentId: string | null) => void;
  addTerminalLog: (log: string) => void;
  addAutomationLog: (log: string) => void;
  setModels: (planning: string, codegen: string) => void;
  setWalletAddress: (address: string | null) => void;
  fetchModels: () => Promise<void>;
  pollTerminalLogs: () => Promise<void>;
  addMessage: (m: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  addAgentStatus: (status: string, icon: string, content: string) => void;
  submitPrompt: (prompt: string) => Promise<void>;
  submitFields: (fields: Record<string, any>) => Promise<void>;
  approvePlan: (approved: boolean, changes?: string) => Promise<void>;
  deployAutomation: () => Promise<void>;
  clearWorkspace: () => Promise<void>;
  loadAutomation: (automation: any) => void;
  setProjectContext: (projectId: string, name: string, description: string) => void;
  clearLogs: () => void;
}

const DEFAULT_FILE_TREE: FileNode[] = [];

export const usePlaygroundStore = create<PlaygroundState>((set, get) => ({
  currentPrompt: '',
  messages: [],
  status: 'idle',
  sessionId: null,
  walletAddress: null,
  activeView: 'compile',
  activeBottomTab: 'compile',
  
  planningModel: 'gemini_flash',
  codegenModel: 'gemini_flash',
  availableModels: [],
  
  intentSummary: '',
  candidateTriggers: [],
  candidateActions: [],
  reasoning: '',
  extractedFields: {},
  missingFields: [],
  followUpQuestions: [],
  structuredQuestions: [],
  
  spec: '{}',
  code: '',
  planMd: '',
  customFiles: {},
  openFiles: [],
  activeTab: null,
  terminalLogs: [],
  automationLogs: [],
  validations: [],
  fileTree: [...DEFAULT_FILE_TREE],
  activeAutomationId: null,
  activeProjectId: null,
  projectDescription: null,

  setPrompt: (p) => set({ currentPrompt: p }),

  setActiveView: (view) => set({ 
    activeView: view,
    activeBottomTab: view
  }),

  setActiveTab: (tab) => set({ 
    activeTab: tab,
    activeView: 'compile'
  }),
  
  setActiveBottomTab: (tab) => set({ activeBottomTab: tab }),

  updateContent: (id, content) => set((state) => {
    if (id === 'prompt') return { currentPrompt: content };
    if (id === 'code') return { code: content };
    if (id === 'spec') return { spec: content };
    if (id === 'plan_md') return { planMd: content };
    
    // SYNC: If user is editing a config/spec file in the IDE, update the deployment spec too
    const updates: Partial<PlaygroundState> = {
      customFiles: { ...state.customFiles, [id]: content } 
    };

    const fileName = state.fileTree.find(n => n.id === id)?.name.toLowerCase() || "";
    if (fileName === "config.json" || fileName === "spec.json") {
       updates.spec = content;
    }

    return updates;
  }),

  openFile: (id) => set((state) => ({
    openFiles: state.openFiles.includes(id) ? state.openFiles : [...state.openFiles, id],
    activeTab: id,
    activeView: 'compile'
  })),

  closeFile: (id) => set((state) => {
    const newOpenFiles = state.openFiles.filter(fid => fid !== id);
    return {
      openFiles: newOpenFiles,
      activeTab: state.activeTab === id ? (newOpenFiles[0] || null) : state.activeTab
    };
  }),

  deleteFile: (id) => set((state) => {
    const updates: Partial<PlaygroundState> = {
      openFiles: state.openFiles.filter(fid => fid !== id),
      activeTab: state.activeTab === id ? null : state.activeTab
    };

    const removeFromTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.filter(n => n.id !== id).map(n => ({
        ...n,
        children: n.children ? removeFromTree(n.children) : undefined
      }));
    };

    const newTree = removeFromTree(state.fileTree);
    const newOpenFiles = state.openFiles.filter(fid => fid !== id);
    let newActiveTab = state.activeTab;
    if (newActiveTab === id) {
      newActiveTab = newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null;
    }
    
    if (state.customFiles[id]) {
      const newCustomFiles = { ...state.customFiles };
      delete newCustomFiles[id];
      updates.customFiles = newCustomFiles;
    }

    get().addTerminalLog(`[FileSystem] Deleted resource: ${id}`);
    return { ...updates, fileTree: newTree, openFiles: newOpenFiles, activeTab: newActiveTab };
  }),

  createFile: (name, folderId) => set((state) => {
    const fileId = `file_${Date.now()}`;
    const newFile: FileNode = { id: fileId, name, type: 'file' };

    let newTree: FileNode[];
    if (!folderId) {
      newTree = [...state.fileTree, newFile];
    } else {
      const addToTree = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(n => {
          if (n.id === folderId) {
            return { ...n, children: [...(n.children || []), newFile] };
          }
          if (n.children) {
            return { ...n, children: addToTree(n.children) };
          }
          return n;
        });
      };
      newTree = addToTree(state.fileTree);
    }

    get().addTerminalLog(`[FileSystem] Created file: ${name}`);
    return { 
      fileTree: newTree, 
      customFiles: { ...state.customFiles, [fileId]: '# Start writing your logic here...' },
      activeTab: fileId,
      openFiles: [...state.openFiles, fileId]
    };
  }),

  createFolder: (name, parentId) => set((state) => {
    const folderId = `folder_${Date.now()}`;
    const newFolder: FileNode = { id: folderId, name, type: 'folder', children: [] };

    let newTree: FileNode[];
    if (!parentId) {
      newTree = [...state.fileTree, newFolder];
    } else {
      const addToTree = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(n => {
          if (n.id === parentId) {
            return { ...n, children: [...(n.children || []), newFolder] };
          }
          if (n.children) {
            return { ...n, children: addToTree(n.children) };
          }
          return n;
        });
      };
      newTree = addToTree(state.fileTree);
    }

    get().addTerminalLog(`[FileSystem] Created folder: ${name}`);
    return { fileTree: newTree };
  }),

  addTerminalLog: (log) => set((state) => ({
    terminalLogs: [...state.terminalLogs, `[${new Date().toLocaleTimeString()}] ${log}`]
  })),
  
  addAutomationLog: (log) => set((state) => ({
    automationLogs: [...state.automationLogs, log]
  })),
  
  setModels: (planning, codegen) => set({ planningModel: planning, codegenModel: codegen }),
  setWalletAddress: (address) => set({ walletAddress: address }),

  fetchModels: async () => {
    try {
      const models = await agentService.getModels();
      if (models && models.length > 0) {
        set({ 
          availableModels: models,
          planningModel: models[0].id,
          codegenModel: models[0].id
        });
      }
    } catch (error) {
      console.error("[PlaygroundStore] Failed to fetch models:", error);
    }
  },

  pollTerminalLogs: async () => {
    const state = get();
    
    // Safety check for session/project ID to prevent backend crashes (PostgREST UUID errors)
    const sanitizeId = (id: any) => (id && id !== "undefined" && id !== "null") ? String(id) : null;
    const sessionId = sanitizeId(state.activeProjectId || state.sessionId);
    const automationId = sanitizeId(state.activeAutomationId);

    if (!sessionId && !automationId) {
        // console.warn("[PlaygroundStore] No IDs for polling", { sessionId, automationId });
        return;
    }

    try {
        const updates: Partial<PlaygroundState> = {};
        
        // 1. Unified Terminal Logs (System)
        if (sessionId) {
            try {
                const response = await agentService.getTerminalLogs(sessionId);
                if (response && Array.isArray(response.logs)) {
                   const mapped = response.logs.map((l: any) => {
                      const time = l.timestamp ? new Date(l.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 
                                   new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      return `[${time}] ${l.message}`;
                   });
                   
                   // Only update if changed AND not empty (to prevent transient clearing)
                   if (mapped.length > 0 && JSON.stringify(mapped) !== JSON.stringify(state.terminalLogs)) {
                      updates.terminalLogs = mapped;
                   }
                }
            } catch (err) {
                console.warn("[PlaygroundStore] System log poll failed:", err);
            }
        }

        // 2. Automation Logs (Flow)
        if (automationId) {
            try {
                const response = await agentService.getAutomationLogs(automationId);
                if (response && Array.isArray(response.logs)) {
                   const mapped = response.logs.map((l: any) => {
                      const time = l.timestamp ? new Date(l.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 
                                   new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      return `[${time}] ${l.message}`;
                   });
                   
                   if (mapped.length > 0 && JSON.stringify(mapped) !== JSON.stringify(state.automationLogs)) {
                      updates.automationLogs = mapped;
                   }
                }
            } catch (err) {
                console.warn("[PlaygroundStore] Automation log poll failed:", err);
            }
        }
        
        if (Object.keys(updates).length > 0) {
           // console.log("[PlaygroundStore] Updating logs state", Object.keys(updates));
           set(updates);
        }
    } catch (e) {
        console.error("[PlaygroundStore] Critical polling failure", e);
    }
  },

  deployAutomation: async () => {
    let state = get();
    // Safety fallback: If sessionId is missing but we have a project, use project as session
    if (!state.sessionId && state.activeProjectId) {
       set({ sessionId: state.activeProjectId });
       state = get(); // refresh state
    }
    
    if (!state.sessionId) {
       // We really need a session, so create a fallback one locally as a valid UUID
       const fallbackId = crypto.randomUUID();
       set({ sessionId: fallbackId });
       state = get();
    }

    // Helper to strip redundant prefixes and restore extensions
    const sanitizeFilename = (name: string): string => {
        let clean = name.replace(/^(FILE_|file_)+/gi, '');
        // Restore common extensions if they were underscored
        if (clean.endsWith('_MD')) clean = clean.replace(/_MD$/i, '.md');
        if (clean.endsWith('_PY')) clean = clean.replace(/_PY$/i, '.py');
        if (clean.endsWith('_JSON')) clean = clean.replace(/_JSON$/i, '.json');
        return clean;
    };

    try {
      // LAST-SECOND SYNC: Look for config/spec files in customFiles if spec is empty
      let currentSpec = state.spec;
      if (!currentSpec || currentSpec === '{}') {
          const configKey = Object.keys(state.customFiles).find(k => {
             const node = state.fileTree.find(n => n.id === k);
             const name = node?.name.toLowerCase() || '';
             return name.includes('config.json') || name.includes('spec.json');
          });
          if (configKey) {
             currentSpec = state.customFiles[configKey];
          }
      }

      if (!currentSpec || currentSpec === '{}' || currentSpec === 'null') {
         // Fallback: If no spec exists, but we have a prompt, start the build
         if (state.currentPrompt && state.currentPrompt.trim()) {
            get().addTerminalLog(`[Runtime] No config found. Building project from prompt...`);
            return get().submitPrompt(state.currentPrompt);
         }
         throw new Error("No automation configuration found. Please describe what you want to build first.");
      }

      let specObj: any = {};
      try {
          specObj = JSON.parse(currentSpec);
          if (!specObj || typeof specObj !== 'object') {
              specObj = {};
          }
      } catch (e) {
          console.error("Failed to parse spec JSON", e);
          specObj = {};
      }
      // Name resolution: preference for intentSummary or existing projectDescription
      const name = state.intentSummary || state.projectDescription || "Automation Project";
      const projectId = state.activeProjectId || undefined;
      
      // Map internal IDs to real filenames before sending to backend
      const normalizedFiles: Record<string, string> = {};
      Object.entries(state.customFiles).forEach(([id, content]) => {
          const node = state.fileTree.find(n => n.id === id);
          const rawName = node ? node.name : id;
          const cleanName = sanitizeFilename(rawName);
          normalizedFiles[cleanName] = content;
      });
      
      set({ status: 'generating' }); // Loading state
      const result = await agentService.deploy(
        name,
        specObj,
        state.walletAddress || undefined,
        state.sessionId || undefined,
        state.reasoning,
        normalizedFiles,
        state.activeAutomationId || undefined,
        projectId  // Explicit project linkage
      );

      set({ 
        activeAutomationId: result.automation_id,
        status: 'idle',
        automationLogs: [`- Automation "${name}" deployed successfully.`]
      });
      get().addTerminalLog(`[Runtime] Deployment successful! Automation ID: ${result.automation_id}`);
      
      // Trigger an immediate evaluation so the user doesn't have to wait 30s for the first log
      try {
        get().addTerminalLog(`[Runtime] Triggering immediate condition check...`);
        await agentService.triggerNow(result.automation_id);
      } catch (triggerErr) {
        console.warn("Immediate trigger failed, waiting for background worker poll.", triggerErr);
      }
    } catch (e: any) {
      get().addTerminalLog(`[Runtime] Deployment failed: ${e.message}`);
      set({ status: 'idle' });
    }
  },

  clearWorkspace: async () => {
     const state = get();
     const storageId = state.activeAutomationId || state.activeProjectId;
     // Save current chat to Supabase before clearing
     if (storageId && state.messages.length > 0) {
       saveChatSession(storageId, state.messages);
     }
     set({
       currentPrompt: '',
       messages: [],
       spec: '{}',
       code: '',
       planMd: '',
       validations: [],
       intentSummary: '',
       candidateTriggers: [],
       candidateActions: [],
       reasoning: '',
       extractedFields: {},
       missingFields: [],
       followUpQuestions: [],
       structuredQuestions: [],
       status: 'idle',
       sessionId: null,
       activeAutomationId: null,
       activeProjectId: null,
       projectDescription: null,
       customFiles: {},
       openFiles: [],
       activeTab: null,
       fileTree: [...DEFAULT_FILE_TREE],
       terminalLogs: ["[System] Workspace cleared."],
       automationLogs: []
     });
  },

  clearLogs: async () => {
     const state = get();
     const targetId = state.activeAutomationId || state.activeProjectId || state.sessionId;
     if (targetId) {
        try {
           await agentService.clearTerminalLogs(targetId);
        } catch (e) { console.error("Could not clear backend logs", e); }
     }
     set({ terminalLogs: [], automationLogs: [] });
  },

  loadAutomation: (automation) => {
    const { clearWorkspace, addTerminalLog } = get();
    clearWorkspace();

    const specString = JSON.stringify(automation.spec_json, null, 2);
    const incomingFiles: Record<string, string> = automation.files || {};
    
    const customFiles: Record<string, string> = {};
    const fileTree: FileNode[] = [];
    const openFiles: string[] = [];

    const sanitizeFilename = (name: string): string => {
        let clean = name.replace(/^(FILE_|file_)+/gi, '');
        if (clean.endsWith('_MD')) clean = clean.replace(/_MD$/i, '.md');
        if (clean.endsWith('_PY')) clean = clean.replace(/_PY$/i, '.py');
        if (clean.endsWith('_JSON')) clean = clean.replace(/_JSON$/i, '.json');
        if (!clean.includes('.') && clean.includes('_')) {
            // Aggressive dot restoration: replace last underscore with dot if it looks like an extension
            const parts = clean.split('_');
            if (parts.length > 1) {
                const ext = parts.pop();
                clean = parts.join('_') + '.' + ext;
            }
        }
        return clean;
    };

    Object.entries(incomingFiles).forEach(([rawName, content]) => {
      const name = sanitizeFilename(rawName);
      const id = `file_${name.replace(/[^a-z0-9]/g, '_')}`;
      customFiles[id] = content;
      fileTree.push({ id, name, type: 'file' });
      openFiles.push(id);
    });

    // Ensure spec/config is in files if not explicitly there
    if (!incomingFiles['spec.json'] && !incomingFiles['config.json']) {
      const specId = 'file_spec_json';
      customFiles[specId] = specString;
      fileTree.push({ id: specId, name: 'spec.json', type: 'file' });
      openFiles.push(specId);
    }

    set({
      status: 'success',
      sessionId: automation.session_id,
      walletAddress: automation.wallet_address || null,
      intentSummary: automation.name,
      reasoning: automation.description,
      spec: specString,
      customFiles,
      fileTree,
      openFiles,
      activeTab: openFiles.find(id => id.includes('.py')) || openFiles[0] || null,
      activeView: 'compile',
      activeAutomationId: automation.id
    });

    addTerminalLog(`[System] Loaded automation "${automation.name}" for redeploy.`);

    // Restore saved chat from Supabase
    loadChatSession(automation.id).then((savedMessages) => {
      if (savedMessages.length > 0) {
        set({ messages: savedMessages });
        get().addTerminalLog(`[System] Restored ${savedMessages.length} chat messages.`);
      }
    });
  },

  addMessage: (m) => {
    set((state) => {
      const newMessages = [
        ...state.messages,
        { ...m, id: Math.random().toString(), timestamp: new Date().toISOString() }
      ];
      
      // Auto-save to Supabase if we have a project/automation ID
      const storageId = state.activeAutomationId || state.activeProjectId;
      if (storageId) {
        saveChatSession(storageId, newMessages);
      }

      return { messages: newMessages };
    });
  },

  addAgentStatus: (status, icon, content) => {
    set((state) => {
      const newMessages = [
        ...state.messages,
        {
          id: Math.random().toString(),
          role: 'agent_status' as const,
          content,
          timestamp: new Date().toISOString(),
          agentStatus: status,
          icon,
        }
      ];

      // Auto-save status changes too for persistent timeline
      const storageId = state.activeAutomationId || state.activeProjectId;
      if (storageId) {
        saveChatSession(storageId, newMessages);
      }

      return { messages: newMessages };
    });
  },

  // =========================================================
  // Main chat submission
  // =========================================================
  submitPrompt: async (prompt: string) => {
    const state = get();
    set({ status: 'understanding', currentPrompt: prompt, activeTab: 'prompt' });
    
    // User message
    get().addMessage({ role: 'user', content: prompt });
    
    // Agent status: understanding
    get().addAgentStatus('understanding', '🧠', 'Understanding your request...');
    // Inject Agent Wallet address if available
    const agentWalletAddress = useAgentWalletStore.getState().agentWalletAddress;
    const mergedFields = { ...state.extractedFields };
    if (agentWalletAddress && !mergedFields.wallet_address) {
       mergedFields.wallet_address = agentWalletAddress;
       get().addTerminalLog(`[Agent] Injecting Agent Wallet context: ${agentWalletAddress}`);
    }

    try {
      // Short delay to show understanding state
      await new Promise(r => setTimeout(r, 400));
      
      // Agent status: analyzing
      set({ status: 'analyzing' });
      get().addAgentStatus('analyzing', '📊', 'Analyzing triggers and actions...');

      const data = await agentService.chat(
        prompt,
        state.sessionId || undefined,
        state.walletAddress || undefined,
        mergedFields,
        state.planningModel,
        state.codegenModel,
        state.intentSummary || undefined // Pass projectName context
      );

      const sessionId = data.session_id;
      // Only set sessionId if we don't already have one or if it's a new project
      if (!state.sessionId || state.sessionId === state.activeProjectId) {
         set({ sessionId });
      }

      // Handle different stages
      if (data.stage === 'idle') {
        // Greeting or clarification
        set({ status: 'idle' });
        get().addMessage({ role: 'assistant', content: data.agent_message });
        get().addTerminalLog(`[Agent] Greeting/clarification response sent.`);
        return;
      }

      if (data.stage === 'needs_input') {
        // Needs follow-up questions
        set({
          status: 'asking_questions',
          // LOCK: strictly preserve existing project identity if AI returns empty
          intentSummary: data.planning?.intent_summary || state.intentSummary || '', 
          candidateTriggers: data.planning?.candidate_triggers || [],
          candidateActions: data.selected_actions || [],
          reasoning: data.planning?.reasoning || '',
          extractedFields: data.planning?.extracted_fields || {},
          missingFields: data.validation?.missing_fields || [],
          followUpQuestions: data.planning?.follow_up_questions || [],
          structuredQuestions: data.structured_questions || [],
        });
        
        get().addAgentStatus('asking', '❓', 'Need some additional details...');
        get().addMessage({ role: 'assistant', content: data.agent_message });
        get().addTerminalLog(`[Agent] Trigger mapped: ${data.selected_trigger}. Awaiting inputs.`);
        
        // After a beat, show waiting status
        await new Promise(r => setTimeout(r, 300));
        set({ status: 'waiting_for_input' });
        get().addAgentStatus('waiting', '⏳', 'Waiting for your input...');
        return;
      }

      if (data.stage === 'awaiting_approval') {
        // Plan generated, show in IDE
        set({
          status: 'awaiting_approval',
          // LOCK: strictly preserve existing project identity if AI returns empty
          intentSummary: data.planning?.intent_summary || state.intentSummary || '', 
          candidateTriggers: data.planning?.candidate_triggers || [],
          candidateActions: data.selected_actions || [],
          planMd: data.plan_md || '',
        });

        get().addAgentStatus('planning', '📋', 'Creating automation plan...');
        
        // Add plan.md file to the tree and open it
        get().addTerminalLog(`[Agent] Plan generated. Awaiting approval.`);
        
        // Open plan.md in the editor
        const planFileId = 'plan_md';
        set((s) => {
          const hasPlanning = s.fileTree.some(n => n.id === 'planning');
          const newTree = hasPlanning ? s.fileTree : [...s.fileTree, {
            id: 'planning',
            name: 'PLANNING',
            type: 'folder' as const,
            children: [{ id: planFileId, name: 'plan.md', type: 'file' as const }]
          }];
          
          return {
            fileTree: newTree,
            customFiles: { ...s.customFiles, [planFileId]: data.plan_md || '' },
            openFiles: [...new Set([...s.openFiles, planFileId])],
            activeTab: planFileId,
            activeView: 'compile' as const,
          };
        });

        get().addMessage({ role: 'assistant', content: data.agent_message });
        return;
      }

      if (data.stage === 'complete') {
        // Code generated
        handleCodeGenComplete(data);
        return;
      }

    } catch (error: any) {
      console.error("[PlaygroundStore] Chat error:", error);
      set({ status: 'error' });
      const msg = error?.message || "Failed to connect to agent. Ensure backend is running on port 8002.";
      get().addMessage({ role: 'assistant', content: `❌ ${msg}` });
      get().addTerminalLog(`CRITICAL ERROR: ${msg}`);
    }
  },

  // =========================================================
  // Submit fields (follow-up answers)
  // =========================================================
  submitFields: async (fields: Record<string, any>) => {
    const state = get();
    if (!state.sessionId) {
      get().addMessage({ role: 'assistant', content: 'No active session. Please start a new conversation.' });
      return;
    }

    set({ status: 'validating' });
    get().addAgentStatus('validating', '⚙️', 'Validating your inputs...');
    get().addTerminalLog(`[Agent] Validating submitted fields...`);

    try {
      await new Promise(r => setTimeout(r, 300));

      // Inject Agent Wallet address if available
      const agentWalletAddress = useAgentWalletStore.getState().agentWalletAddress;
      const mergedFields = { ...state.extractedFields, ...fields };
      if (agentWalletAddress && !mergedFields.wallet_address) {
         mergedFields.wallet_address = agentWalletAddress;
      }

      const data = await agentService.continueChat(
        state.sessionId,
        mergedFields,
        state.walletAddress || undefined,
        state.planningModel,
        state.intentSummary || undefined // Pass projectName context
      );

      if (data.stage === 'needs_input') {
        set({
          status: 'waiting_for_input',
          // Also check for intent updates here just in case AI provides a better summary now
          intentSummary: data.planning?.intent_summary || state.intentSummary || '',
          structuredQuestions: data.structured_questions || [],
          missingFields: data.validation?.missing_fields || [],
        });
        get().addMessage({ role: 'assistant', content: data.agent_message });
        get().addAgentStatus('waiting', '⏳', 'Still need some information...');
        return;
      }

      if (data.stage === 'awaiting_approval') {
        set({
          status: 'awaiting_approval',
          intentSummary: data.planning?.intent_summary || state.intentSummary || '',
          planMd: data.plan_md || '',
          structuredQuestions: [],
          missingFields: [],
        });

        get().addAgentStatus('planning', '📋', 'Creating automation plan...');

        // Open plan.md in the editor
        const planFileId = 'plan_md';
        set((s) => {
          const hasPlanning = s.fileTree.some(n => n.id === 'planning');
          const newTree = hasPlanning ? s.fileTree : [...s.fileTree, {
            id: 'planning',
            name: 'PLANNING',
            type: 'folder' as const,
            children: [{ id: planFileId, name: 'plan.md', type: 'file' as const }]
          }];
          
          return {
            fileTree: newTree,
            customFiles: { ...s.customFiles, [planFileId]: data.plan_md || '' },
            openFiles: [...new Set([...s.openFiles, planFileId])],
            activeTab: planFileId,
            activeView: 'compile' as const,
          };
        });

        get().addMessage({ role: 'assistant', content: data.agent_message });
        get().addTerminalLog(`[Agent] All inputs valid. Plan generated.`);
        return;
      }

    } catch (error: any) {
      console.error("[PlaygroundStore] Continue error:", error);
      set({ status: 'error' });
      get().addMessage({ role: 'assistant', content: `❌ ${error?.message || 'Failed to submit fields.'}` });
      get().addTerminalLog(`ERROR: ${error?.message}`);
    }
  },

  // =========================================================
  // Approve / reject plan
  // =========================================================
  approvePlan: async (approved: boolean, changes?: string) => {
    const state = get();
    if (!state.sessionId) {
      get().addMessage({ role: 'assistant', content: 'No active session.' });
      return;
    }

    if (!approved) {
      get().addMessage({ role: 'user', content: `Request changes: ${changes || 'Please modify the plan.'}` });
      set({ status: 'waiting_for_input' });
      
      try {
        const data = await agentService.approvePlan(state.sessionId, false, changes, state.codegenModel);
        get().addMessage({ role: 'assistant', content: data.agent_message });
      } catch (error: any) {
        get().addMessage({ role: 'assistant', content: `❌ ${error?.message}` });
      }
      return;
    }

    // Approved!
    get().addMessage({ role: 'user', content: '✅ Plan approved. Proceed with code generation.' });
    set({ status: 'generating' });
    get().addAgentStatus('generating', '⚡', 'Synthesizing infrastructure...');
    get().addTerminalLog('[Agent] Plan approved. Synthesizing protocol suite...');

    try {
      const data = await agentService.approvePlan(state.sessionId, true);
      handleCodeGenComplete(data);
    } catch (error: any) {
      set({ status: 'error' });
      get().addMessage({ role: 'assistant', content: '❌ Synthesis failed.' });
    }
  },

  setProjectContext: (projectId, name, description) => {
    // ALWAYS clear previous state before loading new context
    set({
      activeProjectId: projectId,
      sessionId: projectId, // Use projectId as sessionId for unified tracking
      intentSummary: name,
      projectDescription: description,
      status: 'idle',
      messages: [], // CLEAR messages for the new project
      code: '',
      spec: '{}',
      planMd: '',
      customFiles: {},
      fileTree: [...DEFAULT_FILE_TREE]
    });

    // 1. Restore Chat History
    loadChatSession(projectId).then((savedMessages) => {
      // Even if empty, we set it (which we already did above, but for clarity)
      set({ messages: savedMessages || [] });
      if (savedMessages && savedMessages.length > 0) {
        get().addTerminalLog(`[System] Restored ${savedMessages.length} previous chat messages.`);
      }
    });

    // 2. Restore Latest Code/Automation via Backend
    agentService.getAutomationByProject(projectId).then(automation => {
      if (automation) {
        get().loadAutomation(automation);
        get().addTerminalLog(`[System] Restored code from latest deployment.`);
      } else {
        // FALLBACK: If no deployed automation, check for a "Draft" session
        agentService.getSession(projectId).then(sessionData => {
           if (sessionData && sessionData.files && Object.keys(sessionData.files).length > 0) {
              handleCodeGenComplete(sessionData);
              get().addTerminalLog("[System] Restored workspace from draft session.");
           } else {
              get().addTerminalLog(`[System] No persistent automation or draft found for this project.`);
           }
        });
      }
    }).catch(err => {
      console.error("[PlaygroundStore] Failed to restore automation:", err);
    });
  },
}));


// =========================================================
// Helper: process code generation completion
// =========================================================
function handleCodeGenComplete(data: any) {
  const store = usePlaygroundStore.getState();
  const incoming: Record<string, string> = data.files || {};
  
  const customFiles = { ...store.customFiles };
  const fileTree = [...store.fileTree];
  const openFiles = [...store.openFiles];

  Object.entries(incoming).forEach(([name, data]) => {
     // Use the original name for the node, but keep a flattened, safe ID for internal state
     const id = `file_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
     
     // Robust handle: data might be a string or an object with a .content property
     let content = '';
     if (typeof data === 'string') {
       content = data;
     } else if (data && typeof data === 'object' && (data as any).content) {
       content = (data as any).content;
     } else {
       content = JSON.stringify(data, null, 2);
     }

     customFiles[id] = content;
     if (!fileTree.find(n => n.id === id)) {
        fileTree.push({ id, name, type: 'file' });
     }
     if (!openFiles.includes(id)) openFiles.push(id);
  });

  // Robust spec resolution: find config.json or spec.json regardless of casing
  const specKey = Object.keys(incoming).find(k => k.toLowerCase() === 'config.json' || k.toLowerCase() === 'spec.json');
  const specContent = specKey ? (typeof incoming[specKey] === 'string' ? incoming[specKey] : JSON.stringify(incoming[specKey], null, 2)) : store.spec;

  usePlaygroundStore.setState({
    status: 'success',
    fileTree,
    customFiles,
    openFiles,
    spec: specContent,
    activeTab: Object.keys(incoming).find(k => k.toLowerCase().endsWith('.py')) 
                ? `file_${Object.keys(incoming).find(k => k.toLowerCase().endsWith('.py'))?.toLowerCase().replace(/[^a-z0-9]/g, '_')}` 
                : openFiles[0],
    activeView: 'compile',
    automationLogs: ["- Automation code generated. Ready for deploy."]
  });

  store.addAgentStatus('complete', '✅', 'Infrastructure established!');
  store.addMessage({ role: 'assistant', content: data.agent_message || 'Project established in workspace!' });
}
