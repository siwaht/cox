import React, { useState, useCallback } from 'react';
import { Code2, Copy, Check, Wand2, AlertTriangle, ChevronDown } from 'lucide-react';

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

  const handleTransform = useCallback(() => {
    if (!input.trim()) return;
    const detected = detectRuntime(input, runtimeOverride);
    const transformed = transformCode(input, detected);
    setResult(transformed);
  }, [input, runtimeOverride]);

  const handleCopy = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-raised">
        <div className="flex items-center gap-2">
          <Code2 size={16} className="text-accent" />
          <span className="text-sm font-semibold text-txt-primary">Agent Code Transformer</span>
          <span className="text-2xs text-txt-faint bg-surface px-2 py-0.5 rounded-full">
            Paste → Transform → Connect
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
            <button
              onClick={handleTransform}
              disabled={!input.trim()}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg
                         bg-accent hover:bg-accent-hover text-white transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Wand2 size={13} />
              Transform for CopilotKit
            </button>
          </div>
        </div>

        {/* Output panel */}
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
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 text-2xs rounded-md
                           text-txt-muted hover:text-accent hover:bg-accent-soft transition-all"
              >
                {copied ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>

          {result ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="px-3 py-2 bg-warning/10 border-b border-warning/20">
                  {result.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-2xs text-warning">
                      <AlertTriangle size={10} className="mt-0.5 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Code output */}
              <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-txt-primary leading-relaxed bg-surface">
                {result.code}
              </pre>

              {/* Footer with deps + run command */}
              <div className="px-3 py-2 border-t border-border bg-surface-raised space-y-2">
                <button
                  onClick={() => setShowDeps(!showDeps)}
                  className="flex items-center gap-1 text-2xs text-txt-muted hover:text-txt-secondary transition-colors"
                >
                  <ChevronDown size={10} className={`transition-transform ${showDeps ? 'rotate-180' : ''}`} />
                  Install &amp; Run
                </button>
                {showDeps && (
                  <div className="space-y-1.5 animate-fade-in">
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


// ─── Detection + Transformation Logic ───

function detectRuntime(code: string, override: RuntimeType | 'auto'): RuntimeType {
  if (override !== 'auto') return override;
  if (/StateGraph|langgraph|CompiledGraph|add_node|add_edge/.test(code)) return 'langgraph';
  if (/deep.?agent|DeepAgent|sub.?agent/i.test(code)) return 'deepagents';
  return 'langchain';
}

function transformCode(code: string, runtime: RuntimeType): TransformResult {
  const warnings: string[] = [];

  // Extract useful parts from the pasted code
  const imports = extractImports(code);
  const tools = extractTools(code);
  const agentVar = extractAgentVar(code);
  const systemPrompt = extractSystemPrompt(code);
  const model = extractModel(code);
  const hasHealth = /\/health/.test(code);
  const hasCors = /CORSMiddleware/.test(code);

  if (!agentVar) warnings.push('Could not detect an agent variable. You may need to adjust the agent= parameter in the SDK setup.');
  if (!hasCors) warnings.push('CORS middleware was not detected in your code. It has been added automatically.');

  let transformed = '';
  const deps = ['fastapi', 'uvicorn', 'copilotkit', 'python-dotenv'];

  if (runtime === 'langchain') {
    deps.push('langchain', 'langchain-openai');
    transformed = buildLangChainOutput(code, imports, tools, agentVar, systemPrompt, model, warnings);
  } else if (runtime === 'langgraph') {
    deps.push('langchain', 'langchain-openai', 'langgraph');
    transformed = buildLangGraphOutput(code, imports, tools, agentVar, systemPrompt, model, warnings);
  } else {
    deps.push('langchain', 'langchain-openai');
    transformed = buildDeepAgentsOutput(code, imports, tools, agentVar, systemPrompt, model, warnings);
  }

  return {
    code: transformed,
    runtime,
    warnings,
    deps,
    runCommand: 'uvicorn agent_server:app --host 0.0.0.0 --port 8000',
  };
}

function extractImports(code: string): string[] {
  const lines = code.split('\n');
  return lines.filter((l) => /^(from |import )/.test(l.trim()));
}

function extractTools(code: string): string[] {
  const matches = code.match(/@tool\s*\ndef\s+(\w+)/g) || [];
  return matches.map((m) => {
    const name = m.match(/def\s+(\w+)/);
    return name ? name[1] : '';
  }).filter(Boolean);
}

function extractAgentVar(code: string): string | null {
  // Match patterns like: agent = create_agent(...) or executor = AgentExecutor(...)
  const match = code.match(/(\w+)\s*=\s*(?:create_agent|AgentExecutor|create_openai_tools_agent|StateGraph|CompiledGraph)/);
  if (match) return match[1];
  // Fallback: look for variable named agent/executor/graph/app_graph
  const fallback = code.match(/^(\w*(?:agent|executor|graph))\s*=/m);
  return fallback ? fallback[1] : null;
}

function extractSystemPrompt(code: string): string {
  const match = code.match(/system_prompt\s*=\s*["'](.+?)["']/s) ||
                code.match(/\("system",\s*["'](.+?)["']\)/s);
  return match ? match[1] : 'You are a helpful assistant.';
}

function extractModel(code: string): string {
  const match = code.match(/model\s*=\s*["'](.+?)["']/) ||
                code.match(/ChatOpenAI\(.*?model\s*=\s*["'](.+?)["']/);
  return match ? match[1] : 'gpt-4o';
}

function buildLangChainOutput(
  _code: string, _imports: string[], tools: string[], agentVar: string | null,
  systemPrompt: string, model: string, warnings: string[]
): string {
  const toolList = tools.length > 0 ? tools.join(', ') : 'get_weather';
  const agentName = agentVar || 'executor';

  if (tools.length === 0) warnings.push('No @tool decorated functions found. A placeholder tool has been added.');

  return `# agent_server.py — CopilotKit-compatible LangChain agent
# Generated by Frontend Creator

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

# --- Tools ---
${tools.length === 0 ? `
@tool
def get_weather(location: str) -> str:
    """Get the weather for a location."""
    return f"The weather in {location} is sunny"
` : `# Paste your @tool functions here
# Detected tools: ${toolList}
`}
# --- Agent ---

llm = ChatOpenAI(model="${model}")

prompt = ChatPromptTemplate.from_messages([
    ("system", "${systemPrompt}"),
    MessagesPlaceholder(variable_name="chat_history", optional=True),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])

tools_list = [${toolList}]
agent = create_openai_tools_agent(llm, tools_list, prompt)
${agentName} = AgentExecutor(agent=agent, tools=tools_list)

# --- CopilotKit SDK ---

sdk = CopilotKitSDK(
    agents=[
        LangChainAgent(
            name="assistant",
            agent=${agentName},
            description="${systemPrompt}",
        )
    ]
)

# --- FastAPI ---

app = FastAPI(title="Agent Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

add_fastapi_endpoint(app, sdk, "/copilotkit")

@app.get("/health")
async def health():
    return {"status": "ok"}
`;
}

function buildLangGraphOutput(
  _code: string, _imports: string[], tools: string[], agentVar: string | null,
  systemPrompt: string, model: string, _warnings: string[]
): string {
  const toolList = tools.length > 0 ? tools.join(', ') : 'get_weather';

  return `# agent_server.py — CopilotKit-compatible LangGraph agent
# Generated by Frontend Creator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from copilotkit.integrations.fastapi import add_fastapi_endpoint
from copilotkit import CopilotKitSDK, LangGraphAgent
from dotenv import load_dotenv

load_dotenv()

# --- Tools ---
# Paste your @tool functions here
# Detected tools: ${toolList}

# --- LangGraph Agent ---

llm = ChatOpenAI(model="${model}")
tools_list = [${toolList}]

${agentVar || 'graph'} = create_react_agent(
    model=llm,
    tools=tools_list,
    state_modifier="${systemPrompt}",
)

# --- CopilotKit SDK ---

sdk = CopilotKitSDK(
    agents=[
        LangGraphAgent(
            name="assistant",
            agent=${agentVar || 'graph'},
            description="${systemPrompt}",
        )
    ]
)

# --- FastAPI ---

app = FastAPI(title="Agent Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

add_fastapi_endpoint(app, sdk, "/copilotkit")

@app.get("/health")
async def health():
    return {"status": "ok"}
`;
}

function buildDeepAgentsOutput(
  _code: string, _imports: string[], tools: string[], agentVar: string | null,
  systemPrompt: string, model: string, _warnings: string[]
): string {
  const toolList = tools.length > 0 ? tools.join(', ') : 'get_weather';

  return `# agent_server.py — CopilotKit-compatible Deep Agent
# Generated by Frontend Creator

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

# --- Tools ---
# Paste your @tool functions here
# Detected tools: ${toolList}

# --- Agent ---

llm = ChatOpenAI(model="${model}")

prompt = ChatPromptTemplate.from_messages([
    ("system", "${systemPrompt}"),
    MessagesPlaceholder(variable_name="chat_history", optional=True),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])

tools_list = [${toolList}]
agent = create_openai_tools_agent(llm, tools_list, prompt)
${agentVar || 'executor'} = AgentExecutor(agent=agent, tools=tools_list)

# --- CopilotKit SDK ---

sdk = CopilotKitSDK(
    agents=[
        LangChainAgent(
            name="assistant",
            agent=${agentVar || 'executor'},
            description="${systemPrompt}",
        )
    ]
)

# --- FastAPI ---

app = FastAPI(title="Deep Agent Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
