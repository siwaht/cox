import { create } from 'zustand';
import type { DeployStatus, DeployConfig } from '@/adapters/sandbox-deployer';

interface DeployStore {
  status: DeployStatus;
  sandboxId: string | null;
  agentUrl: string | null;
  previewUrl: string | null;
  logs: string[];
  error: string | null;
  deployConfig: DeployConfig | null;

  // Actions
  setStatus: (status: DeployStatus) => void;
  addLog: (message: string) => void;
  setDeployConfig: (config: DeployConfig) => void;
  setSandboxInfo: (sandboxId: string, agentUrl: string, previewUrl: string) => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useDeployStore = create<DeployStore>()((set) => ({
  status: 'idle',
  sandboxId: null,
  agentUrl: null,
  previewUrl: null,
  logs: [],
  error: null,
  deployConfig: null,

  setStatus: (status) => set({ status, error: status === 'error' ? undefined : null }),

  addLog: (message) =>
    set((s) => ({ logs: [...s.logs, `[${new Date().toLocaleTimeString()}] ${message}`] })),

  setDeployConfig: (config) => set({ deployConfig: config }),

  setSandboxInfo: (sandboxId, agentUrl, previewUrl) =>
    set({ sandboxId, agentUrl, previewUrl, status: 'live' }),

  setError: (error) => set({ error, status: 'error' }),

  reset: () =>
    set({
      status: 'idle',
      sandboxId: null,
      agentUrl: null,
      previewUrl: null,
      logs: [],
      error: null,
      deployConfig: null,
    }),
}));
