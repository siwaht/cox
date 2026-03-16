import { useEffect } from 'react';
import { useConnectionStore } from '@/store/connection-store';

const LOCAL_AGENT_NAME = 'Local Agent';

/**
 * Auto-seeds a connection profile pointing to the co-hosted agent
 * (same origin as the frontend). Validates on mount so the CopilotKit
 * bridge activates without any manual setup.
 */
export function useLocalAgent() {
  const { connections, addConnection, setActive, validate } = useConnectionStore();

  useEffect(() => {
    // Already have a local agent connection? Just make sure it's active.
    const existing = connections.find((c) => c.name === LOCAL_AGENT_NAME);
    if (existing) {
      setActive(existing.id);
      validate(existing.id);
      return;
    }

    // Seed a new connection pointing to same origin
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
