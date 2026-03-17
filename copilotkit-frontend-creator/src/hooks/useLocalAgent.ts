import { useEffect, useRef } from 'react';
import { useConnectionStore } from '@/store/connection-store';

const LOCAL_AGENT_NAME = 'Local Agent';

/**
 * Auto-seeds a connection profile pointing to the co-hosted agent
 * (same origin as the frontend). Validates on mount so the CopilotKit
 * bridge activates without any manual setup.
 */
export function useLocalAgent() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const store = useConnectionStore.getState();
    const existing = store.connections.find((c) => c.name === LOCAL_AGENT_NAME);

    if (existing) {
      if (existing.baseUrl !== window.location.origin) {
        store.updateConnection(existing.id, { baseUrl: window.location.origin });
      }
      if (store.activeConnectionId !== existing.id) {
        store.setActive(existing.id);
      }
      store.validate(existing.id);
      return;
    }

    const id = store.addConnection({
      name: LOCAL_AGENT_NAME,
      frontend: 'copilotkit',
      runtime: 'langgraph',
      baseUrl: window.location.origin,
      agentId: 'default',
      auth: { mode: 'none' },
      env: {},
    });

    store.setActive(id);
    store.validate(id);
  }, []);
}
