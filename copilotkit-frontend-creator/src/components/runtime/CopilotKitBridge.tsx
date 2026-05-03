import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CopilotKit } from '@copilotkit/react-core';
import { HttpAgent } from '@ag-ui/client';
import { useConnectionStore } from '@/store/connection-store';
import { buildRuntimeConfig } from '@/adapters/runtime-adapter';
import { BlockErrorBoundary } from './BlockErrorBoundary';
import { CopilotAgentEventsSync } from '@/hooks/useCopilotAgentEvents';

// Context to let child components know they're inside a live CopilotKit provider
const CopilotLiveContext = createContext(false);
export const useCopilotLive = () => useContext(CopilotLiveContext);

interface Props {
  children: React.ReactNode;
}

export const CopilotKitBridge: React.FC<Props> = ({ children }) => {
  const { activeConnectionId, connections, connectionStatus } = useConnectionStore();
  const activeConn = connections.find((c) => c.id === activeConnectionId);
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  const isLive = !!activeConn && connectionStatus === 'connected';

  useEffect(() => {
    if (activeConn) {
      console.log(
        '[CopilotKitBridge] status=%s, live=%s, url=%s',
        connectionStatus,
        isLive,
        activeConn.baseUrl,
      );
    }
    setBridgeError(null);
  }, [connectionStatus, isLive, activeConn]);

  if (!isLive || !activeConn) {
    return <>{children}</>;
  }

  if (bridgeError) {
    return (
      <>
        <div className="px-4 py-2 bg-danger-soft border-b border-danger/20 text-xs text-danger flex items-center gap-2">
          <span className="line-clamp-2">
            CopilotKit connection error:{' '}
            {bridgeError.length > 200 ? bridgeError.slice(0, 200) + '…' : bridgeError}
          </span>
          <button
            onClick={() => setBridgeError(null)}
            className="text-2xs underline hover:no-underline shrink-0"
          >
            Dismiss
          </button>
        </div>
        {children}
      </>
    );
  }

  const config = buildRuntimeConfig(activeConn);

  // The backend mounts a single AG-UI endpoint at /copilotkit. CopilotKit's
  // legacy useCopilotChat resolves agentId to "default" when no override is
  // set, and the HttpAgent's agentId MUST equal its registration key. So we
  // standardize on "default" end-to-end. activeConn.agentId is currently
  // informational only; if/when the backend mounts multiple named agents,
  // map activeConn.agentId → registration key and update the /copilotkit/info
  // stub on the server to advertise them.
  const headersKey = JSON.stringify(config.headers);
  const agents = useMemo(() => {
    const httpAgent = new HttpAgent({
      agentId: 'default',
      url: config.runtimeUrl,
      headers: config.headers,
    });
    return { default: httpAgent };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.runtimeUrl, headersKey]);

  return (
    <BlockErrorBoundary blockLabel="CopilotKit Bridge">
      <CopilotKit
        runtimeUrl={config.runtimeUrl}
        headers={config.headers}
        properties={config.properties}
        agent="default"
        agents__unsafe_dev_only={agents}
        showDevConsole={false}
      >
        <CopilotAgentEventsSync />
        <CopilotLiveContext.Provider value={true}>
          {children}
        </CopilotLiveContext.Provider>
      </CopilotKit>
    </BlockErrorBoundary>
  );
};
