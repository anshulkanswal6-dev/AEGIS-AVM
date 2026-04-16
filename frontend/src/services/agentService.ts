const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8002';

export interface StructuredQuestion {
  field: string;
  question: string;
  input_type: 'text' | 'number' | 'url' | 'address' | 'email' | 'interval' | 'select';
  field_type: string;
  required: boolean;
  options?: string[];
}

export interface AgentResponse {
  session_id: string;
  stage: 'idle' | 'needs_input' | 'planning' | 'awaiting_approval' | 'complete' | 'error';
  status: string;
  agent_status: string;
  agent_message: string;
  selected_trigger?: string;
  selected_actions?: string[];
  planning?: any;
  validation?: any;
  structured_questions?: StructuredQuestion[];
  plan_md?: string;
  automation_spec?: any;
  files?: Record<string, string>;
}

export const agentService = {
  async getModels(): Promise<any[]> {
    console.log('[AgentService] Fetching models...');
    const response = await fetch(`${API_BASE}/models`);
    if (!response.ok) throw new Error('Failed to fetch models');
    return await response.json();
  },

  async chat(
    userMessage: string,
    sessionId?: string,
    walletAddress?: string,
    knownFields?: Record<string, any>,
    planningModelId?: string,
    codegenModelId?: string,
    projectName?: string
  ): Promise<AgentResponse> {
    console.log(`[AgentService] Chat: ${userMessage} (Project: ${projectName})`);
    
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_message: userMessage,
        session_id: sessionId || undefined,
        wallet_address: walletAddress || undefined,
        known_fields: knownFields || {},
        planning_model_id: planningModelId || undefined,
        codegen_model_id: codegenModelId || undefined,
        project_name: projectName || undefined,
      })
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(err.detail || 'Chat failed');
    }
    
    return await response.json();
  },

  async continueChat(
    sessionId: string,
    fields: Record<string, any>,
    walletAddress?: string,
    planningModelId?: string,
    projectName?: string
  ): Promise<AgentResponse> {
    console.log(`[AgentService] Continue session: ${sessionId} (Project: ${projectName})`);
    
    const response = await fetch(`${API_BASE}/continue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        fields: fields,
        wallet_address: walletAddress || undefined,
        planning_model_id: planningModelId || undefined,
        project_name: projectName || undefined,
      })
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(err.detail || 'Continue failed');
    }
    
    return await response.json();
  },

  async approvePlan(
    sessionId: string,
    approved: boolean,
    changes?: string,
    codegenModelId?: string
  ): Promise<AgentResponse> {
    console.log(`[AgentService] Approve plan: ${approved}`);
    
    const response = await fetch(`${API_BASE}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        approved: approved,
        changes: changes || undefined,
        codegen_model_id: codegenModelId || undefined,
      })
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(err.detail || 'Approve failed');
    }
    
    return await response.json();
  },

  // Legacy endpoints (kept for compatibility)
  async plan(prompt: string, planningModel: string, knownFields: Record<string, any> = {}) {
    console.log(`[AgentService] Legacy plan: ${prompt}`);
    
    const response = await fetch(`${API_BASE}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_prompt: prompt,
        known_fields: knownFields,
        planning_model_id: planningModel
      })
    });
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Plan failed');
    }
    
    return await response.json();
  },

  // =========================================================
  // Runtime API — Deploy & Manage Automations
  // =========================================================

  async deploy(
    name: string,
    specJson: Record<string, any>,
    walletAddress?: string,
    sessionId?: string,
    description?: string,
    files?: Record<string, string>,
    automationId?: string, // Added to target existing projects
    projectId?: string     // Explicit project linkage
  ): Promise<any> {
    console.log(`[AgentService] Deploying automation: ${name} (project=${projectId}, automation=${automationId})`);
    
    const response = await fetch(`${API_BASE}/automations/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: description || '',
        session_id: sessionId || '',
        automation_id: automationId || undefined,
        project_id: projectId || undefined,
        wallet_address: walletAddress || '',
        spec_json: specJson,
        files: files || {},
      })
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Deploy failed' }));
      throw new Error(err.detail || 'Deploy failed');
    }
    
    return await response.json();
  },

  async listAutomations(status?: string, projectId?: string, walletAddress?: string): Promise<any> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (projectId) params.append('project_id', projectId);
    if (walletAddress) params.append('wallet_address', walletAddress);
    
    const response = await fetch(`${API_BASE}/automations/?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to list automations');
    return await response.json();
  },

  async getAutomationByProject(projectId: string): Promise<any> {
    const data = await this.listAutomations(undefined, projectId);
    return data.automations?.[0] || null;
  },

  async getAutomation(automationId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/automations/${automationId}`);
    if (!response.ok) throw new Error('Failed to get automation');
    return await response.json();
  },

  async pauseAutomation(automationId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/automations/${automationId}/pause`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to pause automation');
    return await response.json();
  },

  async resumeAutomation(automationId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/automations/${automationId}/resume`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to resume automation');
    return await response.json();
  },

  async deleteAutomation(automationId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/automations/${automationId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete automation');
    return await response.json();
  },

  async getAutomationLogs(automationId: string, limit: number = 50): Promise<any> {
    const response = await fetch(`${API_BASE}/automations/${automationId}/logs?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to get automation logs');
    return await response.json();
  },

  async getTerminalLogs(sessionId: string, limit: number = 100): Promise<any> {
    const response = await fetch(`${API_BASE}/automations/terminal/${sessionId}/logs?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to get terminal logs');
    return await response.json();
  },

  async clearTerminalLogs(sessionId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/automations/terminal/${sessionId}/clear`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to clear terminal logs');
    return await response.json();
  },
  async triggerNow(automationId: string): Promise<any> {
    const response = await fetch(`${API_BASE}/automations/${automationId}/trigger-now`);
    if (!response.ok) throw new Error('Failed to trigger automation');
    return await response.json();
  },
  
  async getSession(sessionId: string): Promise<AgentResponse | null> {
    try {
      const response = await fetch(`${API_BASE}/automations/session/${sessionId}`);
      if (!response.ok) return null;
      const data = await response.json();
      if (!data.success) return null;
      
      // Map backend session state to AgentResponse interface
      const s = data.session;
      return {
        session_id: s.id,
        stage: s.stage,
        status: 'restored',
        agent_status: s.stage === 'complete' ? 'complete' : 'idle',
        agent_message: 'Workspace restored from session.',
        files: s.files,
        plan_md: s.plan_md,
      };
    } catch (e) {
      console.error('[AgentService] getSession failed', e);
      return null;
    }
  },

  // --- Auth & Wallet lookup (Algorand) ---

  async getAuthNonce(address: string): Promise<{ nonce: string, message: string }> {
    const response = await fetch(`${API_BASE}/automations/auth/nonce/${address}`);
    if (!response.ok) throw new Error('Failed to get auth nonce');
    return await response.json();
  },

  async verifyAuth(address: string, signature: string, message: string): Promise<{ success: boolean; profile_id?: string; wallet_app_id?: number | null }> {
    try {
      const response = await fetch(`${API_BASE}/automations/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature, message })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Verification failed' }));
        console.error('[AgentService] verifyAuth failed:', err);
        return { success: false };
      }
      const data = await response.json();
      return {
        success: data.success === true,
        profile_id: data.profile_id,
        wallet_app_id: data.wallet_app_id,
      };
    } catch (e) {
      console.error('[AgentService] verifyAuth exception:', e);
      return { success: false };
    }
  },

  async getWalletAppId(address: string): Promise<number | null> {
    const response = await fetch(`${API_BASE}/automations/wallet/${address}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.app_id;
  },

  async setWalletAppId(address: string, appId: number): Promise<boolean> {
    const response = await fetch(`${API_BASE}/automations/wallet/set-app-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, app_id: appId })
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data.success;
  },

  // --- Unified Activity Logs ---

  async logActivity(walletAddress: string, event: string, message: string, level: string = "info", details?: any): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/automations/activity/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: walletAddress,
          event,
          message,
          level,
          details
        })
      });
      return response.ok;
    } catch (e) {
      console.warn('[AgentService] logActivity failed', e);
      return false;
    }
  },

  async getAllActivity(walletAddress: string, limit: number = 50): Promise<any> {
    const response = await fetch(`${API_BASE}/automations/activity/all?wallet_address=${walletAddress}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch activity logs');
    return await response.json();
  }
};
