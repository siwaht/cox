import React, { createContext, useContext } from 'react';
import { CopilotKit } from '@copilotkit/react-core';
import { useConnectionStore } from '@/store/connection-store';
import { buildRuntimeConfig } from '@/adapters/runtime-adapter';

// Context to let child components know they're inside a live CopilotKit provider
const CopilotLiveContext = createContext(false);
export const useCopilotLive = () => useContext(CopilotLiveContext);

interface Props {
  children: React.ReactNode;
}

export const CopilotKitBridge: React.FC<Props> = ({ children }) => {
  const { activeConnectionId, connections, connectionStatus } = useConnectionStore();
  const activeConn = connections.find((c) => c.id === activeConnectionId);

  if (!activeConn || connectionStatus !== 'connected') {
    return <>{children}</>;
  }

  const config = buildRuntimeConfig(activeConn);

  return (
    <CopilotKit
      runtimeUrl={config.runtimeUrl}
      headers={config.headers}
      properties={config.properties}
    >
      <CopilotLiveContext.Provider value={true}>
        {children}
      </CopilotLiveContext.Provider>
    </CopilotKit>
  );
};
