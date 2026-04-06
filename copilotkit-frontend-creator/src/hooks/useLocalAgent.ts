import { useEffect, useRef } from 'react';
import { useConnectionStore } from '@/store/connection-store';
import { useFrameworkStore } from '@/store/framework-store';
import type { RuntimeType } from '@/types/connections';

const LOCAL_AGENT_NAME = 'Local Agent';

/**
 * Auto-seeds a connection profile pointing to the co-hosted agent
 * (same origin as the frontend). Probes the /health endpoint to
 * detect whether the backend is running a deep agent or standard
 * langgraph agent, then validates so the CopilotKit bridge activates
 * without any manual setup.
 */
export function useLocalAgent() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const store = useConnectionStore.getState();

    // Probe the backend to detect runtime type
    detectRuntime(window.location.origin).then((runtime) => {
      const existing = store.connections.find((c) => c.name === LOCAL_AGENT_NAME);

      if (existing) {
        const needsUpdate: Partial<typeof existing> = {};
        if (existing.baseUrl !== window.location.origin) {
          needsUpdate.baseUrl = window.location.origin;
        }
        if (existing.agentId !== 'agent') {
          needsUpdate.agentId = 'agent';
        }
        if (existing.runtime !== runtime) {
          needsUpdate.runtime = runtime;
        }
        if (Object.keys(needsUpdate).length > 0) {
          store.updateConnection(existing.id, needsUpdate);
        }
        if (store.activeConnectionId !== existing.id) {
          store.setActive(existing.id);
        }
        store.validate(existing.id);
        return;
      }

      const id = store.addConnection({
        name: LOCAL_AGENT_NAME,
        frontend: useFrameworkStore.getState().framework,
        runtime,
        baseUrl: window.location.origin,
        agentId: 'agent',
        auth: { mode: 'none' },
        env: {},
      });

      store.setActive(id);
      store.validate(id);
    });
  }, []);
}

/**
 * Probes the backend /health endpoint to detect if it's running
 * a deep agent (which exposes sub_agents/subagents capability).
 * Falls back to 'langgraph' if detection fails.
 */
async function detectRuntime(baseUrl: string): Promise<RuntimeType> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${baseUrl}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const body = await res.json();
      // If the health endpoint reports sub_agents or subagents,
      // treat this as a deep agent backend
      if (body.sub_agents || body.subagents) {
        return 'deepagents';
      }
    }
  } catch {
    // Health probe failed, use default
  }
  return 'langgraph';
}