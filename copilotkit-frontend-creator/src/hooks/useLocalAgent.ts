import { useEffect } from 'react';
import { useConnectionStore } from '@/store/connection-store';

const LOCAL_AGENT_NAME = 'Local Agent';

/**
 * Auto-seeds a connection profile pointing to the co-hosted agent
 * (same origin as the frontend). Validates on mount so the CopilotKit
 * bridge activates without any manual setup.
 */
export function useLocalAgent() {
  const connections = useConnectionStore((s) => s.connections);
  const addConnection = useConnectionStore((s) => s.addConnection);
  const setActive = useConnectionStore((s) => s.setActive);
  const validate = useConnectionStore((s) => s.validate);
  const activeConnectionId = useConnectionStore((s) => s.activeConnectionId);

  useEffect(() => {
    // Already have a local agent connection? Just make sure it's active.
    const existing = connections.find((c) => c.name === LOCAL_AGENT_NAME);
    if (existing) {
      // Update baseUrl if origin changed (e.g. Replit assigned a new URL)
      if (existing.baseUrl !== window.location.origin) {
        useConnectionStore.getState().updateConnection(existing.id, {
          baseUrl: window.location.origin,
        });
      }
      if (activeConnectionId !== existing.id) {
        setActive(existing.id);
      }
      console.log('[useLocalAgent] Validating existing connection:', existing.baseUrl);
      validate(existing.id);
      return;
    }

    // Seed a new connection pointing to same origin
    console.log('[useLocalAgent] Creating new local agent connection:', window.location.origin);
    const id = addConnection({
      name: LOCAL_AGENT_NAME,
      frontend: 'copilotkit',
      runtime: 'langgraph',
      baseUrl: window.location.origin,
      agentId: 'agent',
      auth: { mode: 'none' },
      env: {},
    });

    setActive(id);
    validate(id);
  }, [connections.length]); // Re-run when connections change (e.g. after hydration)
}
