import type { LLMProvider } from '@/store/llm-store';
import type { BlockConfig } from '@/types/blocks';

export interface FrontendContext {
  blocks: BlockConfig[];
  workspaceName: string;
  theme: string;
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
3. If the user's code has an undefined variable (like bare \`model\`), define it properly.
4. Use ONLY the latest stable APIs — no deprecated imports.
5. Ensure the backend supports ALL capabilities required by the frontend blocks.

## Frontend Block → Backend Capability Mapping
Each frontend block requires specific backend capabilities. Your code MUST enable these:

| Block Type     | Required Capabilities        | What the backend needs                                                |
|----------------|------------------------------|-----------------------------------------------------------------------|
| chat           | chat, streaming              | Agent with message handling (create_agent provides this)              |
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
- If frontend has "results/table/chart/cards/dashboard" but code has no structured output → add a Pydantic response model or ensure agent returns structured data
- If frontend has "status" block but code has no progress → add streaming callbacks
- If frontend has "toolActivity" but code has no tools → warn that tools are needed

## Current API Reference (2025-2026)

### LangChain (langchain >= 1.0)
- Agent creation: \`from langchain.agents import create_agent\`
- Tools: \`from langchain.tools import tool\` (decorator) or \`from langchain_core.tools import tool\`
- Models via string: \`create_agent(model="openai:gpt-4o-mini", tools=[...])\`
- Models via init: \`from langchain.chat_models import init_chat_model\` then \`model = init_chat_model("openai:gpt-4o")\`
- DEPRECATED: \`create_react_agent\` from langgraph.prebuilt → use \`create_agent\` from langchain.agents
- DEPRECATED: \`AgentExecutor\` → use \`create_agent\` which returns a compiled graph
- DEPRECATED: \`create_tool_calling_agent\` → use \`create_agent\`

### LangGraph (langgraph >= 0.3)
- Only needed for custom state graphs: \`from langgraph.graph import StateGraph\`
- Simple agents should use \`langchain.agents.create_agent\` instead
- \`create_react_agent\` in langgraph.prebuilt is DEPRECATED

### CopilotKit Python SDK (copilotkit >= 0.1)
- \`from copilotkit import CopilotKitSDK, LangGraphAgent\`
- \`from copilotkit.integrations.fastapi import add_fastapi_endpoint\`
- LangGraphAgent wraps ANY agent (LangChain, LangGraph, or custom):
  \`\`\`
  LangGraphAgent(name="agent", description="...", graph=my_agent)
  \`\`\`
  NOTE: The parameter is \`graph=\`, not \`agent=\`
- CopilotKitSDK takes a list of agents:
  \`\`\`
  sdk = CopilotKitSDK(agents=[LangGraphAgent(...)])
  \`\`\`
- Endpoint: \`add_fastapi_endpoint(app, sdk, "/copilotkit")\`

### Deep Agents
- \`from deepagents import create_deep_agent\`
- Works with CopilotKit via LangGraphAgent wrapper (same as above)

## Required Structure
The output file MUST have:
1. \`from dotenv import load_dotenv\` + \`load_dotenv()\` at the top
2. All necessary imports (no duplicates)
3. User's original tools/agent logic (preserved exactly)
4. \`app = FastAPI(title="Agent Server")\`
5. CORS middleware allowing all origins
6. CopilotKit SDK + endpoint at "/copilotkit"
7. Health endpoint: \`@app.get("/health")\`
8. Uvicorn entrypoint: \`if __name__ == "__main__": uvicorn.run(...)\`

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

  // Build the user prompt with frontend context
  let userPrompt = `Transform this agent code into a complete, runnable agent_server.py with CopilotKit integration:\n\n${input}`;

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
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  return parseResponse(raw);
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

  return {
    code: code + '\n',
    runtime: (meta.runtime as string) || 'langchain',
    warnings: (meta.warnings as string[]) || [],
    deps: (meta.deps as string[]) || ['fastapi', 'uvicorn[standard]', 'copilotkit', 'python-dotenv', 'langchain', 'langchain-openai'],
    runCommand: (meta.runCommand as string) || 'uvicorn agent_server:app --host 0.0.0.0 --port 8000 --reload',
    explanation: (meta.explanation as string) || '',
  };
}
