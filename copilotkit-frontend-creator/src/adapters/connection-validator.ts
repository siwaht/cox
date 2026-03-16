import type {
  ConnectionProfile,
  ConnectionValidationResult,
  DiagnosticError,
  RuntimeType,
} from '@/types/connections';

// ─── Connection Validator ───
// Validates a connection profile before enabling the frontend.
// Produces precise, actionable diagnostics per the error contract.

export async function validateConnection(
  profile: ConnectionProfile
): Promise<ConnectionValidationResult> {
  const errors: DiagnosticError[] = [];
  const warnings: DiagnosticError[] = [];
  const capabilities: string[] = [];

  // 1. URL validation
  if (!profile.baseUrl) {
    errors.push({
      code: 'MISSING_BASE_URL',
      whatFailed: 'No base URL provided for the agent endpoint.',
      likelyReason: 'The connection profile is missing the baseUrl field.',
      nextAction: 'Add the agent endpoint URL in the connection settings.',
      fixLocation: 'frontend configuration',
      severity: 'blocking',
    });
    return result('error', capabilities, errors, warnings);
  }

  try {
    new URL(profile.baseUrl);
  } catch {
    errors.push({
      code: 'INVALID_URL',
      whatFailed: `The URL "${profile.baseUrl}" is not a valid URL.`,
      likelyReason: 'The URL is malformed or missing the protocol (http/https).',
      nextAction: 'Fix the URL format. Example: http://localhost:2024 or https://agent.example.com',
      fixLocation: 'frontend configuration',
      severity: 'blocking',
    });
    return result('error', capabilities, errors, warnings);
  }

  // 2. Agent ID check for runtimes that require it
  const requiresAgentId: RuntimeType[] = ['langgraph', 'deepagents'];
  if (requiresAgentId.includes(profile.runtime) && !profile.agentId) {
    errors.push({
      code: 'MISSING_AGENT_ID',
      whatFailed: 'The frontend reached the server, but no agent identifier was provided.',
      likelyReason: `The "${profile.runtime}" runtime requires an explicit agent, assistant, or graph ID.`,
      nextAction: 'Add the correct ID in the connection settings and run connection validation again.',
      fixLocation: 'frontend configuration',
      severity: 'blocking',
    });
  }

  // 3. Auth validation
  if (profile.auth.mode === 'bearer' && !profile.auth.tokenEnv && !profile.auth.tokenValue) {
    errors.push({
      code: 'MISSING_AUTH_TOKEN',
      whatFailed: 'Bearer auth is configured but no token source is provided.',
      likelyReason: 'Neither tokenEnv nor tokenValue is set in the auth configuration.',
      nextAction: 'Set tokenEnv to the environment variable name holding your token, or provide tokenValue for local dev.',
      fixLocation: 'authentication',
      severity: 'blocking',
    });
  }

  if (profile.auth.mode === 'api-key' && !profile.auth.tokenEnv && !profile.auth.tokenValue) {
    errors.push({
      code: 'MISSING_API_KEY',
      whatFailed: 'API key auth is configured but no key source is provided.',
      likelyReason: 'Neither tokenEnv nor tokenValue is set in the auth configuration.',
      nextAction: 'Set tokenEnv to the environment variable name holding your API key.',
      fixLocation: 'authentication',
      severity: 'blocking',
    });
  }

  if (profile.auth.mode === 'custom-header' && !profile.auth.headerName) {
    errors.push({
      code: 'MISSING_CUSTOM_HEADER_NAME',
      whatFailed: 'Custom header auth is configured but no header name is specified.',
      likelyReason: 'The headerName field is empty in the auth configuration.',
      nextAction: 'Specify the custom header name (e.g., X-Api-Key).',
      fixLocation: 'authentication',
      severity: 'blocking',
    });
  }

  // If we already have blocking errors, return early
  if (errors.length > 0) {
    return result('error', capabilities, errors, warnings);
  }

  // 4. Reachability check
  try {
    const healthUrl = getHealthEndpoint(profile);
    const headers = buildAuthHeaders(profile);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(healthUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.status === 401 || response.status === 403) {
      errors.push({
        code: 'AUTH_FAILURE',
        whatFailed: `The agent endpoint returned ${response.status} ${response.statusText}.`,
        likelyReason: 'The authentication credentials are invalid or expired.',
        nextAction: 'Check your auth token/key and ensure it has the correct permissions.',
        fixLocation: 'authentication',
        severity: 'blocking',
      });
      return result('error', capabilities, errors, warnings);
    }

    if (response.status === 404) {
      warnings.push({
        code: 'HEALTH_ENDPOINT_NOT_FOUND',
        whatFailed: `Health endpoint ${healthUrl} returned 404.`,
        likelyReason: 'The agent server may not expose a standard health endpoint.',
        nextAction: 'This is non-blocking. The agent may still work. Proceed and monitor for errors.',
        fixLocation: 'agent configuration',
        severity: 'warning',
      });
    } else if (!response.ok) {
      errors.push({
        code: 'ENDPOINT_ERROR',
        whatFailed: `The agent endpoint returned ${response.status} ${response.statusText}.`,
        likelyReason: 'The server is running but returned an unexpected error.',
        nextAction: 'Check the agent server logs for details.',
        fixLocation: 'agent configuration',
        severity: 'blocking',
      });
      return result('error', capabilities, errors, warnings);
    }

    // 5. Probe capabilities from response
    try {
      const body = await response.json();
      capabilities.push(...probeCapabilities(body, profile.runtime));
    } catch {
      // Non-JSON response is fine for health checks
      capabilities.push('chat', 'streaming');
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes('abort') || message.includes('timeout')) {
      errors.push({
        code: 'ENDPOINT_TIMEOUT',
        whatFailed: `The agent endpoint at "${profile.baseUrl}" did not respond within 8 seconds.`,
        likelyReason: 'The server is not running, is unreachable, or is behind a slow network.',
        nextAction: 'Verify the server is running and the URL is correct. Check firewall/proxy settings.',
        fixLocation: 'network/infrastructure',
        severity: 'blocking',
      });
    } else if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      errors.push({
        code: 'NETWORK_ERROR',
        whatFailed: `Cannot reach "${profile.baseUrl}".`,
        likelyReason: 'CORS policy is blocking the request, the server is down, or the URL is wrong.',
        nextAction: 'If running locally, ensure the agent server has CORS enabled for localhost:3000. If remote, check network connectivity.',
        fixLocation: 'network/infrastructure',
        severity: 'blocking',
      });
    } else {
      errors.push({
        code: 'CONNECTION_FAILED',
        whatFailed: `Connection to "${profile.baseUrl}" failed: ${message}`,
        likelyReason: 'Unexpected network or configuration error.',
        nextAction: 'Check the URL, network settings, and agent server status.',
        fixLocation: 'network/infrastructure',
        severity: 'blocking',
      });
    }
    return result('error', capabilities, errors, warnings);
  }

  // 6. Runtime-specific warnings
  if (capabilities.length === 0) {
    capabilities.push('chat'); // minimum fallback
    warnings.push({
      code: 'MINIMAL_CAPABILITIES',
      whatFailed: 'Could not detect advanced capabilities from the agent.',
      likelyReason: 'The agent health endpoint does not expose capability metadata.',
      nextAction: 'The frontend will use fallback mode. Rich features like tool activity and approvals may not render.',
      fixLocation: 'agent configuration',
      severity: 'warning',
    });
  }

  return result(
    errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok',
    capabilities,
    errors,
    warnings
  );
}

// ─── Helpers ───

function result(
  status: 'ok' | 'error' | 'warning',
  capabilities: string[],
  errors: DiagnosticError[],
  warnings: DiagnosticError[]
): ConnectionValidationResult {
  return { status, capabilities, errors, warnings, timestamp: new Date().toISOString() };
}

function getHealthEndpoint(profile: ConnectionProfile): string {
  const base = profile.baseUrl.replace(/\/+$/, '');
  switch (profile.runtime) {
    case 'langgraph':
      return `${base}/ok`;
    case 'deepagents':
      return `${base}/health`;
    case 'langchain':
    default:
      return `${base}/health`;
  }
}

function buildAuthHeaders(profile: ConnectionProfile): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
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

function probeCapabilities(body: Record<string, unknown>, runtime: string): string[] {
  const caps: string[] = ['chat', 'streaming'];

  if (body.tools || body.tool_calls) caps.push('toolCalls', 'toolResults');
  if (body.approvals || body.human_in_the_loop) caps.push('approvals');
  if (body.structured_output || body.output_schema) caps.push('structuredOutput');
  if (body.logs || body.logging) caps.push('logs');
  if (body.subagents || body.sub_agents) caps.push('subagents');
  if (body.progress || body.status) caps.push('progress');
  if (body.intermediate_state || body.intermediate_steps) caps.push('intermediateState');

  // Runtime-specific defaults
  if (runtime === 'langgraph') {
    if (!caps.includes('intermediateState')) caps.push('intermediateState');
    if (!caps.includes('toolCalls')) caps.push('toolCalls');
  }
  if (runtime === 'deepagents') {
    if (!caps.includes('subagents')) caps.push('subagents');
    if (!caps.includes('progress')) caps.push('progress');
  }

  return [...new Set(caps)];
}
