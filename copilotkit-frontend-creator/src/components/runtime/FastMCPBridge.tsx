import React, { createContext, useContext, useEffect, useState } from 'react';
import { useConnectionStore } from '@/store/connection-store';
import { BlockErrorBoundary } from './BlockErrorBoundary';

const FastMCPLiveContext = createContext(false);
export const useFastMCPLive = () => useContext(FastMCPLiveContext);

interface Props {
  children: React.ReactNode;
}

export const FastMCPBridge: React.FC<Props> = ({ children }) => {
  const { activeConnectionId, connections, connectionStatus } = useConnectionStore();
  const activeConn = connections.find((c) => c.id === activeConnectionId);
  // bridgeError is reserved for future MCP protocol integration (e.g., handshake
  // failures, transport errors). The pattern mirrors TamboBridge for consistent
  // scaffolding so that wiring in a real MCP client later requires minimal changes.
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  const isLive = !!activeConn && connectionStatus === 'connected' && activeConn.frontend === 'fastmcp';

  useEffect(() => {
    if (activeConn && activeConn.frontend === 'fastmcp') {
      console.log('[FastMCPBridge] status=%s, live=%s, url=%s', connectionStatus, isLive, activeConn.baseUrl);
    }
    setBridgeError(null);
  }, [connectionStatus, isLive, activeConn]);

  if (!isLive || !activeConn) return <>{children}</>;

  if (bridgeError) {
    return (
      <>
        <div className="px-4 py-2 bg-danger-soft border-b border-danger/20 text-xs text-danger flex items-center gap-2">
          <span className="line-clamp-2">
            FastMCP connection error: {bridgeError.length > 200 ? bridgeError.slice(0, 200) + '\u2026' : bridgeError}
          </span>
          <button onClick={() => setBridgeError(null)} className="text-2xs underline hover:no-underline shrink-0">Dismiss</button>
        </div>
        {children}
      </>
    );
  }

  return (
    <BlockErrorBoundary blockLabel="FastMCP Bridge">
      <FastMCPLiveContext.Provider value={true}>
        {children}
      </FastMCPLiveContext.Provider>
    </BlockErrorBoundary>
  );
};
