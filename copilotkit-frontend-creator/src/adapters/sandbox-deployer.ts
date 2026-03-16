// ─── Sandbox Deployer ───
// Manages deploying transformed agent code to a Daytona cloud sandbox.
// Uses the Daytona REST API directly from the browser.

export type DeployStatus = 'idle' | 'creating' | 'installing' | 'starting' | 'checking' | 'live' | 'error';

export interface DeployConfig {
  code: string;
  deps: string[];
  envVars: Record<string, string>;
  runtime: string;
  port: number;
}

export interface DeployResult {
  sandboxId: string;
  agentUrl: string;
}

const DAYTONA_API = 'https://app.daytona.io/api';
const AGENT_PORT = 8000;

/** Validate that the transformed code looks deployable */
export function validateForDeploy(code: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!code.includes('add_fastapi_endpoint')) issues.push('Missing CopilotKit endpoint (add_fastapi_endpoint)');
  if (!code.includes('/copilotkit')) issues.push('Missing /copilotkit route');
  if (!code.includes('/health')) issues.push('Missing /health endpoint');
  if (!code.includes('CORSMiddleware')) issues.push('Missing CORS middleware');
  if (!code.includes('app = FastAPI') && !code.includes('app=FastAPI')) issues.push('No FastAPI app instance found');
  return { valid: issues.length === 0, issues };
}

export function createDeployConfig(
  code: string, deps: string[], envVars: Record<string, string>, runtime: string
): DeployConfig {
  return { code, deps, envVars, runtime, port: AGENT_PORT };
}

/** Full deploy pipeline: create sandbox → upload code → install deps → start server */
export async function deploySandbox(
  config: DeployConfig,
  daytonaApiKey: string,
  onLog: (msg: string) => void,
  onStatus: (status: DeployStatus) => void,
): Promise<DeployResult> {
  const headers = {
    'Authorization': `Bearer ${daytonaApiKey}`,
    'Content-Type': 'application/json',
  };

  // 1. Create sandbox
  onStatus('creating');
  onLog('Creating cloud sandbox...');

  const createRes = await fetch(`${DAYTONA_API}/sandbox`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      image: 'python:3.11-slim',
      resources: { cpu: 2, memory: 2, disk: 5 },
      autoStopInterval: 30,
      public: true,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Failed to create sandbox: ${createRes.status} ${err}`);
  }

  const sandbox = await createRes.json();
  const sandboxId = sandbox.id;
  onLog(`Sandbox created: ${sandboxId}`);

  // 2. Wait for sandbox to be ready
  onLog('Waiting for sandbox to start...');
  await waitForSandbox(sandboxId, headers, onLog);

  // 3. Upload agent code
  onStatus('installing');
  onLog('Uploading agent code...');

  await uploadFile(sandboxId, '/home/daytona/agent_server.py', config.code, headers);
  onLog('Uploaded agent_server.py');

  // 4. Upload .env file
  if (Object.keys(config.envVars).length > 0) {
    const envContent = Object.entries(config.envVars)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n') + '\n';
    await uploadFile(sandboxId, '/home/daytona/.env', envContent, headers);
    onLog('Uploaded .env with API keys');
  }

  // 5. Upload requirements.txt
  const reqContent = config.deps.join('\n') + '\n';
  await uploadFile(sandboxId, '/home/daytona/requirements.txt', reqContent, headers);
  onLog('Uploaded requirements.txt');

  // 6. Install dependencies
  onLog('Installing Python dependencies (this may take a minute)...');
  await execCommand(sandboxId, 'pip install -r /home/daytona/requirements.txt', headers, onLog);
  onLog('Dependencies installed');

  // 7. Start uvicorn
  onStatus('starting');
  onLog('Starting agent server...');
  // Start in background with nohup
  await execCommand(
    sandboxId,
    'cd /home/daytona && nohup uvicorn agent_server:app --host 0.0.0.0 --port 8000 > /tmp/uvicorn.log 2>&1 &',
    headers,
    onLog,
  );
  onLog('Server starting on port 8000...');

  // 8. Wait for health check
  onStatus('checking');
  onLog('Waiting for health check...');
  await sleep(3000);

  const healthOk = await checkHealth(sandboxId, headers, onLog);
  if (!healthOk) {
    // Grab logs for debugging
    const logs = await getServerLogs(sandboxId, headers);
    throw new Error(`Health check failed. Server logs:\n${logs}`);
  }
  onLog('Health check passed');

  // 9. Get the public URL
  const agentUrl = `https://${sandboxId}-${AGENT_PORT}.app.daytona.io`;
  onLog(`Agent live at: ${agentUrl}`);
  onStatus('live');

  return { sandboxId, agentUrl };
}

// ─── Helpers ───

async function waitForSandbox(
  id: string, headers: Record<string, string>, onLog: (msg: string) => void
): Promise<void> {
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    try {
      const res = await fetch(`${DAYTONA_API}/sandbox/${id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.state === 'running' || data.state === 'started') {
          onLog('Sandbox is running');
          return;
        }
        onLog(`Sandbox state: ${data.state}...`);
      }
    } catch {
      // retry
    }
  }
  throw new Error('Sandbox did not start within 60 seconds');
}

async function uploadFile(
  sandboxId: string, filePath: string, content: string, headers: Record<string, string>
): Promise<void> {
  const res = await fetch(`${DAYTONA_API}/sandbox/${sandboxId}/filesystem/upload`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ filePath, content, encoding: 'utf-8', overwrite: true }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to upload ${filePath}: ${res.status} ${err}`);
  }
}

async function execCommand(
  sandboxId: string, command: string, headers: Record<string, string>, onLog: (msg: string) => void
): Promise<string> {
  const res = await fetch(`${DAYTONA_API}/sandbox/${sandboxId}/process/execute`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ command, timeout: 120 }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Command failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  if (data.exitCode !== 0 && data.exitCode !== undefined) {
    const output = data.stderr || data.stdout || 'Unknown error';
    onLog(`Command warning: ${output.slice(0, 200)}`);
  }
  return data.stdout || '';
}

async function checkHealth(
  sandboxId: string, headers: Record<string, string>, onLog: (msg: string) => void
): Promise<boolean> {
  for (let i = 0; i < 10; i++) {
    try {
      const result = await execCommand(
        sandboxId,
        'curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health',
        headers,
        onLog,
      );
      if (result.trim() === '200') return true;
      onLog(`Health check attempt ${i + 1}: ${result.trim()}`);
    } catch {
      onLog(`Health check attempt ${i + 1}: waiting...`);
    }
    await sleep(2000);
  }
  return false;
}

async function getServerLogs(
  sandboxId: string, headers: Record<string, string>
): Promise<string> {
  try {
    return await execCommand(sandboxId, 'cat /tmp/uvicorn.log | tail -30', headers, () => {});
  } catch {
    return '(could not retrieve logs)';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
