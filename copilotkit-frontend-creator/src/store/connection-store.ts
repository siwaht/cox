import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type {
  ConnectionProfile,
  ConnectionStatus,
  ConnectionValidationResult,
} from '@/types/connections';
import { validateConnection } from '@/adapters/connection-validator';

interface ConnectionStore {
  connections: ConnectionProfile[];
  activeConnectionId: string | null;
  connectionStatus: ConnectionStatus;
  validationResult: ConnectionValidationResult | null;
  healthInterval: ReturnType<typeof setTimeout> | null;

  addConnection: (profile: Omit<ConnectionProfile, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateConnection: (id: string, patch: Partial<ConnectionProfile>) => void;
  removeConnection: (id: string) => void;
  setActive: (id: string | null) => void;
  validate: (id: string) => Promise<ConnectionValidationResult>;
  getActive: () => ConnectionProfile | undefined;
  startHealthCheck: () => void;
  stopHealthCheck: () => void;
}

export const useConnectionStore = create<ConnectionStore>()(
  persist(
    (set, get) => ({
      connections: [],
      activeConnectionId: null,
      connectionStatus: 'idle',
      validationResult: null,
      healthInterval: null,

      addConnection: (profile) => {
        const id = uuid();
        const now = new Date().toISOString();
        const full: ConnectionProfile = { ...profile, id, createdAt: now, updatedAt: now };
        set((s) => ({ connections: [...s.connections, full] }));
        return id;
      },

      updateConnection: (id, patch) =>
        set((s) => ({
          connections: s.connections.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c
          ),
        })),

      removeConnection: (id) =>
        set((s) => ({
          connections: s.connections.filter((c) => c.id !== id),
          activeConnectionId: s.activeConnectionId === id ? null : s.activeConnectionId,
        })),

      setActive: (id) => set({ activeConnectionId: id }),

      validate: async (id) => {
        const conn = get().connections.find((c) => c.id === id);
        if (!conn) {
          const result: ConnectionValidationResult = {
            status: 'error',
            capabilities: [],
            errors: [
              {
                code: 'CONNECTION_NOT_FOUND',
                whatFailed: 'Connection profile not found.',
                likelyReason: 'The connection was deleted or the ID is invalid.',
                nextAction: 'Create a new connection profile.',
                fixLocation: 'frontend configuration',
                severity: 'blocking',
              },
            ],
            warnings: [],
            timestamp: new Date().toISOString(),
          };
          set({ validationResult: result, connectionStatus: 'error' });
          return result;
        }

        set({ connectionStatus: 'validating' });
        const result = await validateConnection(conn);
        const isUsable = result.status === 'ok' || result.status === 'warning';
        set((s) => ({
          connectionStatus: isUsable ? 'connected' : 'error',
          validationResult: result,
          connections: s.connections.map((c) =>
            c.id === id ? { ...c, lastValidation: result, updatedAt: new Date().toISOString() } : c
          ),
        }));
        return result;
      },

      getActive: () => {
        const s = get();
        return s.connections.find((c) => c.id === s.activeConnectionId);
      },

      startHealthCheck: () => {
        const s = get();
        if (s.healthInterval) clearInterval(s.healthInterval);
        let delayMs = 30000;

        const scheduleNext = () => {
          const timeout = setTimeout(async () => {
            const state = get();
            if (!state.activeConnectionId) {
              // Store the timeout so stopHealthCheck can clear it
              set({ healthInterval: scheduleNext() });
              return;
            }
            if (state.connectionStatus === 'connected' || state.connectionStatus === 'error') {
              const result = await state.validate(state.activeConnectionId);
              if (result.status === 'ok' || result.status === 'warning') {
                delayMs = 30000; // reset on success
              } else {
                delayMs = Math.min(delayMs * 1.5, 120000); // exponential backoff, max 2 min
              }
            }
            // Schedule next check with potentially updated delay
            set({ healthInterval: scheduleNext() });
          }, delayMs);
          return timeout;
        };

        set({ healthInterval: scheduleNext() });
      },

      stopHealthCheck: () => {
        const s = get();
        if (s.healthInterval) {
          clearTimeout(s.healthInterval);
          set({ healthInterval: null });
        }
      },
    }),
    { name: 'copilotkit-connections', partialize: (state) => {
      const { healthInterval, ...rest } = state;
      return rest;
    } }
  )
);
