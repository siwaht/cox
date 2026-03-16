// ─── Sandbox Deployer ───
// Deploys transformed agent code to a Daytona cloud sandbox.
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

// Daytona API base
const API = 'https://app.daytona.io/api';
const AGENT_PORT = 8000;

export function validateForDeploy(code: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!code.includes('add_langgraph_fastapi_endpoint')) {
    if (code.includes('add_fastapi_endpoint')) {
      issues.push('Using deprecated add_fastapi_endpoint — must use add_langgraph_fastapi_endpoint instead');
    } else {
      issues.push('Missing CopilotKit endpoint (add_langgraph_fastapi_endpoint)');
    }
  }
  if (!code.includes('/copilotkit')) issues.push('Missing /copilotkit route');
  if (!code.includes('/health')) issues.push('Missing /health endpoint');
  if (!code.includes('CORSMiddleware')) issues.push('Missing CORS middleware');
  if (code.includes('CopilotKitSDK') || code.includes('CopilotKitRemoteEndpoint')) {
    issues.push('Using deprecated CopilotKitSDK/CopilotKitRemoteEndpoint — use add_langgraph_fastapi_endpoint(app, agent, ...) directly');
  }
  return { valid: issues.length === 0, issues };
}

export function createDeployConfig(
  code: string, deps: string[], envVars: Record<string, string>, runtime: string
): DeployConfig {
  return { code, deps, envVars, runtime, port: AGENT_PORT };
}

/** Full deploy pipeline */
export async function deploySandbox(
  config: DeployConfig,
  daytonaApiKey: string,
  onLog: (msg: string) => void,
  onStatus: (status: DeployStatus) => void,
): Promise<DeployResult> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${daytonaApiKey}`,
    'Content-Type': 'application/json',
  };

  // 1. Create sandbox
  onStatus('creating');
  onLog('Creating cloud sandbox...');

  const createRes = await fetch(`${API}/sandbox`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      public: true,
      autoStopInterval: 30,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Failed to create sandbox: ${createRes.status} — ${err}`);
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
  await uploadFile(sandboxId, 'agent_server.py', config.code, headers);
  onLog('Uploaded agent_server.py');

  // 4. Upload .env
  if (Object.keys(config.envVars).length > 0) {
    const envContent = Object.entries(config.envVars).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
    await uploadFile(sandboxId, '.env', envContent, headers);
    onLog('Uploaded .env with API keys');
  }

  // 5. Install dependencies
  onLog('Installing Python dependencies (this may take a minute)...');
  await execCommand(sandboxId, `pip install ${config.deps.join(' ')}`, headers, onLog);
  onLog('Dependencies installed');

  // 6. Start uvicorn
  onStatus('starting');
  onLog('Starting agent server...');
  await execCommand(
    sandboxId,
    'nohup uvicorn agent_server:app --host 0.0.0.0 --port 8000 > /tmp/uvicorn.log 2>&1 &',
    headers,
    onLog,
  );
  onLog('Server starting on port 8000...');

  // 7. Health check
  onStatus('checking');
  onLog('Waiting for health check...');
  await sleep(3000);
  const healthy = await checkHealth(sandboxId, headers, onLog);
  if (!healthy) {
    const logs = await getServerLogs(sandboxId, headers);
    throw new Error(`Health check failed. Server logs:\n${logs}`);
  }
  onLog('Health check passed');

  // 8. Get preview URL
  onLog('Getting public URL...');
  const agentUrl = await getPreviewUrl(sandboxId, AGENT_PORT, headers);
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
      const res = await fetch(`${API}/sandbox/${id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const state = data.state || data.status;
        if (state === 'running' || state === 'started' || state === 'ready') {
          onLog('Sandbox is running');
          return;
        }
        onLog(`Sandbox state: ${state}...`);
      }
    } catch { /* retry */ }
  }
  throw new Error('Sandbox did not start within 60 seconds');
}

async function uploadFile(
  sandboxId: string, filePath: string, content: string, headers: Record<string, string>
): Promise<void> {
  // Daytona toolbox upload uses multipart/form-data
  const formData = new FormData();
  const blob = new Blob([content], { type: 'text/plain' });
  formData.append('file', blob, filePath.split('/').pop() || 'file');

  const uploadHeaders: Record<string, string> = {
    'Authorization': headers['Authorization'],
  };

  const res = await fetch(
    `${API}/toolbox/${sandboxId}/toolbox/files/upload?path=${encodeURIComponent(filePath)}`,
    { method: 'POST', headers: uploadHeaders, body: formData }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to upload ${filePath}: ${res.status} ${err}`);
  }
}

async function execCommand(
  sandboxId: string, command: string, headers: Record<string, string>, onLog: (msg: string) => void
): Promise<string> {
  const res = await fetch(`${API}/toolbox/${sandboxId}/toolbox/process/execute`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ command, timeout: 120 }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Command failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  if (data.exitCode && data.exitCode !== 0) {
    const output = data.stderr || data.stdout || 'Unknown error';
    onLog(`Warning: ${output.slice(0, 300)}`);
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
        headers, onLog,
      );
      if (result.trim() === '200') return true;
      onLog(`Health attempt ${i + 1}: ${result.trim() || 'no response'}`);
    } catch {
      onLog(`Health attempt ${i + 1}: waiting...`);
    }
    await sleep(2000);
  }
  return false;
}

async function getPreviewUrl(
  sandboxId: string, port: number, headers: Record<string, string>
): Promise<string> {
  const res = await fetch(`${API}/sandbox/${sandboxId}/ports/${port}/preview-url`, { headers });
  if (res.ok) {
    const data = await res.json();
    // The API returns the URL — could be a string or an object with url field
    const url = typeof data === 'string' ? data : (data.url || data.previewUrl || data);
    if (typeof url === 'string' && url.startsWith('http')) {
      return url.replace(/\/+$/, '');
    }
  }
  // Fallback: construct from known pattern
  return `https://${sandboxId}-${port}.app.daytona.io`;
}

async function getServerLogs(
  sandboxId: string, headers: Record<string, string>
): Promise<string> {
  try {
    return await execCommand(sandboxId, 'tail -30 /tmp/uvicorn.log', headers, () => {});
  } catch {
    return '(could not retrieve logs)';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
