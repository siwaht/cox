import React, { useState, useCallback } from 'react';
import {
  Code2, Copy, Check, Wand2, AlertTriangle, ChevronDown, Rocket,
  Loader2, Terminal, Plug, ExternalLink, RotateCcw, Key, Plus, X,
} from 'lucide-react';
import { useDeployStore } from '@/store/deploy-store';
import { useConnectionStore } from '@/store/connection-store';
import { useWorkspaceStore } from '@/store/workspace-store';
import { validateForDeploy, createDeployConfig } from '@/adapters/sandbox-deployer';

type RuntimeType = 'langchain' | 'langgraph' | 'deepagents';

interface TransformResult {
  code: string;
  runtime: RuntimeType;
  warnings: string[];
  deps: string[];
  runCommand: string;
}

export const CodeTransformerView: React.FC = () => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<TransformResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [runtimeOverride, setRuntimeOverride] = useState<RuntimeType | 'auto'>('auto');
  const [showDeps, setShowDeps] = useState(false);

  const deploy = useDeployStore();
  const { addConnection, setActive, validate } = useConnectionStore();
  const { setMode } = useWorkspaceStore();

  const handleTransform = useCallback(() => {
    if (!input.trim()) return;
    const detected = detectRuntime(input, runtimeOverride);
    const transformed = transformCode(input, detected);
    setResult(transformed);
    deploy.reset();
  }, [input, runtimeOverride, deploy]);

  const handleCopy = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const handleDeploy = useCallback(() => {
    if (!result) return;
    const validation = validateForDeploy(result.code);
    if (!validation.valid) {
      deploy.setError('Code validation failed: ' + validation.issues.join('; '));
      return;
    }
    const config = createDeployConfig(result.code, result.deps, {}, result.runtime);
    deploy.deploy(config);
  }, [result, deploy]);

  const handleAutoConnect = useCallback((url: string) => {
    const id = addConnection({
      name: `Sandbox Agent (${result?.runtime || 'langchain'})`,
      runtime: (result?.runtime as RuntimeType) || 'langchain',
      baseUrl: url,
      agentId: '',
      auth: { mode: 'none' },
    });
    setActive(id);
    validate(id).then(() => setMode('published'));
  }, [addConnection, setActive, validate, setMode, result]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-raised">
        <div className="flex items-center gap-2">
          <Code2 size={16} className="text-accent" />
          <span className="text-sm font-semibold text-txt-primary">Agent Code Transformer</span>
          <span className="text-2xs text-txt-faint bg-surface px-2 py-0.5 rounded-full">
            Paste → Transform → Deploy
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-2xs text-txt-muted">Runtime:</label>
          <select
            value={runtimeOverride}
            onChange={(e) => setRuntimeOverride(e.target.value as RuntimeType | 'auto')}
            className="ck-input text-xs py-1 px-2 w-32"
          >
            <option value="auto">Auto-detect</option>
            <option value="langchain">LangChain</option>
            <option value="langgraph">LangGraph</option>
            <option value="deepagents">Deep Agents</option>
          </select>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Input panel */}
        <div className="flex-1 flex flex-col border-r border-border min-w-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface">
            <span className="text-2xs font-medium text-txt-secondary">Your Agent Code</span>
            <span className="text-2xs text-txt-ghost">Paste your FastAPI / LangChain / LangGraph agent</span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={PLACEHOLDER}
            spellCheck={false}
            className="flex-1 w-full p-4 bg-surface text-txt-primary text-xs font-mono
                       resize-none outline-none placeholder:text-txt-ghost/50 leading-relaxed"
          />
          <div className="px-3 py-2 border-t border-border bg-surface-raised">
            <button onClick={handleTransform} disabled={!input.trim()}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg
                         bg-accent hover:bg-accent-hover text-white transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed">
              <Wand2 size={13} /> Transform
            </button>
          </div>
        </div>

        {/* Output + Deploy panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface">
            <div className="flex items-center gap-2">
              <span className="text-2xs font-medium text-txt-secondary">Transformed Code</span>
              {result && (
                <span className="text-2xs px-1.5 py-0.5 rounded bg-accent-soft text-accent font-medium">
                  {result.runtime}
                </span>
              )}
            </div>
            {result && (
              <button onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 text-2xs rounded-md
                           text-txt-muted hover:text-accent hover:bg-accent-soft transition-all">
                {copied ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
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
              <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-txt-primary leading-relaxed bg-surface min-h-0">
                {result.code}
              </pre>
              <DeployPanel
                result={result}
                showDeps={showDeps}
                onToggleDeps={() => setShowDeps(!showDeps)}
                onDeploy={handleDeploy}
                onAutoConnect={handleAutoConnect}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-txt-ghost">
              <div className="text-center space-y-2">
                <Code2 size={32} className="mx-auto opacity-30" />
                <p className="text-xs">Transformed code will appear here</p>
                <p className="text-2xs">Paste your agent code on the left and click Transform</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// ─── Deploy Panel ───

interface DeployPanelProps {
  result: TransformResult;
  showDeps: boolean;
  onToggleDeps: () => void;
  onDeploy: () => void;
  onAutoConnect: (url: string) => void;
}

const DeployPanel: React.FC<DeployPanelProps> = ({
  result, showDeps, onToggleDeps, onDeploy, onAutoConnect,
}) => {
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
    <div className="border-t border-border bg-surface-raised overflow-y-auto max-h-[50%]">
      {/* Manual install/run */}
      <div className="px-3 py-2 border-b border-border">
        <button onClick={onToggleDeps}
          className="flex items-center gap-1 text-2xs text-txt-muted hover:text-txt-secondary transition-colors">
          <ChevronDown size={10} className={`transition-transform ${showDeps ? 'rotate-180' : ''}`} />
          Manual Install &amp; Run
        </button>
        {showDeps && (
          <div className="space-y-1.5 mt-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-2xs text-txt-faint shrink-0">Install:</span>
              <code className="text-2xs font-mono text-accent bg-surface px-2 py-1 rounded flex-1 overflow-x-auto">
                pip install {result.deps.join(' ')}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xs text-txt-faint shrink-0">Run:</span>
              <code className="text-2xs font-mono text-accent bg-surface px-2 py-1 rounded flex-1">
                {result.runCommand}
              </code>
            </div>
          </div>
        )}
      </div>

      {/* API Keys section */}
      <div className="px-3 py-3 space-y-3 border-b border-border">
        <button onClick={() => setShowKeys(!showKeys)}
          className="flex items-center gap-1.5 text-2xs font-medium text-txt-secondary hover:text-txt-primary transition-colors">
          <Key size={11} className="text-accent" />
          API Keys &amp; Environment
          <ChevronDown size={10} className={`transition-transform ${showKeys ? 'rotate-180' : ''}`} />
        </button>

        {showKeys && (
          <div className="space-y-2.5 animate-fade-in">
            {/* Daytona key — required */}
            <KeyInput
              label="Daytona API Key"
              value={daytonaApiKey}
              onChange={setDaytonaApiKey}
              placeholder="daytona_..."
              hint="Required. Get one at app.daytona.io → Settings → API Keys"
              required
            />
            {/* OpenAI key */}
            <KeyInput
              label="OPENAI_API_KEY"
              value={openaiApiKey}
              onChange={setOpenaiApiKey}
              placeholder="sk-..."
              hint="For OpenAI-based agents (GPT-4o, etc.)"
            />
            {/* Anthropic key */}
            <KeyInput
              label="ANTHROPIC_API_KEY"
              value={anthropicApiKey}
              onChange={setAnthropicApiKey}
              placeholder="sk-ant-..."
              hint="For Claude-based agents"
            />

            {/* Custom env vars */}
            {Object.entries(customEnvVars).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <code className="text-2xs font-mono text-txt-secondary bg-surface px-2 py-1.5 rounded min-w-[120px]">{k}</code>
                <input type="password" value={v} readOnly
                  className="ck-input text-xs font-mono flex-1 py-1" />
                <button onClick={() => removeCustomEnvVar(k)}
                  className="p-1 text-txt-faint hover:text-danger transition-colors">
                  <X size={11} />
                </button>
              </div>
            ))}

            {/* Add custom var */}
            <div className="flex items-center gap-1.5">
              <input type="text" value={newEnvKey} onChange={(e) => setNewEnvKey(e.target.value)}
                placeholder="ENV_VAR_NAME" className="ck-input text-2xs font-mono py-1 w-32" />
              <input type="password" value={newEnvVal} onChange={(e) => setNewEnvVal(e.target.value)}
                placeholder="value" className="ck-input text-2xs font-mono py-1 flex-1" />
              <button onClick={addCustomVar} disabled={!newEnvKey.trim() || !newEnvVal.trim()}
                className="p-1.5 text-txt-faint hover:text-accent disabled:opacity-30 transition-colors">
                <Plus size={11} />
              </button>
            </div>
            <p className="text-2xs text-txt-ghost">Keys are saved in your browser only. Never sent anywhere except the sandbox.</p>
          </div>
        )}
      </div>

      {/* Deploy controls */}
      <div className="px-3 py-3 space-y-2">
        {!isLive && !isDeploying && status !== 'error' && (
          <button onClick={onDeploy} disabled={!daytonaApiKey}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-lg w-full justify-center
                       bg-gradient-to-r from-accent to-purple-500 hover:from-accent-hover hover:to-purple-600
                       text-white transition-all shadow-sm shadow-accent/20
                       disabled:opacity-40 disabled:cursor-not-allowed">
            <Rocket size={14} />
            {daytonaApiKey ? 'Deploy to Cloud Sandbox' : 'Enter Daytona API Key to Deploy'}
          </button>
        )}

        {isDeploying && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-accent-soft border border-accent/20">
              <Loader2 size={14} className="text-accent animate-spin" />
              <span className="text-xs text-accent font-medium capitalize">{status}...</span>
            </div>
            <div className="max-h-28 overflow-y-auto bg-surface rounded-lg p-2 border border-border">
              {logs.map((log, i) => (
                <div key={i} className="flex items-start gap-1.5 text-2xs font-mono text-txt-muted">
                  <Terminal size={9} className="mt-0.5 shrink-0 text-txt-ghost" /><span>{log}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLive && agentUrl && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-success/10 border border-success/20">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-success font-medium">Agent is live</span>
            </div>
            <code className="block text-2xs font-mono text-accent bg-surface px-2 py-1.5 rounded truncate">
              {agentUrl}
            </code>
            <div className="flex gap-2">
              <button onClick={() => onAutoConnect(agentUrl)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg
                           bg-accent hover:bg-accent-hover text-white transition-colors">
                <Plug size={12} /> Connect &amp; Go Live
              </button>
              <a href={`${agentUrl}/health`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-border
                           text-txt-muted hover:text-accent hover:border-accent/50 transition-all">
                <ExternalLink size={12} /> Health
              </a>
              <button onClick={reset}
                className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-border
                           text-txt-muted hover:text-txt-secondary transition-all">
                <RotateCcw size={12} />
              </button>
            </div>
          </div>
        )}

        {status === 'error' && error && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-danger/10 border border-danger/20">
              <AlertTriangle size={12} className="text-danger mt-0.5 shrink-0" />
              <span className="text-2xs text-danger break-all">{error}</span>
            </div>
            <button onClick={reset}
              className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg w-full justify-center
                         border border-border text-txt-muted hover:text-txt-secondary transition-all">
              <RotateCcw size={12} /> Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Key Input Component ───

const KeyInput: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; hint: string; required?: boolean;
}> = ({ label, value, onChange, placeholder, hint, required }) => (
  <div>
    <div className="flex items-baseline justify-between mb-0.5">
      <label className="text-2xs text-txt-secondary font-medium">
        {label} {required && <span className="text-danger">*</span>}
      </label>
    </div>
    <input
      type="password"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="ck-input text-xs font-mono w-full py-1.5"
    />
    <p className="text-2xs text-txt-ghost mt-0.5">{hint}</p>
  </div>
);


// ─── Detection + Transformation Logic ───

function detectRuntime(code: string, override: RuntimeType | 'auto'): RuntimeType {
  if (override !== 'auto') return override;
  if (/StateGraph|langgraph|CompiledGraph|add_node|add_edge/.test(code)) return 'langgraph';
  if (/deep.?agent|DeepAgent|sub.?agent/i.test(code)) return 'deepagents';
  return 'langchain';
}

function transformCode(code: string, runtime: RuntimeType): TransformResult {
  const warnings: string[] = [];
  const tools = extractTools(code);
  const agentVar = extractAgentVar(code);
  const systemPrompt = extractSystemPrompt(code);
  const model = extractModel(code);
  const hasCors = /CORSMiddleware/.test(code);

  if (!agentVar) warnings.push('Could not detect an agent variable. Adjust the agent= parameter in the SDK setup.');
  if (!hasCors) warnings.push('CORS middleware not detected. It has been added automatically.');

  const deps = ['fastapi', 'uvicorn', 'copilotkit', 'python-dotenv'];
  let transformed = '';

  if (runtime === 'langchain') {
    deps.push('langchain', 'langchain-openai');
    transformed = buildLangChainOutput(tools, agentVar, systemPrompt, model, warnings);
  } else if (runtime === 'langgraph') {
    deps.push('langchain', 'langchain-openai', 'langgraph');
    transformed = buildLangGraphOutput(tools, agentVar, systemPrompt, model);
  } else {
    deps.push('langchain', 'langchain-openai');
    transformed = buildDeepAgentsOutput(tools, agentVar, systemPrompt, model);
  }

  return { code: transformed, runtime, warnings, deps, runCommand: 'uvicorn agent_server:app --host 0.0.0.0 --port 8000' };
}

function extractTools(code: string): string[] {
  const matches = code.match(/@tool\s*\ndef\s+(\w+)/g) || [];
  return matches.map((m) => { const n = m.match(/def\s+(\w+)/); return n ? n[1] : ''; }).filter(Boolean);
}

function extractAgentVar(code: string): string | null {
  const m = code.match(/(\w+)\s*=\s*(?:create_agent|AgentExecutor|create_openai_tools_agent|StateGraph|CompiledGraph)/);
  if (m) return m[1];
  const f = code.match(/^(\w*(?:agent|executor|graph))\s*=/m);
  return f ? f[1] : null;
}

function extractSystemPrompt(code: string): string {
  const m = code.match(/system_prompt\s*=\s*["'](.+?)["']/s) || code.match(/\("system",\s*["'](.+?)["']\)/s);
  return m ? m[1] : 'You are a helpful assistant.';
}

function extractModel(code: string): string {
  const m = code.match(/model\s*=\s*["'](.+?)["']/) || code.match(/ChatOpenAI\(.*?model\s*=\s*["'](.+?)["']/);
  return m ? m[1] : 'gpt-4o';
}

function buildLangChainOutput(
  tools: string[], agentVar: string | null, systemPrompt: string, model: string, warnings: string[]
): string {
  const toolList = tools.length > 0 ? tools.join(', ') : 'get_weather';
  const name = agentVar || 'executor';
  if (tools.length === 0) warnings.push('No @tool functions found. A placeholder tool has been added.');
  return `# agent_server.py — CopilotKit-compatible LangChain agent
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from copilotkit.integrations.fastapi import add_fastapi_endpoint
from copilotkit import CopilotKitSDK, LangChainAgent
from dotenv import load_dotenv
load_dotenv()
${tools.length === 0 ? `
@tool
def get_weather(location: str) -> str:
    """Get the weather for a location."""
    return f"The weather in {location} is sunny"
` : `# Detected tools: ${toolList}
`}
llm = ChatOpenAI(model="${model}")
prompt = ChatPromptTemplate.from_messages([
    ("system", "${systemPrompt}"),
    MessagesPlaceholder(variable_name="chat_history", optional=True),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])
tools_list = [${toolList}]
agent = create_openai_tools_agent(llm, tools_list, prompt)
${name} = AgentExecutor(agent=agent, tools=tools_list)

sdk = CopilotKitSDK(agents=[LangChainAgent(name="assistant", agent=${name}, description="${systemPrompt}")])
app = FastAPI(title="Agent Server")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
add_fastapi_endpoint(app, sdk, "/copilotkit")

@app.get("/health")
async def health():
    return {"status": "ok"}
`;
}

function buildLangGraphOutput(
  tools: string[], agentVar: string | null, systemPrompt: string, model: string
): string {
  const toolList = tools.length > 0 ? tools.join(', ') : 'get_weather';
  const name = agentVar || 'graph';
  return `# agent_server.py — CopilotKit-compatible LangGraph agent
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from copilotkit.integrations.fastapi import add_fastapi_endpoint
from copilotkit import CopilotKitSDK, LangGraphAgent
from dotenv import load_dotenv
load_dotenv()

# Detected tools: ${toolList}
llm = ChatOpenAI(model="${model}")
tools_list = [${toolList}]
${name} = create_react_agent(model=llm, tools=tools_list, state_modifier="${systemPrompt}")

sdk = CopilotKitSDK(agents=[LangGraphAgent(name="assistant", agent=${name}, description="${systemPrompt}")])
app = FastAPI(title="Agent Server")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
add_fastapi_endpoint(app, sdk, "/copilotkit")

@app.get("/health")
async def health():
    return {"status": "ok"}
`;
}

function buildDeepAgentsOutput(
  tools: string[], agentVar: string | null, systemPrompt: string, model: string
): string {
  const toolList = tools.length > 0 ? tools.join(', ') : 'get_weather';
  const name = agentVar || 'executor';
  return `# agent_server.py — CopilotKit-compatible Deep Agent
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from copilotkit.integrations.fastapi import add_fastapi_endpoint
from copilotkit import CopilotKitSDK, LangChainAgent
from dotenv import load_dotenv
load_dotenv()

# Detected tools: ${toolList}
llm = ChatOpenAI(model="${model}")
prompt = ChatPromptTemplate.from_messages([
    ("system", "${systemPrompt}"),
    MessagesPlaceholder(variable_name="chat_history", optional=True),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])
tools_list = [${toolList}]
agent = create_openai_tools_agent(llm, tools_list, prompt)
${name} = AgentExecutor(agent=agent, tools=tools_list)

sdk = CopilotKitSDK(agents=[LangChainAgent(name="assistant", agent=${name}, description="${systemPrompt}")])
app = FastAPI(title="Deep Agent Server")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
add_fastapi_endpoint(app, sdk, "/copilotkit")

@app.get("/health")
async def health():
    return {"status": "ok"}
`;
}

const PLACEHOLDER = `# Paste your agent code here. For example:

from fastapi import FastAPI
from langchain_core.tools import tool
from langchain.agents import create_agent

@tool
def get_weather(location: str) -> str:
    """Get the weather for a location."""
    return f"Sunny in {location}"

agent = create_agent(
    model="openai:gpt-4o",
    tools=[get_weather],
    system_prompt="You are a helpful assistant.",
)

app = FastAPI()

@app.post("/chat")
async def chat(req):
    ...`;
