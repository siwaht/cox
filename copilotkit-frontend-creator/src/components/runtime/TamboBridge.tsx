import React, { createContext, useContext, useEffect, useState } from 'react';
import { useConnectionStore } from '@/store/connection-store';
import { BlockErrorBoundary } from './BlockErrorBoundary';

const TamboLiveContext = createContext(false);
export const useTamboLive = () => useContext(TamboLiveContext);

interface Props {
  children: React.ReactNode;
}

export const TamboBridge: React.FC<Props> = ({ children }) => {
  const { activeConnectionId, connections, connectionStatus } = useConnectionStore();
  const activeConn = connections.find((c) => c.id === activeConnectionId);
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  const isLive = !!activeConn && connectionStatus === 'connected' && activeConn.frontend === 'tambo';

  useEffect(() => {
    if (activeConn && activeConn.frontend === 'tambo') {
      console.log('[TamboBridge] status=%s, live=%s, url=%s', connectionStatus, isLive, activeConn.baseUrl);
    }
    setBridgeError(null);
  }, [connectionStatus, isLive, activeConn]);

  if (!isLive || !activeConn) return <>{children}</>;

  if (bridgeError) {
    return (
      <>
        <div className="px-4 py-2 bg-danger-soft border-b border-danger/20 text-xs text-danger flex items-center gap-2">
          <span className="line-clamp-2">
            Tambo connection error: {bridgeError.length > 200 ? bridgeError.slice(0, 200) + '…' : bridgeError}
          </span>
          <button onClick={() => setBridgeError(null)} className="text-2xs underline hover:no-underline shrink-0">Dismiss</button>
        </div>
        {children}
      </>
    );
  }

  return (
    <BlockErrorBoundary blockLabel="Tambo Bridge">
      <TamboLiveContext.Provider value={true}>
        {children}
      </TamboLiveContext.Provider>
    </BlockErrorBoundary>
  );
};
