import React, { createContext, useContext, useMemo } from 'react';
import { useConnectionStore } from '@/store/connection-store';
import { buildRuntimeConfig } from '@/adapters/runtime-adapter';

/**
 * TamboBridge — Parallel to CopilotKitBridge.
 *
 * When a Tambo connection is active, this wraps children with the Tambo context
 * that provides the MCP server URL (pointing at the same LangChain/LangGraph/DeepAgents
 * backend) and the Tambo API key for generative UI orchestration.
 *
 * The key insight: Tambo connects to the SAME backend as CopilotKit would, but via
 * MCP transport. The backend exposes an MCP endpoint that Tambo's client-side SDK
 * connects to, giving Tambo access to the same tools, agents, and capabilities.
 *
 * In a real integration with @tambo-ai/react installed, this would render:
 *   <TamboProvider apiKey={...} mcpServers={[{ url: backendMcpUrl }]} components={...}>
 *
 * For now, we provide the config via context so runtime blocks can adapt their
 * rendering for Tambo's generative UI model.
 */

export interface TamboConfig {
  apiKey: string;
  tamboUrl: string;
  mcpServerUrl: string;
  backendHeaders: Record<string, string>;
  isConnected: boolean;
}

const TamboContext = createContext<TamboConfig>({
  apiKey: '',
  tamboUrl: 'https://api.tambo.co',
  mcpServerUrl: '',
  backendHeaders: {},
  isConnected: false,
});

export const useTamboConfig = () => useContext(TamboContext);

interface Props {
  children: React.ReactNode;
}

export const TamboBridge: React.FC<Props> = ({ children }) => {
  const { activeConnectionId, connections, connectionStatus } = useConnectionStore();
  const activeConn = connections.find((c) => c.id === activeConnectionId);

  const config = useMemo<TamboConfig>(() => {
    if (!activeConn || connectionStatus !== 'connected' || activeConn.runtime !== 'tambo') {
      return { apiKey: '', tamboUrl: '', mcpServerUrl: '', backendHeaders: {}, isConnected: false };
    }

    const rtConfig = buildRuntimeConfig(activeConn);
    return {
      apiKey: rtConfig.properties['tambo-api-key'] as string || '',
      tamboUrl: rtConfig.properties['tambo-url'] as string || 'https://api.tambo.co',
      mcpServerUrl: rtConfig.runtimeUrl,
      backendHeaders: rtConfig.headers,
      isConnected: true,
    };
  }, [activeConn, connectionStatus]);

  if (!config.isConnected) {
    return <>{children}</>;
  }

  // When @tambo-ai/react is installed, this would be:
  //
  // <TamboProvider
  //   apiKey={config.apiKey}
  //   tamboUrl={config.tamboUrl}
  //   userKey="frontend-creator-user"
  //   components={registeredTamboComponents}
  //   mcpServers={[{
  //     url: config.mcpServerUrl,
  //     serverKey: 'agent-backend',
  //     customHeaders: config.backendHeaders,
  //     transport: MCPTransport.HTTP,
  //   }]}
  // >
  //   {children}
  // </TamboProvider>
  //
  // The MCP server URL points to the same LangChain/LangGraph/DeepAgents backend,
  // so Tambo gets access to all the same tools and agent capabilities.

  return (
    <TamboContext.Provider value={config}>
      {children}
    </TamboContext.Provider>
  );
};
