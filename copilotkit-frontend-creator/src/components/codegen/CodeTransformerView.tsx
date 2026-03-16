import React, { useState, useCallback, useMemo } from 'react';
import {
  Code2, Copy, Check, Wand2, AlertTriangle, ChevronDown,
  Rocket, Loader2, Terminal, Plug, ExternalLink, RotateCcw,
  Key, Plus, X, Monitor, Cloud, Trash2, CheckCircle2, XCircle, Download,
} from 'lucide-react';
import { useDeployStore } from '@/store/deploy-store';
import { useConnectionStore } from '@/store/connection-store';
import { useWorkspaceStore } from '@/store/workspace-store';
import { validateForDeploy, createDeployConfig } from '@/adapters/sandbox-deployer';
import { getBlockDefinition } from '@/registry/block-registry';
import type { RuntimeCapability, BlockConfig } from '@/types/blocks';

type RuntimeType = 'langchain' | 'langgraph' | 'deepagents';
type DeployPath = 'choose' | 'sandbox' | 'selfhost';

interface TransformResult {
  code: string;
  runtime: RuntimeType;
  warnings: string[];
  deps: string[];
  runCommand: string;
}

// ─── Placeholder ───
const PLACEHOLDER = `# Paste your agent code here
# Supports LangChain, LangGraph, and Deep Agents
#
# Example:
#   from langchain.agents import create_agent
#   agent = create_agent(model="openai:gpt-4o", tools=[...])
#   app = FastAPI()
#   ...
#
# The transformer will add:
#   - CopilotKit endpoint (/copilotkit)
#   - Health check (/health)
#   - CORS middleware
#   - Proper uvicorn entrypoint
#
# Your original logic stays intact.`;

// ─── Runtime detection ───
function detectRuntime(code: string, override: RuntimeType | 'auto'): RuntimeType {
  if (override !== 'auto') return override;
  if (/from\s+langgraph|StateGraph|CompiledGraph/.test(code)) return 'langgraph';
  if (/from\s+deepagents|DeepAgent/.test(code)) return 'deepagents';
  return 'langchain';
}

// ─── Capability detection from pasted code ───
function detectCodeCapabilities(code: string, runtime: RuntimeType): Set<RuntimeCapability> {
  const caps = new Set<RuntimeCapability>();

  // Chat & streaming — CopilotKit always provides these via the SDK
  if (/CopilotKit|copilotkit|useCopilotChat|appendMessage/.test(code)) {
    caps.add('chat');
    caps.add('streaming');
  }
  // LangGraph / LangChain agents inherently support chat + streaming
  if (runtime === 'langgraph' || runtime === 'langchain') {
    caps.add('chat');
    caps.add('streaming');
  }

  // Tool calls
  if (/tools\s*=\s*\[|@tool|Tool\(|StructuredTool|BaseTool|bind_tools|\.tools/.test(code)) {
    caps.add('toolCalls');
    caps.add('toolResults');
  }

  // Approvals / human-in-the-loop
  if (/interrupt_before|interrupt_after|human_in_the_loop|HumanApproval|approval|ask_human/.test(code)) {
    caps.add('approvals');
  }

  // Structured output
  if (/BaseModel|TypedDict|Pydantic|structured_output|json_schema|\.parse|response_format/.test(code)) {
    caps.add('structuredOutput');
  }

  // Logs
  if (/logging|logger|getLogger|print\(|console\.log|verbose\s*=\s*True/.test(code)) {
    caps.add('logs');
  }

  // Progress / status
  if (/progress|status|callback|on_chain_start|on_chain_end|StreamEvent/.test(code)) {
    caps.add('progress');
  }

  // Intermediate state (LangGraph state)
  if (/StateGraph|state_schema|AgentState|MessagesState/.test(code)) {
    caps.add('intermediateState');
  }

  // Subagents
  if (/create_agent|AgentExecutor|multi.?agent|supervisor|crew/i.test(code)) {
    caps.add('subagents');
  }

  // Form — always compatible (no runtime requirement)
  // Panel, Markdown — always compatible (no runtime requirement)

  return caps;
}

interface BlockCompatibility {
  block: BlockConfig;
  compatible: boolean;
  missingCapabilities: RuntimeCapability[];
}

function checkBlockCompatibility(
  blocks: BlockConfig[],
  codeCapabilities: Set<RuntimeCapability>,
): BlockCompatibility[] {
  return blocks.map((block) => {
    const def = getBlockDefinition(block.type);
    const required = def?.requiredCapabilities ?? [];
    // Blocks with no required capabilities are always compatible
    if (required.length === 0) {
      return { block, compatible: true, missingCapabilities: [] };
    }
    const missing = required.filter((cap) => !codeCapabilities.has(cap));
    return { block, compatible: missing.length === 0, missingCapabilities: missing };
  });
}

// ─── Code transformer ───
function transformCode(input: string, runtime: RuntimeType): TransformResult {
  const warnings: string[] = [];
  let code = input.trim();
  const lines = code.split('\n');

  // Collect existing imports
  const hasImport = (mod: string) => code.includes(mod);
  const hasFastAPI = hasImport('FastAPI');
  const hasCORS = hasImport('CORSMiddleware');
  const hasCopilotKit = hasImport('add_fastapi_endpoint') || hasImport('CopilotKitSDK');
  const hasHealth = /def\s+health/.test(code);
  const hasUvicorn = hasImport('uvicorn');
  const hasDotenv = hasImport('dotenv') || hasImport('load_dotenv');

  // Build new imports block
  const newImports: string[] = [];
  if (!hasDotenv) newImports.push('from dotenv import load_dotenv');
  if (!hasFastAPI) newImports.push('from fastapi import FastAPI');
  if (!hasCORS) newImports.push('from fastapi.middleware.cors import CORSMiddleware');
  if (!hasCopilotKit) {
    newImports.push('from copilotkit.integrations.fastapi import CopilotKitSDK, CopilotKitSDKRoute');
    newImports.push('from copilotkit import LangGraphAgent');
  }
  if (!hasUvicorn) newImports.push('import uvicorn');

  // Find where imports end
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('import ') || l.startsWith('from ') || l === '' || l.startsWith('#')) {
      lastImportIdx = i;
    } else break;
  }

  // Insert new imports after existing ones
  if (newImports.length > 0) {
    const insertAt = lastImportIdx + 1;
    lines.splice(insertAt, 0, '', '# --- Added by CopilotKit Transformer ---', ...newImports, '');
  }

  // Ensure load_dotenv() call
  if (!code.includes('load_dotenv()')) {
    const dotenvIdx = lines.findIndex(l => l.includes('load_dotenv'));
    const insertAfter = dotenvIdx >= 0 ? dotenvIdx + 1 : lines.findIndex(l => !l.trim().startsWith('#') && !l.trim().startsWith('import') && !l.trim().startsWith('from') && l.trim() !== '');
    if (insertAfter >= 0 && !lines.some(l => l.trim() === 'load_dotenv()')) {
      lines.splice(insertAfter, 0, 'load_dotenv()');
    }
  }

  code = lines.join('\n');

  // Ensure FastAPI app exists
  if (!hasFastAPI && !code.includes('app = FastAPI')) {
    code += '\n\napp = FastAPI(title="Agent Server")\n';
  }

  // Add CORS
  if (!hasCORS) {
    const appIdx = code.indexOf('app = FastAPI');
    if (appIdx >= 0) {
      const afterApp = code.indexOf('\n', appIdx);
      const corsBlock = `
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)`;
      code = code.slice(0, afterApp + 1) + corsBlock + code.slice(afterApp + 1);
    }
  }

  // Add CopilotKit endpoint
  if (!hasCopilotKit) {
    let agentVar = 'agent';
    const agentMatch = code.match(/(\w+)\s*=\s*(?:create_agent|StateGraph|CompiledGraph|DeepAgent)/);
    if (agentMatch) agentVar = agentMatch[1];

    const sdkBlock = `
# --- CopilotKit Integration ---
sdk = CopilotKitSDK(
    agents=[
        LangGraphAgent(
            name="agent",
            description="AI Agent",
            agent=${agentVar},
        )
    ],
)

from copilotkit.integrations.fastapi import add_fastapi_endpoint
add_fastapi_endpoint(app, sdk, "/copilotkit")
`;
    code += '\n' + sdkBlock;
  }

  // Add health endpoint
  if (!hasHealth) {
    code += `
@app.get("/health")
async def health():
    return {"status": "ok"}
`;
  }

  // Add uvicorn entrypoint
  if (!hasUvicorn || !code.includes('uvicorn.run')) {
    code += `
if __name__ == "__main__":
    uvicorn.run("agent_server:app", host="0.0.0.0", port=8000, reload=True)
`;
  }

  // Warnings
  if (!code.includes('OPENAI_API_KEY') && !code.includes('ANTHROPIC_API_KEY') && !hasDotenv) {
    warnings.push('No API key references found — make sure your .env has the right keys');
  }

  // Deps
  const deps = ['fastapi', 'uvicorn[standard]', 'copilotkit', 'python-dotenv'];
  if (runtime === 'langchain' || runtime === 'langgraph') {
    deps.push('langchain', 'langchain-openai');
    if (code.includes('langgraph')) deps.push('langgraph');
  }
  if (runtime === 'deepagents') deps.push('deepagents');

  return {
    code: code.trim() + '\n',
    runtime,
    warnings,
    deps: [...new Set(deps)],
    runCommand: 'uvicorn agent_server:app --host 0.0.0.0 --port 8000 --reload',
  };
}

// ─── Main Component ───
export const CodeTransformerView: React.FC = () => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<TransformResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [runtimeOverride, setRuntimeOverride] = useState<RuntimeType | 'auto'>('auto');
  const [deployPath, setDeployPath] = useState<DeployPath>('choose');
  const [selfHostUrl, setSelfHostUrl] = useState('http://localhost:8000');

  const deploy = useDeployStore();
  const { addConnection, setActive, validate } = useConnectionStore();
  const { workspace, removeBlock, setMode } = useWorkspaceStore();

  // Compute block compatibility whenever result or workspace blocks change
  const blockCompatibility = useMemo(() => {
    if (!result || !input.trim()) return null;
    const runtime = detectRuntime(input, runtimeOverride);
    const caps = detectCodeCapabilities(input, runtime);
    return checkBlockCompatibility(workspace.blocks, caps);
  }, [result, input, runtimeOverride, workspace.blocks]);

  const incompatibleBlocks = useMemo(
    () => blockCompatibility?.filter((b) => !b.compatible) ?? [],
    [blockCompatibility],
  );

  const handleTransform = useCallback(() => {
    if (!input.trim()) return;
    const detected = detectRuntime(input, runtimeOverride);
    const transformed = transformCode(input, detected);
    setResult(transformed);
    setDeployPath('choose');
    deploy.reset();
  }, [input, runtimeOverride, deploy]);

  const handleCopy = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const handleDownloadCode = useCallback(() => {
    if (!result) return;
    const blob = new Blob([result.code], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agent_server.py';
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const handleSandboxDeploy = useCallback(() => {
    if (!result) return;
    const validation = validateForDeploy(result.code);
    if (!validation.valid) {
      deploy.setError('Code validation failed: ' + validation.issues.join('; '));
      return;
    }
    const config = createDeployConfig(result.code, result.deps, {}, result.runtime);
    deploy.deploy(config);
  }, [result, deploy]);

  const handleConnect = useCallback((url: string) => {
    const id = addConnection({
      name: deployPath === 'sandbox' ? 'Sandbox Agent' : 'My Agent',
      runtime: (result?.runtime as RuntimeType) || 'langchain',
      baseUrl: url.replace(/\/+$/, ''),
      agentId: '',
      auth: { mode: 'none' },
    });
    setActive(id);
    validate(id).then(() => setMode('published'));
  }, [addConnection, setActive, validate, setMode, result, deployPath]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-raised">
        <div className="flex items-center gap-2">
          <Code2 size={16} className="text-accent" />
          <span className="text-sm font-semibold text-txt-primary">Agent Code Transformer</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-2xs text-txt-muted">Runtime:</label>
          <select value={runtimeOverride}
            onChange={(e) => setRuntimeOverride(e.target.value as RuntimeType | 'auto')}
            className="ck-input text-xs py-1 px-2 w-32">
            <option value="auto">Auto-detect</option>
            <option value="langchain">LangChain</option>
            <option value="langgraph">LangGraph</option>
            <option value="deepagents">Deep Agents</option>
          </select>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Input */}
        <div className="flex-1 flex flex-col border-r border-border min-w-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface">
            <span className="text-2xs font-medium text-txt-secondary">Your Agent Code</span>
            <span className="text-2xs text-txt-ghost">Paste your agent code — it will be preserved</span>
          </div>
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={PLACEHOLDER} spellCheck={false}
            className="flex-1 w-full p-4 bg-surface text-txt-primary text-xs font-mono
                       resize-none outline-none placeholder:text-txt-ghost/50 leading-relaxed" />
          <div className="px-3 py-2 border-t border-border bg-surface-raised">
            <button onClick={handleTransform} disabled={!input.trim()}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg
                         bg-accent hover:bg-accent-hover text-white transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed">
              <Wand2 size={13} /> Add CopilotKit Compatibility
            </button>
          </div>
        </div>

        {/* Right: Output + deploy options */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface">
            <div className="flex items-center gap-2">
              <span className="text-2xs font-medium text-txt-secondary">Updated Code</span>
              {result && (
                <span className="text-2xs px-1.5 py-0.5 rounded bg-accent-soft text-accent font-medium">
                  {result.runtime}
                </span>
              )}
            </div>
            {result && (
              <div className="flex items-center gap-1">
                <button onClick={handleDownloadCode}
                  className="flex items-center gap-1 px-2 py-1 text-2xs rounded-md
                             text-txt-muted hover:text-accent hover:bg-accent-soft transition-all">
                  <Download size={11} /> Download .py
                </button>
                <button onClick={handleCopy}
                  className="flex items-center gap-1 px-2 py-1 text-2xs rounded-md
                             text-txt-muted hover:text-accent hover:bg-accent-soft transition-all">
                  {copied ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>

          {result ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {result.warnings.length > 0 && (
                <div className="px-3 py-2 bg-warning/10 border-b border-warning/20">
                  {result.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-2xs text-warning">
                      <AlertTriangle size={10} className="mt-0.5 shrink-0" /><span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Block compatibility panel */}
              {blockCompatibility && blockCompatibility.length > 0 && (
                <BlockCompatibilityPanel
                  compatibility={blockCompatibility}
                  onRemoveBlock={removeBlock}
                />
              )}

              <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-txt-primary leading-relaxed bg-surface min-h-0">
                {result.code}
              </pre>

              {/* Deploy path chooser */}
              <div className="border-t border-border bg-surface-raised overflow-y-auto max-h-[55%]">
                {deployPath === 'choose' && <PathChooser onChoose={setDeployPath} />}
                {deployPath === 'sandbox' && (
                  <SandboxPanel result={result} onDeploy={handleSandboxDeploy}
                    onConnect={handleConnect} onBack={() => setDeployPath('choose')} />
                )}
                {deployPath === 'selfhost' && (
                  <SelfHostPanel result={result} selfHostUrl={selfHostUrl}
                    onUrlChange={setSelfHostUrl} onConnect={handleConnect}
                    onBack={() => setDeployPath('choose')} />
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-txt-ghost">
              <div className="text-center space-y-2">
                <Code2 size={32} className="mx-auto opacity-30" />
                <p className="text-xs">Updated code will appear here</p>
                <p className="text-2xs">Your code is preserved — only missing pieces are added</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Block Compatibility Panel ───
const BlockCompatibilityPanel: React.FC<{
  compatibility: BlockCompatibility[];
  onRemoveBlock: (id: string) => void;
}> = ({ compatibility, onRemoveBlock }) => {
  const [expanded, setExpanded] = useState(true);
  const incompatible = compatibility.filter((c) => !c.compatible);
  const compatible = compatibility.filter((c) => c.compatible);

  return (
    <div className="border-b border-border bg-surface-raised">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-3 py-2 text-2xs font-medium text-txt-secondary hover:text-txt-primary transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>Block Compatibility</span>
          {incompatible.length > 0 ? (
            <span className="px-1.5 py-0.5 rounded bg-danger/15 text-danger text-2xs font-medium">
              {incompatible.length} incompatible
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-success/15 text-success text-2xs font-medium">
              All compatible
            </span>
          )}
        </div>
        <ChevronDown size={10} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-3 pb-2.5 space-y-1 animate-fade-in">
          {incompatible.map(({ block, missingCapabilities }) => (
            <div key={block.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-danger/5 border border-danger/15">
              <div className="flex items-center gap-2 min-w-0">
                <XCircle size={12} className="text-danger shrink-0" />
                <span className="text-2xs font-medium text-txt-primary truncate">{block.label}</span>
                <span className="text-2xs text-txt-faint">({block.type})</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-2xs text-danger/80" title={`Missing: ${missingCapabilities.join(', ')}`}>
                  needs {missingCapabilities.join(', ')}
                </span>
                <button
                  onClick={() => onRemoveBlock(block.id)}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-2xs rounded
                             text-danger/70 hover:text-white hover:bg-danger transition-colors"
                  title={`Remove ${block.label}`}
                >
                  <Trash2 size={10} /> Remove
                </button>
              </div>
            </div>
          ))}
          {compatible.map(({ block }) => (
            <div key={block.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-success/5 border border-success/10">
              <CheckCircle2 size={12} className="text-success shrink-0" />
              <span className="text-2xs font-medium text-txt-primary truncate">{block.label}</span>
              <span className="text-2xs text-txt-faint">({block.type})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Path Chooser ───
const PathChooser: React.FC<{ onChoose: (p: DeployPath) => void }> = ({ onChoose }) => (
  <div className="p-3 space-y-2">
    <p className="text-2xs text-txt-muted font-medium">How do you want to run this agent?</p>
    <div className="grid grid-cols-2 gap-2">
      <button onClick={() => onChoose('sandbox')}
        className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border
                   hover:border-accent/50 hover:bg-accent-soft transition-all text-left">
        <Cloud size={18} className="text-accent" />
        <span className="text-xs font-medium text-txt-primary">Deploy to Cloud</span>
        <span className="text-2xs text-txt-faint text-center">Run in a Daytona sandbox. Auto-connects to this frontend.</span>
      </button>
      <button onClick={() => onChoose('selfhost')}
        className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border
                   hover:border-accent/50 hover:bg-accent-soft transition-all text-left">
        <Monitor size={18} className="text-accent" />
        <span className="text-xs font-medium text-txt-primary">Run on My PC</span>
        <span className="text-2xs text-txt-faint text-center">Copy the code, run locally, then connect.</span>
      </button>
    </div>
  </div>
);

// ─── Self-Host Panel ───
const SelfHostPanel: React.FC<{
  result: TransformResult;
  selfHostUrl: string;
  onUrlChange: (url: string) => void;
  onConnect: (url: string) => void;
  onBack: () => void;
}> = ({ result, selfHostUrl, onUrlChange, onConnect, onBack }) => {
  const [showSteps, setShowSteps] = useState(true);

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor size={13} className="text-accent" />
          <span className="text-xs font-medium text-txt-primary">Run on Your PC</span>
        </div>
        <button onClick={onBack} className="text-2xs text-txt-faint hover:text-txt-secondary transition-colors">
          ← Back
        </button>
      </div>

      <button onClick={() => setShowSteps(!showSteps)}
        className="flex items-center gap-1 text-2xs text-txt-muted hover:text-txt-secondary transition-colors">
        <ChevronDown size={10} className={`transition-transform ${showSteps ? 'rotate-180' : ''}`} />
        Setup steps
      </button>

      {showSteps && (
        <div className="space-y-2 text-2xs text-txt-secondary animate-fade-in">
          <div className="flex gap-2">
            <span className="text-accent font-mono shrink-0">1.</span>
            <div>
              <p>Copy the updated code (use the Copy button above)</p>
              <p className="text-txt-faint">Save it as <code className="text-accent">agent_server.py</code></p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="text-accent font-mono shrink-0">2.</span>
            <div>
              <p>Install dependencies:</p>
              <code className="block text-accent font-mono bg-surface px-2 py-1 rounded mt-0.5">
                pip install {result.deps.join(' ')}
              </code>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="text-accent font-mono shrink-0">3.</span>
            <p>Set your API keys in a <code className="text-accent">.env</code> file or environment</p>
          </div>
          <div className="flex gap-2">
            <span className="text-accent font-mono shrink-0">4.</span>
            <div>
              <p>Run the server:</p>
              <code className="block text-accent font-mono bg-surface px-2 py-1 rounded mt-0.5">
                {result.runCommand}
              </code>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="text-accent font-mono shrink-0">5.</span>
            <p>Enter your server URL below and connect</p>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-2xs text-txt-secondary font-medium">Your agent URL</label>
        <div className="flex gap-2">
          <input type="text" value={selfHostUrl} onChange={(e) => onUrlChange(e.target.value)}
            placeholder="http://localhost:8000"
            className="ck-input text-xs font-mono flex-1 py-1.5" />
          <button onClick={() => onConnect(selfHostUrl)} disabled={!selfHostUrl.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg
                       bg-accent hover:bg-accent-hover text-white transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed">
            <Plug size={12} /> Connect
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Sandbox Panel ───
const SandboxPanel: React.FC<{
  result: TransformResult;
  onDeploy: () => void;
  onConnect: (url: string) => void;
  onBack: () => void;
}> = ({ result: _result, onDeploy, onConnect, onBack }) => {
  const {
    status, logs, error, agentUrl, reset,
    daytonaApiKey, setDaytonaApiKey,
    openaiApiKey, setOpenaiApiKey,
    anthropicApiKey, setAnthropicApiKey,
    customEnvVars, setCustomEnvVar, removeCustomEnvVar,
  } = useDeployStore();

  const [showKeys, setShowKeys] = useState(true);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvVal, setNewEnvVal] = useState('');

  const isDeploying = ['creating', 'installing', 'starting', 'checking'].includes(status);
  const isLive = status === 'live';

  const addCustomVar = () => {
    if (newEnvKey.trim() && newEnvVal.trim()) {
      setCustomEnvVar(newEnvKey.trim(), newEnvVal.trim());
      setNewEnvKey('');
      setNewEnvVal('');
    }
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud size={13} className="text-accent" />
          <span className="text-xs font-medium text-txt-primary">Deploy to Cloud Sandbox</span>
        </div>
        <button onClick={onBack} className="text-2xs text-txt-faint hover:text-txt-secondary transition-colors">
          ← Back
        </button>
      </div>

      {/* API Keys */}
      <div className="space-y-2">
        <button onClick={() => setShowKeys(!showKeys)}
          className="flex items-center gap-1.5 text-2xs font-medium text-txt-secondary hover:text-txt-primary transition-colors">
          <Key size={10} className="text-accent" />
          API Keys
          <ChevronDown size={10} className={`transition-transform ${showKeys ? 'rotate-180' : ''}`} />
        </button>

        {showKeys && (
          <div className="space-y-2 animate-fade-in">
            <KeyInput label="Daytona API Key" value={daytonaApiKey} onChange={setDaytonaApiKey}
              placeholder="daytona_..." hint="Required — app.daytona.io → Settings → API Keys" required />
            <KeyInput label="OPENAI_API_KEY" value={openaiApiKey} onChange={setOpenaiApiKey}
              placeholder="sk-..." hint="For OpenAI-based agents" />
            <KeyInput label="ANTHROPIC_API_KEY" value={anthropicApiKey} onChange={setAnthropicApiKey}
              placeholder="sk-ant-..." hint="For Claude-based agents" />

            {Object.entries(customEnvVars).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <code className="text-2xs font-mono text-txt-secondary bg-surface px-2 py-1 rounded min-w-[100px]">{k}</code>
                <input type="password" value={v} readOnly className="ck-input text-xs font-mono flex-1 py-1" />
                <button onClick={() => removeCustomEnvVar(k)} className="p-1 text-txt-faint hover:text-danger"><X size={10} /></button>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <input type="text" value={newEnvKey} onChange={(e) => setNewEnvKey(e.target.value)}
                placeholder="ENV_NAME" className="ck-input text-2xs font-mono py-1 w-28" />
              <input type="password" value={newEnvVal} onChange={(e) => setNewEnvVal(e.target.value)}
                placeholder="value" className="ck-input text-2xs font-mono py-1 flex-1" />
              <button onClick={addCustomVar} disabled={!newEnvKey.trim() || !newEnvVal.trim()}
                className="p-1 text-txt-faint hover:text-accent disabled:opacity-30"><Plus size={10} /></button>
            </div>
            <p className="text-2xs text-txt-ghost">Keys stay in your browser. Only sent to the sandbox.</p>
          </div>
        )}
      </div>

      {/* Deploy button / status */}
      {!isLive && !isDeploying && (
        <button onClick={onDeploy} disabled={!daytonaApiKey}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg w-full justify-center
                     bg-accent hover:bg-accent-hover text-white transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed">
          <Rocket size={13} /> Deploy to Sandbox
        </button>
      )}

      {isDeploying && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-accent">
            <Loader2 size={13} className="animate-spin" />
            <span className="capitalize">{status}...</span>
          </div>
          <div className="max-h-32 overflow-y-auto bg-surface rounded-lg p-2 space-y-0.5">
            {logs.map((log, i) => (
              <div key={i} className="text-2xs font-mono text-txt-secondary flex items-start gap-1.5">
                <Terminal size={9} className="mt-0.5 shrink-0 text-txt-faint" />
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="space-y-2">
          <div className="flex items-start gap-1.5 text-2xs text-danger bg-danger/10 rounded-lg p-2">
            <AlertTriangle size={10} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={reset}
            className="flex items-center gap-1.5 text-2xs text-txt-muted hover:text-accent transition-colors">
            <RotateCcw size={10} /> Try again
          </button>
        </div>
      )}

      {isLive && agentUrl && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-success">
            <Check size={13} /> Agent is live
          </div>
          <div className="flex items-center gap-2 bg-surface rounded-lg p-2">
            <code className="text-2xs font-mono text-accent flex-1 truncate">{agentUrl}</code>
            <a href={agentUrl + '/health'} target="_blank" rel="noopener noreferrer"
              className="text-txt-faint hover:text-accent"><ExternalLink size={11} /></a>
          </div>
          <button onClick={() => onConnect(agentUrl)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg w-full justify-center
                       bg-success hover:bg-success/90 text-white transition-colors">
            <Plug size={12} /> Connect to Frontend
          </button>
        </div>
      )}

      {/* Logs (when live) */}
      {isLive && logs.length > 0 && (
        <details className="text-2xs">
          <summary className="text-txt-faint cursor-pointer hover:text-txt-secondary">Deploy logs</summary>
          <div className="mt-1 max-h-24 overflow-y-auto bg-surface rounded-lg p-2 space-y-0.5">
            {logs.map((log, i) => (
              <div key={i} className="font-mono text-txt-secondary">{log}</div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

// ─── Key Input Helper ───
const KeyInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  hint: string;
  required?: boolean;
}> = ({ label, value, onChange, placeholder, hint, required }) => (
  <div className="space-y-0.5">
    <div className="flex items-center gap-1">
      <label className="text-2xs font-medium text-txt-secondary">{label}</label>
      {required && <span className="text-danger text-2xs">*</span>}
    </div>
    <input type="password" value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="ck-input text-xs font-mono w-full py-1" />
    <p className="text-2xs text-txt-ghost">{hint}</p>
  </div>
);
