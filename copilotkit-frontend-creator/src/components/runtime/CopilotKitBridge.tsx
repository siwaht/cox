import React from 'react';
import { CopilotKit } from '@copilotkit/react-core';
import { useConnectionStore } from '@/store/connection-store';
import { buildRuntimeConfig } from '@/adapters/runtime-adapter';

// ─── CopilotKit Bridge ───
// Wraps the runtime view with the CopilotKit provider when a valid
// connection is active. The provider connects to the agent runtime
// URL built by the runtime adapter. When no connection is active,
// children render in standalone/simulation mode.

interface Props {
  children: React.ReactNode;
}

export const CopilotKitBridge: React.FC<Props> = ({ children }) => {
  const { activeConnectionId, connections, connectionStatus } = useConnectionStore();
  const activeConn = connections.find((c) => c.id === activeConnectionId);

  if (!activeConn || connectionStatus !== 'connected') {
    // No active connection or not yet validated — simulation mode
    return <>{children}</>;
  }

  const config = buildRuntimeConfig(activeConn);

  return (
    <CopilotKit
      runtimeUrl={config.runtimeUrl}
      headers={config.headers}
      properties={config.properties}
    >
      {children}
    </CopilotKit>
  );
};
