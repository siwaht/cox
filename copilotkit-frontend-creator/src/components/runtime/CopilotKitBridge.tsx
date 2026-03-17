import React, { createContext, useContext, useEffect } from 'react';
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

  const isLive = !!activeConn && connectionStatus === 'connected';

  useEffect(() => {
    if (activeConn) {
      console.log('[CopilotKitBridge] status=%s, live=%s, url=%s', connectionStatus, isLive, activeConn.baseUrl);
    }
  }, [connectionStatus, isLive, activeConn]);

  if (!isLive || !activeConn) {
    return <>{children}</>;
  }

  const config = buildRuntimeConfig(activeConn);

  return (
    <CopilotKit
      runtimeUrl={config.runtimeUrl}
      headers={config.headers}
      properties={config.properties}
      agent={activeConn.agentId || 'agent'}
    >
      <CopilotLiveContext.Provider value={true}>
        {children}
      </CopilotLiveContext.Provider>
    </CopilotKit>
  );
};
