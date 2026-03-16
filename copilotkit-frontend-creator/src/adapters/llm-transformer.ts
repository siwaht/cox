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

const SYSTEM_PROMPT = `You are an expert Python backend engineer specializing in AI agent frameworks.
Your job: take user's agent code and produce a COMPLETE, RUNNABLE agent_server.py that integrates with CopilotKit.
You also receive the user's FRONTEND CONFIGURATION — the UI blocks they've set up. Your backend code MUST support every block's required capabilities.

## CRITICAL RULES
1. Output ONLY valid Python code. No markdown fences, no explanations in the code block.
2. Preserve ALL of the user's original agent logic, tools, prompts, and model choices.
3. If the user's code has an undefined variable (like bare \`model\`), define it with a string: \`model = "openai:gpt-4o-mini"\`.
4. Use ONLY the latest stable APIs listed below — no deprecated imports.
5. Ensure the backend supports ALL capabilities required by the frontend blocks.
6. EVERY function/class you USE must be IMPORTED. Check every symbol before using it.
7. Each import and statement MUST be on its own line. Never put multiple statements on one line.

## Frontend Block → Backend Capability Mapping
Each frontend block requires specific backend capabilities. Your code MUST enable these:

| Block Type     | Required Capabilities        | What the backend needs                                                |
|----------------|------------------------------|-----------------------------------------------------------------------|
| chat           | chat, streaming              | Agent with message handling                                           |
| results        | structuredOutput             | Agent returns Pydantic models or typed dicts                          |
| toolActivity   | toolCalls, toolResults       | Agent has tools defined with @tool decorator                          |
| approvals      | approvals                    | LangGraph interrupt_before/interrupt_after or human-in-the-loop       |
| logs           | logs                         | Python logging configured (import logging, logger = logging.getLogger)|
| status         | progress                     | Callbacks or streaming events for progress tracking                   |
| table          | structuredOutput             | Agent returns structured data (lists of dicts/models)                 |
| chart          | structuredOutput             | Agent returns numeric/structured data for visualization               |
| dashboard      | structuredOutput             | Agent returns KPI/metric data                                        |
| cards          | structuredOutput             | Agent returns structured items                                        |
| form           | (none)                       | No special backend requirement                                        |
| panel          | (none)                       | No special backend requirement                                        |
| markdown       | (none)                       | No special backend requirement                                        |

## How to add missing capabilities
- If frontend has "logs" block but code has no logging → add: \`import logging\` and \`logging.basicConfig(level=logging.INFO)\`
- If frontend has "approvals" block but code has no interrupts → add interrupt_before to the graph (requires LangGraph StateGraph)
- If frontend has "results/table/chart/cards/dashboard" but code has no structured output → add a Pydantic response model
- If frontend has "status" block but code has no progress → add streaming callbacks
- If frontend has "toolActivity" but code has no tools → warn that tools are needed

## Current API Reference (2025-2026)

### LangGraph (preferred for agents)
- Simple tool-calling agent: \`from langgraph.prebuilt import create_react_agent\`
  \`\`\`
  from langgraph.prebuilt import create_react_agent
  compiled_graph = create_react_agent("openai:gpt-4o-mini", tools=[my_tool])
  \`\`\`
- Custom state graph: \`from langgraph.graph import StateGraph, MessagesState\`
- DEPRECATED: \`create_agent\` from \`langchain.agents\` — does NOT exist in current langchain. Use \`create_react_agent\` instead.
- DEPRECATED: \`AgentExecutor\` — use \`create_react_agent\`

### LangChain tools
- \`from langchain_core.tools import tool\` (preferred)
- OR \`from langchain.tools import tool\`

### CopilotKit Python SDK — CORRECT API
The ONLY working pattern (add_langgraph_fastapi_endpoint does NOT exist in the SDK):
\`\`\`python
from copilotkit import LangGraphAGUIAgent, CopilotKitRemoteEndpoint
from copilotkit.integrations.fastapi import add_fastapi_endpoint

# Wrap your compiled graph
agent = LangGraphAGUIAgent(name="agent", description="...", graph=compiled_graph)

# Create the SDK endpoint
sdk = CopilotKitRemoteEndpoint(agents=[agent])

# Register with FastAPI
add_fastapi_endpoint(app, sdk, "/copilotkit")
\`\`\`

IMPORTANT:
- The agent variable name MUST be \`agent\` or \`graph\` (the server auto-detects it)
- \`name="agent"\` MUST match the frontend's agent ID (always use "agent")
- Use \`graph=\` parameter (NOT \`agent=\`) in LangGraphAGUIAgent
- NEVER use \`add_langgraph_fastapi_endpoint\` — it does not exist in the installed SDK
- \`LangGraphAgent\` is NOT for CopilotKit — always use \`LangGraphAGUIAgent\`

### Deep Agents
- \`from deepagents import create_deep_agent\`
- Wrap with LangGraphAGUIAgent the same way

## Required Structure
The output file MUST have this structure in order:
1. \`from dotenv import load_dotenv\` + \`load_dotenv()\` at the top (only ONCE)
2. All necessary imports (no duplicates)
3. \`from copilotkit import LangGraphAGUIAgent, CopilotKitRemoteEndpoint\`
4. \`from copilotkit.integrations.fastapi import add_fastapi_endpoint\`
5. User's original tools/agent logic (preserved exactly)
6. \`app = FastAPI(title="Agent Server")\`
7. CORS middleware allowing all origins
8. Agent creation: \`agent = LangGraphAGUIAgent(name="agent", description="...", graph=compiled_graph)\`
9. SDK: \`sdk = CopilotKitRemoteEndpoint(agents=[agent])\`
10. Endpoint: \`add_fastapi_endpoint(app, sdk, "/copilotkit")\`
11. Health endpoint: \`@app.get("/health")\`
12. Uvicorn entrypoint: \`if __name__ == "__main__": uvicorn.run("agent_server:app", host="0.0.0.0", port=8000, reload=True)\`

## Response Format
After the Python code, add a line "---META---" followed by a JSON object:
{
  "runtime": "langchain" | "langgraph" | "deepagents",
  "warnings": ["any warnings — especially about frontend blocks that can't be fully supported"],
  "deps": ["list", "of", "pip", "packages"],
  "runCommand": "uvicorn agent_server:app --host 0.0.0.0 --port 8000 --reload",
  "explanation": "Brief explanation of what was changed and how frontend blocks are supported"
}`;

// ─── API callers per provider ───

async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI API error: ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
      }),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API error: ${res.status}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  // Anthropic requires CORS proxy or backend — we use their direct API
  // Note: Anthropic blocks browser requests. We'll try and surface a clear error.
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
      max_tokens: 4096,
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
  return data.content?.[0]?.text || '';
}

async function callMistral(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || err?.error?.message || `Mistral API error: ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ─── Main transform function ───

export async function llmTransformCode(
  input: string,
  provider: LLMProvider,
  model: string,
  apiKey: string,
  frontendContext?: FrontendContext,
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
  let userPrompt = `Transform this agent code into a complete, runnable agent_server.py with CopilotKit integration:\n\n${input}`;

  // Inject verified documentation into the prompt
  if (docsSection) {
    userPrompt += `\n\n${docsSection}`;
  }

  if (frontendContext && frontendContext.blocks.length > 0) {
    const blockSummary = frontendContext.blocks
      .filter((b) => b.visible)
      .map((b) => `- ${b.label} (type: ${b.type})`)
      .join('\n');

    userPrompt += `\n\n## Frontend Configuration
Workspace: "${frontendContext.workspaceName}"
Theme: ${frontendContext.theme}

The user's frontend has these UI blocks that the backend MUST support:
${blockSummary}

Make sure the generated backend code provides all capabilities these blocks need.
If a block requires a capability the user's code doesn't have, add the minimum code to support it and note it in warnings.`;
  } else {
    userPrompt += `\n\nNote: No frontend blocks are configured yet. Generate a general-purpose backend that supports chat and tool calls.`;
  }

  let raw: string;
  switch (provider) {
    case 'openai':
      raw = await callOpenAI(apiKey, model, SYSTEM_PROMPT, userPrompt);
      break;
    case 'gemini':
      raw = await callGemini(apiKey, model, SYSTEM_PROMPT, userPrompt);
      break;
    case 'anthropic':
      raw = await callAnthropic(apiKey, model, SYSTEM_PROMPT, userPrompt);
      break;
    case 'mistral':
      raw = await callMistral(apiKey, model, SYSTEM_PROMPT, userPrompt);
      break;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  return parseResponse(raw);
}

function postProcessCode(code: string): string {
  let lines = code.split('\n');

  // 1. Fix: replace deprecated add_langgraph_fastapi_endpoint with the correct add_fastapi_endpoint pattern
  const usesOldEndpoint = lines.some((l) =>
    /add_langgraph_fastapi_endpoint\(/.test(l) && !/^#/.test(l.trim()),
  );

  if (usesOldEndpoint) {
    // Replace "add_langgraph_fastapi_endpoint(app, agent, "/copilotkit")" with add_fastapi_endpoint
    lines = lines.map((l) => {
      if (/add_langgraph_fastapi_endpoint\(/.test(l) && !/^#/.test(l.trim())) {
        // Extract the agent variable name from add_langgraph_fastapi_endpoint(app, agentVar, "/copilotkit")
        const match = l.match(/add_langgraph_fastapi_endpoint\(\s*\w+\s*,\s*(\w+)\s*,/);
        const agentVar = match ? match[1] : 'agent';
        const indent = l.match(/^(\s*)/)?.[1] ?? '';
        // Insert sdk creation before the endpoint line, return sdk line + endpoint line
        return `${indent}sdk = CopilotKitRemoteEndpoint(agents=[${agentVar}])\n${indent}add_fastapi_endpoint(app, sdk, "/copilotkit")`;
      }
      return l;
    });

    // Fix imports: replace add_langgraph_fastapi_endpoint import with add_fastapi_endpoint
    lines = lines.map((l) => {
      if (/from\s+copilotkit\.integrations\.fastapi\s+import\s+add_langgraph_fastapi_endpoint/.test(l)) {
        return l.replace('add_langgraph_fastapi_endpoint', 'add_fastapi_endpoint');
      }
      return l;
    });

    // Ensure CopilotKitRemoteEndpoint is imported
    const importsCopilotKit = lines.findIndex((l) => /^from copilotkit import/.test(l.trim()));
    const hasCopilotKitRemote = lines.some((l) => /CopilotKitRemoteEndpoint/.test(l) && /^from copilotkit import/.test(l.trim()));
    if (importsCopilotKit >= 0 && !hasCopilotKitRemote) {
      lines[importsCopilotKit] = lines[importsCopilotKit].replace(
        /from copilotkit import (.*)/,
        (_, imports) => {
          const parts = imports.split(',').map((s: string) => s.trim()).filter(Boolean);
          if (!parts.includes('CopilotKitRemoteEndpoint')) parts.push('CopilotKitRemoteEndpoint');
          return `from copilotkit import ${parts.join(', ')}`;
        }
      );
    } else if (importsCopilotKit < 0) {
      const lastImport = lines.reduce((idx, l, i) => (/^from |^import /.test(l) ? i : idx), -1);
      lines.splice(lastImport + 1, 0, 'from copilotkit import LangGraphAGUIAgent, CopilotKitRemoteEndpoint');
    }
  }

  // 2. Ensure add_fastapi_endpoint is imported if used
  const usesEndpoint = lines.some((l) => /add_fastapi_endpoint\(/.test(l) && !/^#/.test(l.trim()));
  const importsEndpoint = lines.some((l) =>
    /from\s+copilotkit\.integrations\.fastapi\s+import.*add_fastapi_endpoint/.test(l),
  );
  if (usesEndpoint && !importsEndpoint) {
    const lastCopilotImport = lines.reduce(
      (idx, l, i) => (/^from copilotkit|^import copilotkit/.test(l) ? i : idx), -1,
    );
    const insertAt = lastCopilotImport >= 0 ? lastCopilotImport + 1 : lines.findIndex((l) => /^from |^import /.test(l)) + 1;
    lines.splice(insertAt, 0, 'from copilotkit.integrations.fastapi import add_fastapi_endpoint');
  }

  // 3. Fix: ensure LangGraphAGUIAgent is used (not bare LangGraphAgent)
  lines = lines.map((l) => {
    if (/\bLangGraphAgent\b/.test(l) && !/LangGraphAGUIAgent/.test(l)) {
      return l.replace(/\bLangGraphAgent\b/g, 'LangGraphAGUIAgent');
    }
    return l;
  });

  // 4. Fix: replace deprecated create_agent from langchain.agents with create_react_agent
  lines = lines.map((l) => {
    if (/from\s+langchain\.agents\s+import.*\bcreate_agent\b/.test(l)) {
      return l.replace('from langchain.agents import create_agent', 'from langgraph.prebuilt import create_react_agent');
    }
    if (/\bcreate_agent\(/.test(l) && !/^#/.test(l.trim())) {
      return l.replace(/\bcreate_agent\(/, 'create_react_agent(');
    }
    return l;
  });

  // 5. Fix missing import: uvicorn used but not imported
  const usesUvicorn = lines.some((l) => l.includes('uvicorn.run'));
  const importsUvicorn = lines.some((l) => /^import uvicorn/.test(l));
  if (usesUvicorn && !importsUvicorn) {
    const lastImport = lines.reduce((idx, l, i) => (/^from |^import /.test(l) ? i : idx), -1);
    lines.splice(lastImport + 1, 0, 'import uvicorn');
  }

  // 6. Fix duplicate load_dotenv() calls
  let dotenvCount = 0;
  lines = lines.filter((l) => {
    if (/^load_dotenv\(\)/.test(l.trim())) {
      dotenvCount++;
      return dotenvCount <= 1;
    }
    return true;
  });

  // 7. Fix duplicate "from dotenv import load_dotenv"
  let dotenvImportCount = 0;
  lines = lines.filter((l) => {
    if (/^from dotenv import load_dotenv/.test(l.trim())) {
      dotenvImportCount++;
      return dotenvImportCount <= 1;
    }
    return true;
  });

  // 8. Ensure \`agent=\` param is replaced with \`graph=\` in LangGraphAGUIAgent
  lines = lines.map((l) => {
    if (/LangGraphAGUIAgent\(/.test(l) && /\bagent\s*=/.test(l) && !/\bgraph\s*=/.test(l)) {
      return l.replace(/\bagent\s*=/, 'graph=');
    }
    return l;
  });

  // 9. Remove any monkey-patch for dict_repr bug (no longer needed)
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

  return lines.join('\n');
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
      // Extract JSON from the meta string (might have extra text)
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

  return {
    code: code + '\n',
    runtime: (meta.runtime as string) || 'langchain',
    warnings: (meta.warnings as string[]) || [],
    deps: (meta.deps as string[]) || ['fastapi', 'uvicorn[standard]', 'copilotkit', 'python-dotenv', 'langchain', 'langchain-openai'],
    runCommand: (meta.runCommand as string) || 'uvicorn agent_server:app --host 0.0.0.0 --port 8000 --reload',
    explanation: (meta.explanation as string) || '',
  };
}
