import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DeployStatus, DeployConfig } from '@/adapters/sandbox-deployer';
import { deploySandbox } from '@/adapters/sandbox-deployer';

interface DeployStore {
  status: DeployStatus;
  sandboxId: string | null;
  agentUrl: string | null;
  logs: string[];
  error: string | null;
  deployConfig: DeployConfig | null;

  // Persisted API keys
  daytonaApiKey: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  customEnvVars: Record<string, string>;

  // Actions
  setStatus: (status: DeployStatus) => void;
  addLog: (message: string) => void;
  setDeployConfig: (config: DeployConfig) => void;
  setSandboxInfo: (sandboxId: string, agentUrl: string) => void;
  setError: (error: string) => void;
  reset: () => void;

  // Key management
  setDaytonaApiKey: (key: string) => void;
  setOpenaiApiKey: (key: string) => void;
  setAnthropicApiKey: (key: string) => void;
  setCustomEnvVar: (key: string, value: string) => void;
  removeCustomEnvVar: (key: string) => void;

  // Deploy action
  deploy: (config: DeployConfig) => Promise<void>;
}

export const useDeployStore = create<DeployStore>()(
  persist(
    (set, get) => ({
      status: 'idle',
      sandboxId: null,
      agentUrl: null,
      logs: [],
      error: null,
      deployConfig: null,

      daytonaApiKey: '',
      openaiApiKey: '',
      anthropicApiKey: '',
      customEnvVars: {},

      setStatus: (status) => set({ status }),
      addLog: (message) =>
        set((s) => ({ logs: [...s.logs, `[${new Date().toLocaleTimeString()}] ${message}`] })),
      setDeployConfig: (config) => set({ deployConfig: config }),
      setSandboxInfo: (sandboxId, agentUrl) =>
        set({ sandboxId, agentUrl, status: 'live' }),
      setError: (error) => set({ error, status: 'error' }),
      reset: () =>
        set({ status: 'idle', sandboxId: null, agentUrl: null, logs: [], error: null, deployConfig: null }),

      setDaytonaApiKey: (key) => set({ daytonaApiKey: key }),
      setOpenaiApiKey: (key) => set({ openaiApiKey: key }),
      setAnthropicApiKey: (key) => set({ anthropicApiKey: key }),
      setCustomEnvVar: (key, value) =>
        set((s) => ({ customEnvVars: { ...s.customEnvVars, [key]: value } })),
      removeCustomEnvVar: (key) =>
        set((s) => {
          const { [key]: _, ...rest } = s.customEnvVars;
          return { customEnvVars: rest };
        }),

      deploy: async (config) => {
        const state = get();
        if (!state.daytonaApiKey) {
          set({ error: 'Daytona API key is required. Get one at app.daytona.io', status: 'error' });
          return;
        }

        // Build env vars from all stored keys
        const envVars: Record<string, string> = { ...config.envVars };
        if (state.openaiApiKey) envVars['OPENAI_API_KEY'] = state.openaiApiKey;
        if (state.anthropicApiKey) envVars['ANTHROPIC_API_KEY'] = state.anthropicApiKey;
        Object.entries(state.customEnvVars).forEach(([k, v]) => {
          if (v) envVars[k] = v;
        });

        const fullConfig = { ...config, envVars };

        set({ status: 'creating', logs: [], error: null, deployConfig: fullConfig });

        try {
          const result = await deploySandbox(
            fullConfig,
            state.daytonaApiKey,
            (msg) => set((s) => ({ logs: [...s.logs, `[${new Date().toLocaleTimeString()}] ${msg}`] })),
            (status) => set({ status }),
          );
          set({ sandboxId: result.sandboxId, agentUrl: result.agentUrl, status: 'live' });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          set((s) => ({
            error: message,
            status: 'error',
            logs: [...s.logs, `[${new Date().toLocaleTimeString()}] ERROR: ${message}`],
          }));
        }
      },
    }),
    {
      name: 'copilotkit-deploy',
      partialize: (state) => ({
        daytonaApiKey: state.daytonaApiKey,
        openaiApiKey: state.openaiApiKey,
        anthropicApiKey: state.anthropicApiKey,
        customEnvVars: state.customEnvVars,
      }),
    }
  )
);
