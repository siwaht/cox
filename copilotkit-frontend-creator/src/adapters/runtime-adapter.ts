import type { ConnectionProfile, RuntimeType, FrontendType } from '@/types/connections';

// ─── Runtime Adapter ───
// Translates connection profiles into runtime configuration for CopilotKit or Tambo.

export interface RuntimeConfig {
  runtimeUrl: string;
  headers: Record<string, string>;
  properties: Record<string, unknown>;
}

/**
 * Build the backend runtime config. Used by CopilotKitBridge and TamboBridge.
 */
export function buildRuntimeConfig(profile: ConnectionProfile): RuntimeConfig {
  const base = profile.baseUrl.replace(/\/+$/, '');
  const headers = buildHeaders(profile);

  // Tambo uses a different URL pattern
  if (profile.frontend === 'tambo') {
    return {
      runtimeUrl: `${base}/api`,
      headers,
      properties: {
        frontend: 'tambo',
        runtime: profile.runtime,
        ...(profile.env || {}),
      },
    };
  }

  // CopilotKit runtime builders
  const builders: Record<RuntimeType, () => RuntimeConfig> = {
    langchain: () => ({
      runtimeUrl: `${base}/copilotkit`,
      headers,
      properties: {
        runtime: 'langchain',
        ...(profile.env || {}),
      },
    }),
    langgraph: () => ({
      runtimeUrl: `${base}/copilotkit`,
      headers,
      properties: {
        runtime: 'langgraph',
        'langgraph-agent-id': profile.agentId || 'agent',
        ...(profile.env || {}),
      },
    }),
    langsmith: () => ({
      runtimeUrl: `${base}/copilotkit`,
      headers,
      properties: {
        runtime: 'langsmith',
        'langsmith-project': profile.agentId || 'default',
        ...(profile.env || {}),
      },
    }),
    deepagents: () => ({
      runtimeUrl: `${base}/copilotkit`,
      headers,
      properties: {
        runtime: 'deepagents',
        'langgraph-agent-id': profile.agentId || 'agent',
        ...(profile.env || {}),
      },
    }),
  };

  return builders[profile.runtime]();
}

function buildHeaders(profile: ConnectionProfile): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = profile.auth.tokenValue || '';

  switch (profile.auth.mode) {
    case 'bearer':
      if (token) headers['Authorization'] = `Bearer ${token}`;
      break;
    case 'api-key':
      if (token) headers['X-API-Key'] = token;
      break;
    case 'custom-header':
      if (profile.auth.headerName && token) headers[profile.auth.headerName] = token;
      break;
  }
  return headers;
}

/** Determine which blocks are fully supported by the detected capabilities */
export function getCompatibleBlocks(
  capabilities: string[],
  requestedBlocks: string[],
  frontend?: FrontendType,
): { supported: string[]; unsupported: string[]; fallback: string[] } {
  const capSet = new Set(capabilities);

  const blockCapMap: Record<string, string[]> = {
    chat: ['chat'],
    results: ['structuredOutput'],
    toolActivity: ['toolCalls'],
    approvals: ['approvals'],
    logs: ['logs'],
    status: ['progress'],
    form: [],
    table: ['structuredOutput'],
    chart: ['structuredOutput'],
    dashboard: ['structuredOutput'],
    cards: ['structuredOutput'],
    panel: [],
    markdown: [],
    traceViewer: ['logs', 'toolCalls'],
    feedback: [],
    dataset: ['structuredOutput'],
    annotationQueue: ['approvals'],
    reasoningChain: ['intermediateState'],
    subAgentTree: ['subagents'],
    depthIndicator: ['progress'],
  };

  const supported: string[] = [];
  const unsupported: string[] = [];

  for (const block of requestedBlocks) {
    const required = blockCapMap[block] || [];
    if (required.length === 0 || required.every((c) => capSet.has(c))) {
      supported.push(block);
    } else {
      unsupported.push(block);
    }
  }

  const fallback = ['chat', 'status', 'logs'];

  return { supported, unsupported, fallback };
}
