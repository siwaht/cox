import type { LLMProvider } from '@/store/llm-store';
import type { BlockConfig } from '@/types/blocks';
import type { FrontendType, RuntimeType } from '@/types/connections';
import { fetchDocs, getDocsSync, formatDocsForPrompt } from '@/adapters/docs-fetcher';

export interface FrontendContext {
  blocks: BlockConfig[];
  workspaceName: string;
  theme: string;
  frontend?: FrontendType;
  runtime?: RuntimeType;
}

export interface LLMTransformResult {
  code: string;
  runtime: string;
  warnings: string[];
  deps: string[];
  runCommand: string;
  explanation: string;
}

const SYSTEM_PROMPT = `You are an expert Python backend engineer specializing in AI agent frameworks (LangGraph, LangChain, CopilotKit).
Your job: take user's agent code and produce a COMPLETE, RUNNABLE agent_server.py that integrates with CopilotKit.
You also receive the user's FRONTEND CONFIGURATION — the UI blocks they've set up.

## YOUR #1 PRIORITY: MAKE EVERY BLOCK WORK
You MUST automatically add whatever code is needed so that EVERY frontend block is fully supported. Do NOT just warn about missing capabilities — FIX THEM by adding the necessary code. The user expects zero errors after transformation.

## CRITICAL RULES
1. Output ONLY valid Python code. No markdown fences, no explanations in the code block.
2. Preserve ALL of the user's original agent logic, tools, prompts, and model choices.
3. If the user's code has an undefined variable (like bare \`model\`), define it: \`model = "openai:gpt-4o-mini"\`.
4. Use ONLY the latest stable APIs listed below — no deprecated imports.
5. AUTOMATICALLY ADD all missing capabilities for every frontend block. Never leave a block unsupported.
6. EVERY function/class you USE must be IMPORTED. Check every symbol before outputting.
7. Each import and statement MUST be on its own line. Never put multiple statements on one line.
8. NEVER use \`AgentExecutor\` or \`create_tool_calling_agent\` — these are REMOVED.
9. ALWAYS use \`from langgraph.prebuilt import create_react_agent\` for simple agents.
10. ALWAYS use \`graph=\` (NOT \`agent=\`) as the parameter name in LangGraphAGUIAgent.
11. ALWAYS use \`LangGraphAGUIAgent\` (NOT \`LangGraphAgent\`).
12. NEVER import from \`copilotkit.integrations.fastapi\` — use \`ag_ui_langgraph\` instead.
13. Ensure all string literals are properly closed. Check every f-string and triple-quote.
14. Do NOT add \`if __name__ == "__main__"\` guard around import statements.
15. Use \`uvicorn.run("agent_server:app", ...)\` NOT \`uvicorn.run(app, ...)\` for reload support.
16. NEVER compile a checkpointer (MemorySaver, InMemorySaver) into the graph — ag-ui-langgraph manages state externally. Remove any checkpointer= parameter from .compile() calls.
17. NEVER use \`CopilotKitRemoteEndpoint\` or \`CopilotKitSDK\` — these are deprecated and cause dict_repr errors.
18. The agent name in LangGraphAGUIAgent MUST be "agent" to match the frontend \`<CopilotKit agent="agent">\` prop.

## Frontend Block → What YOU Must Add If Missing

| Block Type      | Required Backend Support                                                            |
|-----------------|------------------------------------------------------------------------------------|
| chat            | Already supported by any agent — no action needed                                  |
| results         | Add a Pydantic BaseModel for structured output + emit via CopilotKit state         |
| toolActivity    | Already supported if agent has tools. If no tools exist, add a simple helper tool   |
| approvals       | Add \`interrupt_before\` to the graph compile call (convert to StateGraph if needed) |
| logs            | Add: \`import logging; logging.basicConfig(level=logging.INFO); logger = logging.getLogger(__name__)\` |
| status          | Add: \`import logging; logging.basicConfig(level=logging.INFO)\` for status tracking |
| table           | Add a Pydantic BaseModel that returns list of dicts + emit via agent state          |
| chart           | Add a Pydantic BaseModel with numeric fields + emit via agent state                 |
| dashboard       | Add a Pydantic BaseModel with metric/KPI fields + emit via agent state              |
| cards           | Add a Pydantic BaseModel that returns structured items + emit via agent state        |
| form            | No action needed — frontend handles form input                                      |
| panel           | No action needed — frontend layout container                                        |
| markdown        | No action needed — frontend renders markdown from agent messages                    |
| traceViewer     | Add \`os.environ["LANGCHAIN_TRACING_V2"] = "true"\` before any LangChain imports    |
| feedback        | Add \`from langsmith import Client\` + feedback submission helper                    |
| dataset         | Add \`from langsmith import Client\` + dataset query tool                            |
| annotationQueue | Add \`interrupt_before\` + \`from langsmith import Client\`                          |
| reasoningChain  | Use StateGraph with intermediate state nodes that emit reasoning steps              |
| subAgentTree    | Add sub-agent nodes with status tracking in graph state                             |
| depthIndicator  | Add a depth/progress counter in graph state                                         |

## Current API Reference (2025-2026)

### LangGraph (preferred for ALL agents)
\`\`\`python
# Simple tool-calling agent (RECOMMENDED for most cases)
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool

@tool
def my_tool(query: str) -> str:
    \"\"\"Tool description.\"\"\"
    return "result"

# Pass model as string — LangGraph handles initialization
graph = create_react_agent("openai:gpt-4o-mini", tools=[my_tool])
# Do NOT pass checkpointer when using with CopilotKit/ag-ui-langgraph
\`\`\`

\`\`\`python
# Custom state graph (for complex workflows)
from langgraph.graph import StateGraph, MessagesState, START, END

builder = StateGraph(MessagesState)
builder.add_node("agent", agent_node)
builder.add_edge(START, "agent")
builder.add_edge("agent", END)
# IMPORTANT: Do NOT pass checkpointer when using with CopilotKit
# ag-ui-langgraph manages thread state externally
graph = builder.compile()
\`\`\`

CRITICAL — CHECKPOINTER RULE:
- NEVER compile a checkpointer (MemorySaver, InMemorySaver) into the graph when using ag-ui-langgraph
- The AG-UI adapter manages thread state externally
- Baking in a checkpointer causes "thread_id required" errors at runtime
- If the user's code has \`checkpointer=MemorySaver()\` or \`checkpointer=InMemorySaver()\`, REMOVE IT

DEPRECATED — NEVER USE:
- \`from langchain.agents import AgentExecutor\` — REMOVED, use create_react_agent
- \`from langchain.agents import create_tool_calling_agent\` — REMOVED
- \`MemorySaver\` — renamed to \`InMemorySaver\` in latest langgraph (but don't use either with CopilotKit)
- \`from copilotkit.integrations.fastapi import add_fastapi_endpoint\` — REMOVED

### CopilotKit Python SDK — CORRECT API (ag-ui-langgraph)
\`\`\`python
from copilotkit import LangGraphAGUIAgent
from ag_ui_langgraph import add_langgraph_fastapi_endpoint

agent = LangGraphAGUIAgent(
    name="agent",           # MUST be "agent" to match frontend
    description="My agent",
    graph=compiled_graph     # NOTE: parameter is 'graph=', NOT 'agent='
)
add_langgraph_fastapi_endpoint(app=app, agent=agent, path="/copilotkit")
\`\`\`

NEVER USE:
- \`CopilotKitSDK\` — removed
- \`CopilotKitRemoteEndpoint\` — deprecated, causes dict_repr errors
- \`LangGraphAgent\` — wrong class, use \`LangGraphAGUIAgent\`
- \`from copilotkit.integrations.fastapi import add_fastapi_endpoint\` — use ag_ui_langgraph

### LangChain tools
- \`from langchain_core.tools import tool\` (preferred)
- OR \`from langchain.tools import tool\`

### Required Package Versions (MUST be compatible)
- copilotkit>=0.1.81
- ag-ui-langgraph[fastapi]>=0.0.27
- langgraph>=0.3.25,<1.1.0
- langchain>=1.2.0
- langchain-core>=1.2.20
- fastapi>=0.115.0,<1.0.0

## Required Output Structure (in this exact order)
1. \`from dotenv import load_dotenv\` + \`load_dotenv()\` (ONCE, at very top)
2. Standard library imports (os, logging, etc.)
3. Third-party imports (fastapi, pydantic, langchain, langgraph, etc.)
4. CopilotKit imports: \`from copilotkit import LangGraphAGUIAgent\`
5. AG-UI import: \`from ag_ui_langgraph import add_langgraph_fastapi_endpoint\`
6. User's original tools and agent logic (preserved exactly, with fixes applied)
7. \`app = FastAPI(title="Agent Server")\`
8. CORS middleware: \`app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])\`
9. Agent wrapping: \`ck_agent = LangGraphAGUIAgent(name="agent", description="...", graph=<user_graph_var>)\`
10. Endpoint: \`add_langgraph_fastapi_endpoint(app=app, agent=ck_agent, path="/copilotkit")\`
11. Health check: \`@app.get("/health")\\ndef health(): return {"status": "ok"}\`
12. Entrypoint: \`if __name__ == "__main__":\\n    import uvicorn\\n    uvicorn.run("agent_server:app", host="0.0.0.0", port=8123, reload=True)\`

## Response Format
After the Python code, add a line "---META---" followed by a JSON object:
{
  "runtime": "langchain" | "langgraph" | "langsmith" | "deepagents",
  "warnings": [],
  "deps": ["list", "of", "pip", "packages"],
  "runCommand": "uvicorn agent_server:app --host 0.0.0.0 --port 8123 --reload",
  "explanation": "Brief 1-2 sentence summary of what was changed."
}

The "warnings" array should almost always be EMPTY. You are expected to FIX issues, not warn about them.`;

// ─── Retry helper ───

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  delayMs = 1000,
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Don't retry on auth errors or invalid requests
      if (lastError.message.includes('401') || lastError.message.includes('403') ||
          lastError.message.includes('invalid_api_key') || lastError.message.includes('API key')) {
        throw lastError;
      }
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastError!;
}

// ─── Token budget: scale max_tokens based on input complexity ───

function computeMaxTokens(input: string, blocks: number): number {
  const inputLines = input.split('\n').length;
  // Base: 8192 tokens. Scale up for complex inputs or many blocks.
  const base = 8192;
  const lineBonus = Math.min(inputLines * 8, 4096);
  const blockBonus = Math.min(blocks * 256, 2048);
  return Math.min(base + lineBonus + blockBonus, 16384);
}

// ─── API callers per provider ───

async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
): Promise<string> {
  return withRetry(async () => {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.05,
        max_tokens: maxTokens,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `OpenAI API error: ${res.status}`);
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    if (data.choices?.[0]?.finish_reason === 'length') {
      throw new Error('Response was truncated — code may be incomplete. Try a simpler agent or fewer blocks.');
    }
    return content;
  });
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
): Promise<string> {
  return withRetry(async () => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.05, maxOutputTokens: maxTokens },
        }),
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Gemini API error: ${res.status}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  });
}

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
): Promise<string> {
  return withRetry(async () => {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err?.error?.message || `Anthropic API error: ${res.status}. Note: Anthropic may block direct browser requests — try OpenAI or Gemini instead.`,
      );
    }
    const data = await res.json();
    if (data.stop_reason === 'max_tokens') {
      throw new Error('Response was truncated — code may be incomplete. Try a simpler agent or fewer blocks.');
    }
    return data.content?.[0]?.text || '';
  });
}

async function callMistral(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
): Promise<string> {
  return withRetry(async () => {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.05,
        max_tokens: maxTokens,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || err?.error?.message || `Mistral API error: ${res.status}`);
    }
    const data = await res.json();
    if (data.choices?.[0]?.finish_reason === 'length') {
      throw new Error('Response was truncated — code may be incomplete. Try a simpler agent or fewer blocks.');
    }
    return data.choices?.[0]?.message?.content || '';
  });
}

async function callCloudflareWorkersAI(
  apiKey: string,
  accountId: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
): Promise<string> {
  if (!accountId) throw new Error('Cloudflare Account ID is required. Add it in the settings panel.');
  return withRetry(async () => {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.05,
        }),
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err?.errors?.[0]?.message || err?.error?.message || `Cloudflare Workers AI error: ${res.status}`,
      );
    }
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.errors?.[0]?.message || 'Cloudflare Workers AI request failed');
    }
    return data.result?.response || '';
  });
}

// ─── Main transform function ───

export async function llmTransformCode(
  input: string,
  provider: LLMProvider,
  model: string,
  apiKey: string,
  frontendContext?: FrontendContext,
  cloudflareAccountId?: string,
): Promise<LLMTransformResult> {
  if (!apiKey) throw new Error('API key is required. Add it in the settings panel.');
  if (!input.trim()) throw new Error('No code provided.');

  // Fetch latest documentation for the selected frontend + backend
  const frontend = frontendContext?.frontend || 'copilotkit';
  const runtime = frontendContext?.runtime || 'langchain';
  let docsSection = '';
  try {
    const docs = await fetchDocs(frontend, runtime);
    docsSection = formatDocsForPrompt(docs);
  } catch {
    // Fall back to sync/cached docs if async fetch fails
    const docs = getDocsSync(frontend, runtime);
    docsSection = formatDocsForPrompt(docs);
  }

  // Build the user prompt with frontend context + docs
  const visibleBlocks = frontendContext?.blocks.filter((b) => b.visible) ?? [];
  let userPrompt = `Transform this agent code into a complete, runnable agent_server.py with CopilotKit integration.\n\nIMPORTANT: The output must be a SINGLE valid Python file. Do NOT split into multiple files.\n\n## User's Agent Code\n\`\`\`python\n${input}\n\`\`\``;

  // Inject verified documentation into the prompt
  if (docsSection) {
    userPrompt += `\n\n${docsSection}`;
  }

  if (visibleBlocks.length > 0) {
    const blockSummary = visibleBlocks
      .map((b) => `- ${b.label} (type: ${b.type})`)
      .join('\n');

    userPrompt += `\n\n## Frontend Configuration
Workspace: "${frontendContext!.workspaceName}"
Theme: ${frontendContext!.theme}
Block count: ${visibleBlocks.length}

The user's frontend has these UI blocks that the backend MUST fully support:
${blockSummary}

For EACH block above, ensure the backend code has the required capabilities. Add any missing code automatically — do NOT leave blocks unsupported.`;
  } else {
    userPrompt += `\n\nNo frontend blocks are configured yet. Generate a general-purpose backend that supports chat and tool calls.`;
  }

  // Compute dynamic token budget
  const maxTokens = computeMaxTokens(input, visibleBlocks.length);

  let raw: string;
  switch (provider) {
    case 'openai':
      raw = await callOpenAI(apiKey, model, SYSTEM_PROMPT, userPrompt, maxTokens);
      break;
    case 'gemini':
      raw = await callGemini(apiKey, model, SYSTEM_PROMPT, userPrompt, maxTokens);
      break;
    case 'anthropic':
      raw = await callAnthropic(apiKey, model, SYSTEM_PROMPT, userPrompt, maxTokens);
      break;
    case 'mistral':
      raw = await callMistral(apiKey, model, SYSTEM_PROMPT, userPrompt, maxTokens);
      break;
    case 'cloudflare':
      raw = await callCloudflareWorkersAI(apiKey, cloudflareAccountId || '', model, SYSTEM_PROMPT, userPrompt, maxTokens);
      break;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  return parseResponse(raw);
}

function postProcessCode(code: string): string {
  let lines = code.split('\n');

  // 1. Fix: replace old CopilotKitRemoteEndpoint + add_fastapi_endpoint pattern
  const usesOldSdkPattern = lines.some((l) =>
    /add_fastapi_endpoint\(/.test(l) && /sdk/.test(l) && !/^#/.test(l.trim()),
  );
  const usesCopilotKitRemoteEndpoint = lines.some((l) =>
    /CopilotKitRemoteEndpoint\(/.test(l) && !/^#/.test(l.trim()),
  );

  if (usesOldSdkPattern || usesCopilotKitRemoteEndpoint) {
    lines = lines.filter((l) => !/^\s*sdk\s*=\s*CopilotKitRemoteEndpoint\(/.test(l));
    lines = lines.map((l) => {
      if (/add_fastapi_endpoint\(\s*\w+\s*,\s*sdk\s*,/.test(l) && !/^#/.test(l.trim())) {
        const indent = l.match(/^(\s*)/)?.[1] ?? '';
        const agentMatch = code.match(/CopilotKitRemoteEndpoint\(\s*agents\s*=\s*\[\s*(\w+)\s*\]/);
        const agentVar = agentMatch ? agentMatch[1] : 'agent';
        return `${indent}add_langgraph_fastapi_endpoint(app=app, agent=${agentVar}, path="/copilotkit")`;
      }
      return l;
    });
    lines = lines.map((l) => {
      if (/from\s+copilotkit\.integrations\.fastapi\s+import\s+add_fastapi_endpoint/.test(l)) {
        return 'from ag_ui_langgraph import add_langgraph_fastapi_endpoint';
      }
      return l;
    });
    lines = lines.map((l) => {
      if (/^from copilotkit import/.test(l.trim()) && /CopilotKitRemoteEndpoint/.test(l)) {
        return l.replace(/,?\s*CopilotKitRemoteEndpoint/, '').replace(/CopilotKitRemoteEndpoint,?\s*/, '');
      }
      return l;
    });
  }

  // 2. Ensure add_langgraph_fastapi_endpoint is imported if used
  const usesLgEndpoint = lines.some((l) => /add_langgraph_fastapi_endpoint\(/.test(l) && !/^#/.test(l.trim()));
  const importsLgEndpoint = lines.some((l) =>
    /from\s+ag_ui_langgraph\s+import.*add_langgraph_fastapi_endpoint/.test(l),
  );
  if (usesLgEndpoint && !importsLgEndpoint) {
    const lastImport = lines.reduce((idx, l, i) => (/^from |^import /.test(l) ? i : idx), -1);
    lines.splice(lastImport + 1, 0, 'from ag_ui_langgraph import add_langgraph_fastapi_endpoint');
  }

  // 3. Fix: ensure LangGraphAGUIAgent is used (not bare LangGraphAgent)
  lines = lines.map((l) => {
    if (/\bLangGraphAgent\b/.test(l) && !/LangGraphAGUIAgent/.test(l)) {
      return l.replace(/\bLangGraphAgent\b/g, 'LangGraphAGUIAgent');
    }
    return l;
  });

  // 4. Fix: ensure create_react_agent is imported from langgraph.prebuilt
  // Note: create_agent from langchain.agents is the newer v1 API but
  // create_react_agent from langgraph.prebuilt still works and is what
  // the ag-ui-langgraph adapter expects (a compiled LangGraph graph).
  lines = lines.map((l) => {
    if (/from\s+langchain\.agents\s+import.*\bAgentExecutor\b/.test(l)) {
      return '# AgentExecutor is deprecated — use create_react_agent from langgraph.prebuilt';
    }
    if (/from\s+langchain\.agents\s+import.*\bcreate_tool_calling_agent\b/.test(l)) {
      return l.replace(/from\s+langchain\.agents\s+import\s+create_tool_calling_agent/, 'from langgraph.prebuilt import create_react_agent');
    }
    return l;
  });

  // 5. Fix missing import: uvicorn used but not imported
  const usesUvicorn = lines.some((l) => l.includes('uvicorn.run'));
  const importsUvicorn = lines.some((l) => /^import uvicorn/.test(l.trim()));
  if (usesUvicorn && !importsUvicorn) {
    const lastImport = lines.reduce((idx, l, i) => (/^from |^import /.test(l) ? i : idx), -1);
    lines.splice(lastImport + 1, 0, 'import uvicorn');
  }

  // 6. Fix missing import: FastAPI used but not imported
  const usesFastAPI = lines.some((l) => /FastAPI\(/.test(l) && !/^#/.test(l.trim()));
  const importsFastAPI = lines.some((l) => /from\s+fastapi\s+import.*FastAPI/.test(l));
  if (usesFastAPI && !importsFastAPI) {
    const lastImport = lines.reduce((idx, l, i) => (/^from |^import /.test(l) ? i : idx), -1);
    lines.splice(lastImport + 1, 0, 'from fastapi import FastAPI');
  }

  // 7. Fix missing import: CORSMiddleware used but not imported
  const usesCORS = lines.some((l) => /CORSMiddleware/.test(l) && !/^from |^import /.test(l.trim()));
  const importsCORS = lines.some((l) => /from\s+fastapi\.middleware\.cors\s+import\s+CORSMiddleware/.test(l));
  if (usesCORS && !importsCORS) {
    const lastImport = lines.reduce((idx, l, i) => (/^from |^import /.test(l) ? i : idx), -1);
    lines.splice(lastImport + 1, 0, 'from fastapi.middleware.cors import CORSMiddleware');
  }

  // 8. Fix duplicate load_dotenv() calls
  let dotenvCount = 0;
  lines = lines.filter((l) => {
    if (/^load_dotenv\(\)/.test(l.trim())) {
      dotenvCount++;
      return dotenvCount <= 1;
    }
    return true;
  });

  // 9. Fix duplicate "from dotenv import load_dotenv"
  let dotenvImportCount = 0;
  lines = lines.filter((l) => {
    if (/^from dotenv import load_dotenv/.test(l.trim())) {
      dotenvImportCount++;
      return dotenvImportCount <= 1;
    }
    return true;
  });

  // 10. Ensure `agent=` param is replaced with `graph=` in LangGraphAGUIAgent
  lines = lines.map((l) => {
    if (/LangGraphAGUIAgent\(/.test(l) && /\bagent\s*=/.test(l) && !/\bgraph\s*=/.test(l)) {
      return l.replace(/\bagent\s*=/, 'graph=');
    }
    return l;
  });

  // 11. Remove any monkey-patch for dict_repr bug
  const patchStart = lines.findIndex((l) => /Fix dict_repr bug|_original_dict_repr|_patched_dict_repr/.test(l));
  if (patchStart >= 0) {
    let patchEnd = patchStart;
    for (let i = patchStart; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed === '' && i > patchStart) {
        patchEnd = i;
        break;
      }
      if (/_original_dict_repr|_patched_dict_repr|dict_repr|LangGraphAGUIAgent\.dict_repr/.test(trimmed) ||
          /^#.*dict_repr|^#.*Fix dict_repr|^def _patched|^\s+try:|^\s+return _original|^\s+except|^\s+return \{/.test(trimmed)) {
        patchEnd = i;
      } else if (i > patchStart + 1 && !/^\s/.test(trimmed) && trimmed !== '') {
        break;
      }
    }
    lines.splice(patchStart, patchEnd - patchStart + 1);
  }

  // 12. Ensure LangGraphAGUIAgent is imported
  const usesAGUI = lines.some((l) => /LangGraphAGUIAgent/.test(l) && !/^from |^import /.test(l.trim()));
  const importsAGUI = lines.some((l) => /from copilotkit import.*LangGraphAGUIAgent/.test(l));
  if (usesAGUI && !importsAGUI) {
    const lastImport = lines.reduce((idx, l, i) => (/^from |^import /.test(l) ? i : idx), -1);
    lines.splice(lastImport + 1, 0, 'from copilotkit import LangGraphAGUIAgent');
  }

  // 13. Fix: remove CopilotKitSDK references (deprecated)
  lines = lines.filter((l) => !/CopilotKitSDK/.test(l));

  // 14. Fix: ensure os is imported if os.environ is used
  const usesOs = lines.some((l) => /os\.environ|os\.getenv/.test(l) && !/^#/.test(l.trim()));
  const importsOs = lines.some((l) => /^import os/.test(l.trim()));
  if (usesOs && !importsOs) {
    const lastImport = lines.reduce((idx, l, i) => (/^from |^import /.test(l) ? i : idx), -1);
    lines.splice(lastImport + 1, 0, 'import os');
  }

  // 15. Remove duplicate blank lines (max 2 consecutive)
  const cleaned: string[] = [];
  let blankCount = 0;
  for (const line of lines) {
    if (line.trim() === '') {
      blankCount++;
      if (blankCount <= 2) cleaned.push(line);
    } else {
      blankCount = 0;
      cleaned.push(line);
    }
  }

  // 16. Strip checkpointer from graph compilation — ag-ui-langgraph manages state
  // This prevents "thread_id required" errors at runtime
  const cleanedWithCheckpointer: string[] = [];
  for (const line of cleaned) {
    // Remove checkpointer= parameter from compile() calls
    if (/\.compile\(.*checkpointer\s*=/.test(line) && !/^#/.test(line.trim())) {
      const fixed = line
        .replace(/,\s*checkpointer\s*=\s*[^,)]+/, '')
        .replace(/checkpointer\s*=\s*[^,)]+,?\s*/, '');
      cleanedWithCheckpointer.push(fixed);
    }
    // Remove standalone MemorySaver/InMemorySaver instantiation lines
    else if (/^\s*(memory|checkpointer|saver)\s*=\s*(MemorySaver|InMemorySaver)\(\)/.test(line)) {
      cleanedWithCheckpointer.push(`# ${line.trim()}  # Removed: ag-ui-langgraph manages state`);
    }
    // Comment out MemorySaver/InMemorySaver imports (don't remove — might confuse)
    else if (/from\s+langgraph\.checkpoint\.memory\s+import\s+(MemorySaver|InMemorySaver)/.test(line) && !/^#/.test(line.trim())) {
      cleanedWithCheckpointer.push(`# ${line.trim()}  # Not needed with ag-ui-langgraph`);
    }
    else {
      cleanedWithCheckpointer.push(line);
    }
  }

  // 17. Fix MemorySaver references to InMemorySaver (for any remaining standalone usage)
  const finalLines = cleanedWithCheckpointer.map((l) => {
    if (/\bMemorySaver\b/.test(l) && !/InMemorySaver/.test(l) && !/^#/.test(l.trim())) {
      return l.replace(/\bMemorySaver\b/g, 'InMemorySaver');
    }
    return l;
  });

  // 18. Fix: ensure CopilotKitRemoteEndpoint references are removed
  const withoutRemoteEndpoint = finalLines.filter((l) => !/CopilotKitRemoteEndpoint/.test(l) || /^#/.test(l.trim()));

  return withoutRemoteEndpoint.join('\n');
}
function parseResponse(raw: string): LLMTransformResult {
  // Strip markdown fences if present
  let cleaned = raw.replace(/^```(?:python)?\n?/gm, '').replace(/^```\s*$/gm, '');

  const metaSplit = cleaned.indexOf('---META---');
  let code: string;
  let meta: Record<string, unknown> = {};

  if (metaSplit >= 0) {
    code = cleaned.slice(0, metaSplit).trim();
    const metaStr = cleaned.slice(metaSplit + '---META---'.length).trim();
    try {
      const jsonMatch = metaStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) meta = JSON.parse(jsonMatch[0]);
    } catch {
      // If meta parsing fails, that's fine — we have the code
    }
  } else {
    code = cleaned.trim();
  }

  // Ensure code doesn't start with explanation text
  const firstImport = code.search(/^(from |import |#)/m);
  if (firstImport > 0) {
    code = code.slice(firstImport);
  }

  // ─── Post-processing: fix common LLM mistakes ───
  code = postProcessCode(code);

  // ─── Validation: check for critical issues ───
  const validationWarnings: string[] = [];

  if (!/add_langgraph_fastapi_endpoint|add_fastapi_endpoint/.test(code)) {
    validationWarnings.push('Missing CopilotKit endpoint registration — the agent may not be reachable from the frontend.');
  }
  if (!/LangGraphAGUIAgent/.test(code)) {
    validationWarnings.push('Missing LangGraphAGUIAgent wrapper — CopilotKit integration may not work.');
  }
  if (!/FastAPI\(/.test(code)) {
    validationWarnings.push('Missing FastAPI app creation — the server cannot start.');
  }
  if (!/CORSMiddleware/.test(code)) {
    validationWarnings.push('Missing CORS middleware — the frontend may not be able to connect.');
  }

  const metaWarnings = (meta.warnings as string[]) || [];
  const allWarnings = [...validationWarnings, ...metaWarnings];

  return {
    code: code + '\n',
    runtime: (meta.runtime as string) || 'langchain',
    warnings: allWarnings,
    deps: (meta.deps as string[]) || ['fastapi>=0.135.1', 'uvicorn[standard]>=0.42.0', 'copilotkit>=0.1.81', 'ag-ui-langgraph[fastapi]>=0.0.27', 'python-dotenv>=1.0.0', 'langchain>=1.2.10', 'langchain-openai>=1.1.11', 'langgraph>=1.0.10', 'deepagents>=0.4.11'],
    runCommand: (meta.runCommand as string) || 'uvicorn agent_server:app --host 0.0.0.0 --port 8123 --reload',
    explanation: (meta.explanation as string) || '',
  };
}
