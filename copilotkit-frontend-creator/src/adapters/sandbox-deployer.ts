// ─── Sandbox Deployer ───
// Manages deploying transformed agent code to a cloud sandbox.
// The sandbox runs the agent server and returns a public URL
// that the frontend auto-connects to.

export type DeployStatus = 'idle' | 'creating' | 'installing' | 'starting' | 'checking' | 'live' | 'error';

export interface DeployState {
  status: DeployStatus;
  sandboxId: string | null;
  agentUrl: string | null;
  previewUrl: string | null;
  logs: string[];
  error: string | null;
}

export interface DeployCallbacks {
  onStatus: (status: DeployStatus) => void;
  onLog: (message: string) => void;
  onComplete: (agentUrl: string, previewUrl: string, sandboxId: string) => void;
  onError: (error: string) => void;
}

const AGENT_PORT = 8000;

/**
 * Deploy transformed agent code to a Daytona sandbox.
 * Returns the sandbox ID for cleanup.
 *
 * This is designed to be called from the UI — it reports progress
 * through callbacks so the component can show real-time status.
 *
 * IMPORTANT: This function is a specification for the deploy flow.
 * The actual Daytona MCP calls are made by the AI agent (Kiro)
 * at deploy time, not by browser JavaScript. The browser cannot
 * call Daytona directly.
 *
 * Instead, the UI stores the deploy intent and the transformed code,
 * and the actual sandbox orchestration happens server-side or
 * through the Kiro agent when the user clicks "Deploy".
 */

/** Build the requirements.txt content from deps list */
export function buildRequirements(deps: string[]): string {
  return deps.join('\n') + '\n';
}

/** Build the .env file content */
export function buildEnvFile(envVars: Record<string, string>): string {
  return Object.entries(envVars)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n') + '\n';
}

/** Validate that the transformed code looks deployable */
export function validateForDeploy(code: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!code.includes('add_fastapi_endpoint')) {
    issues.push('Missing CopilotKit endpoint setup (add_fastapi_endpoint)');
  }
  if (!code.includes('/copilotkit')) {
    issues.push('Missing /copilotkit route');
  }
  if (!code.includes('/health')) {
    issues.push('Missing /health endpoint');
  }
  if (!code.includes('CORSMiddleware')) {
    issues.push('Missing CORS middleware — browser requests will be blocked');
  }
  if (!code.includes('app = FastAPI') && !code.includes('app=FastAPI')) {
    issues.push('No FastAPI app instance found');
  }

  return { valid: issues.length === 0, issues };
}

/** The deploy config that gets stored and used by the agent */
export interface DeployConfig {
  code: string;
  deps: string[];
  envVars: Record<string, string>;
  runtime: string;
  port: number;
}

export function createDeployConfig(
  code: string,
  deps: string[],
  envVars: Record<string, string>,
  runtime: string
): DeployConfig {
  return { code, deps, envVars, runtime, port: AGENT_PORT };
}
