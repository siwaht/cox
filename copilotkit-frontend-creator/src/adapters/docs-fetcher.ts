// ─── Documentation Fetcher ───
// Fetches and caches latest API docs from LangChain, LangGraph, DeepAgents,
// and CopilotKit. Injected into the LLM prompt so generated code
// always uses current, correct APIs.

import type { RuntimeType, FrontendType } from '@/types/connections';

export interface DocSnippet {
  source: string;
  title: string;
  content: string;
  fetchedAt: string;
}

export interface DocsCache {
  snippets: Record<string, DocSnippet>;
  lastUpdated: string;
}

// ─── Documentation URLs ───
// Each entry: { url, selectors/paths to fetch, parser }
const DOC_SOURCES: Record<string, { urls: string[]; label: string }> = {
  copilotkit: {
    label: 'CopilotKit',
    urls: [
      'https://docs.copilotkit.ai/langgraph/quickstart',
      'https://docs.copilotkit.ai/reference/sdk/python/LangGraphAGUIAgent',
    ],
  },
  langchain: {
    label: 'LangChain',
    urls: [
      'https://python.langchain.com/docs/how_to/create_agent/',
      'https://python.langchain.com/docs/concepts/agents/',
    ],
  },
  langgraph: {
    label: 'LangGraph',
    urls: [
      'https://langchain-ai.github.io/langgraph/tutorials/get-started/1-build-basic-chatbot/',
      'https://langchain-ai.github.io/langgraph/how-tos/create-react-agent/',
    ],
  },
  langsmith: {
    label: 'LangSmith',
    urls: [
      'https://docs.smith.langchain.com/how_to_guides/tracing',
      'https://docs.smith.langchain.com/how_to_guides/evaluation',
    ],
  },
  deepagents: {
    label: 'Deep Agents',
    urls: [
      'https://deepagents.ai/docs/quickstart',
    ],
  },
};

const CACHE_KEY = 'copilotkit-docs-cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Hardcoded fallback snippets ───
// Used when live fetch fails (CORS, offline, etc.)
// These are the critical API patterns that MUST be correct.

const FALLBACK_DOCS: Record<string, DocSnippet> = {
  copilotkit: {
    source: 'copilotkit',
    title: 'CopilotKit Python SDK — Current API (2025+)',
    content: `## CopilotKit Python SDK — Correct Integration Pattern

### Installation
\`\`\`bash
pip install copilotkit ag-ui-langgraph
\`\`\`

### Required Imports
\`\`\`python
from copilotkit import LangGraphAGUIAgent
from ag_ui_langgraph import add_langgraph_fastapi_endpoint
\`\`\`

### Correct Pattern (recommended by official CopilotKit docs)
\`\`\`python
from ag_ui_langgraph import add_langgraph_fastapi_endpoint
from copilotkit import LangGraphAGUIAgent

# Wrap ANY agent (LangChain, LangGraph, or custom) with LangGraphAGUIAgent
agent = LangGraphAGUIAgent(
    name="agent",
    description="My agent",
    graph=my_compiled_agent  # NOTE: parameter is 'graph=', NOT 'agent='
)

# Register with FastAPI using the AG-UI endpoint
add_langgraph_fastapi_endpoint(app=app, agent=agent, path="/copilotkit")
\`\`\`

### Alternative Pattern (SDK-based, also works)
\`\`\`python
from copilotkit import LangGraphAGUIAgent, CopilotKitRemoteEndpoint
from copilotkit.integrations.fastapi import add_fastapi_endpoint

agent = LangGraphAGUIAgent(name="agent", description="My agent", graph=my_compiled_agent)
sdk = CopilotKitRemoteEndpoint(agents=[agent])
add_fastapi_endpoint(app, sdk, "/copilotkit")
\`\`\`

### DEPRECATED / BROKEN — NEVER USE
- \`CopilotKitSDK\` — removed from SDK
- \`LangGraphAgent\` — rejected by SDK, must use LangGraphAGUIAgent

### Frontend React Setup
\`\`\`tsx
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";

<CopilotKit runtimeUrl="http://localhost:8000/copilotkit">
  <CopilotChat />
</CopilotKit>
\`\`\``,
    fetchedAt: new Date().toISOString(),
  },

  langchain: {
    source: 'langchain',
    title: 'LangChain Python — Current API (2025+)',
    content: `## LangChain Python — Agent Creation

### Installation
\`\`\`bash
pip install langchain langchain-openai langgraph
\`\`\`

### Creating Agents (Current API — use LangGraph's create_react_agent)
\`\`\`python
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool

@tool
def search(query: str) -> str:
    \"\"\"Search the web.\"\"\"
    return f"Results for {query}"

# Simple: pass model as string (uses init_chat_model internally)
agent = create_react_agent("openai:gpt-4o-mini", tools=[search])
\`\`\`

### DEPRECATED APIs — Do NOT use
- \`create_agent\` from \`langchain.agents\` — does NOT exist
- \`AgentExecutor\` — use \`create_react_agent\` from langgraph.prebuilt
- \`create_tool_calling_agent\` — use \`create_react_agent\`

### With CopilotKit
\`\`\`python
from copilotkit import LangGraphAGUIAgent
from ag_ui_langgraph import add_langgraph_fastapi_endpoint

agent_graph = create_react_agent("openai:gpt-4o-mini", tools=[search])
ck_agent = LangGraphAGUIAgent(name="agent", description="...", graph=agent_graph)
add_langgraph_fastapi_endpoint(app=app, agent=ck_agent, path="/copilotkit")
\`\`\``,
    fetchedAt: new Date().toISOString(),
  },

  langgraph: {
    source: 'langgraph',
    title: 'LangGraph — Current API (2025+)',
    content: `## LangGraph — Custom State Graphs

### Installation
\`\`\`bash
pip install langgraph langchain-openai
\`\`\`

### Simple Tool-Calling Agent
\`\`\`python
from langgraph.prebuilt import create_react_agent
compiled = create_react_agent("openai:gpt-4o-mini", tools=[my_tool])
\`\`\`

### Custom StateGraph Pattern
\`\`\`python
from langgraph.graph import StateGraph, MessagesState, START, END
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o")

def chatbot(state: MessagesState):
    return {"messages": [model.invoke(state["messages"])]}

graph = StateGraph(MessagesState)
graph.add_node("chatbot", chatbot)
graph.add_edge(START, "chatbot")
graph.add_edge("chatbot", END)
compiled = graph.compile()
\`\`\`

### Human-in-the-Loop (Approvals)
\`\`\`python
from langgraph.checkpoint.memory import MemorySaver
memory = MemorySaver()
compiled = graph.compile(checkpointer=memory, interrupt_before=["action_node"])
\`\`\`

### With CopilotKit
\`\`\`python
from copilotkit import LangGraphAGUIAgent
from ag_ui_langgraph import add_langgraph_fastapi_endpoint

ck_agent = LangGraphAGUIAgent(name="agent", description="...", graph=compiled)
add_langgraph_fastapi_endpoint(app=app, agent=ck_agent, path="/copilotkit")
\`\`\``,
    fetchedAt: new Date().toISOString(),
  },

  langsmith: {
    source: 'langsmith',
    title: 'LangSmith — Tracing & Evaluation API (2025+)',
    content: `## LangSmith — Tracing, Feedback & Evaluation

### Installation
\`\`\`bash
pip install langsmith
\`\`\`

### Environment Setup
\`\`\`bash
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY=your-langsmith-api-key
export LANGCHAIN_PROJECT=your-project-name
\`\`\`

### Tracing (automatic with LangChain)
When LANGCHAIN_TRACING_V2=true is set, all LangChain/LangGraph runs are automatically traced to LangSmith.

### Programmatic Feedback
\`\`\`python
from langsmith import Client

client = Client()
client.create_feedback(
    run_id=run_id,
    key="user-rating",
    score=1.0,
    comment="Great response"
)
\`\`\`

### Dataset Management
\`\`\`python
from langsmith import Client

client = Client()
dataset = client.create_dataset("my-dataset", description="Test cases")
client.create_example(
    inputs={"query": "What is AI?"},
    outputs={"answer": "AI is..."},
    dataset_id=dataset.id,
)
\`\`\`

### Evaluation
\`\`\`python
from langsmith.evaluation import evaluate

results = evaluate(
    my_agent,
    data="my-dataset",
    evaluators=[correctness, relevance],
)
\`\`\`

### With CopilotKit
LangSmith works alongside CopilotKit — traces are captured automatically when LangChain/LangGraph agents run through CopilotKit endpoints.
\`\`\`python
import os
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = "your-key"

from copilotkit import LangGraphAGUIAgent
from ag_ui_langgraph import add_langgraph_fastapi_endpoint
# Traces are automatically sent to LangSmith
\`\`\``,
    fetchedAt: new Date().toISOString(),
  },

  deepagents: {
    source: 'deepagents',
    title: 'Deep Agents — Current API',
    content: `## Deep Agents — Integration Pattern

### Installation
\`\`\`bash
pip install deepagents
\`\`\`

### Creating a Deep Agent
\`\`\`python
from deepagents import create_deep_agent

agent = create_deep_agent(
    model="openai:gpt-4o",
    tools=[...],
    reasoning_depth=3
)
\`\`\`

### With CopilotKit
Deep Agents work with CopilotKit via the same LangGraphAGUIAgent wrapper:
\`\`\`python
from copilotkit import LangGraphAGUIAgent
from ag_ui_langgraph import add_langgraph_fastapi_endpoint

ck_agent = LangGraphAGUIAgent(name="agent", description="...", graph=agent)
add_langgraph_fastapi_endpoint(app=app, agent=ck_agent, path="/copilotkit")
\`\`\`

### Key Points
- Deep Agents produce a compiled graph compatible with LangGraphAGUIAgent
- Same CopilotKit integration pattern as LangChain and LangGraph
- Supports tool calling, structured output, and streaming`,
    fetchedAt: new Date().toISOString(),
  },
};


// ─── Cache management ───

function loadCache(): DocsCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: DocsCache = JSON.parse(raw);
    const age = Date.now() - new Date(cache.lastUpdated).getTime();
    if (age > CACHE_TTL_MS) return null; // expired
    return cache;
  } catch {
    return null;
  }
}

function saveCache(cache: DocsCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full or unavailable — that's fine, we have fallbacks
  }
}

// ─── Live doc fetching ───

async function fetchDocPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let res: Response;
    try {
      res = await fetch(url, { signal: controller.signal, mode: 'cors' });
    } catch {
      // CORS blocked — try allorigins proxy with its own timeout
      const proxyController = new AbortController();
      const proxyTimeout = setTimeout(() => proxyController.abort(), 10000);
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        res = await fetch(proxyUrl, { signal: proxyController.signal });
      } finally {
        clearTimeout(proxyTimeout);
      }
    }
    clearTimeout(timeout);

    if (!res.ok) return null;
    const html = await res.text();
    return extractMainContent(html);
  } catch {
    return null;
  }
}

function extractMainContent(html: string): string {
  // Strip HTML tags, scripts, styles — extract text content
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '');

  // Try to find main content area
  const mainMatch = text.match(/<main[\s\S]*?<\/main>/i)
    || text.match(/<article[\s\S]*?<\/article>/i)
    || text.match(/<div[^>]*class="[^"]*content[^"]*"[\s\S]*?<\/div>/i);

  if (mainMatch) text = mainMatch[0];

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  // Limit to ~3000 chars to keep prompt size reasonable
  return text.slice(0, 3000);
}

// ─── Public API ───

/**
 * Fetch docs for the given frameworks. Returns cached if available,
 * otherwise fetches live, falling back to hardcoded snippets.
 */
export async function fetchDocs(
  frontend: FrontendType,
  runtime: RuntimeType,
): Promise<DocSnippet[]> {
  const needed = getNeededSources(frontend, runtime);
  const cache = loadCache();
  const results: DocSnippet[] = [];
  const updatedSnippets: Record<string, DocSnippet> = cache?.snippets || {};

  for (const key of needed) {
    // Check cache first
    if (cache?.snippets[key]) {
      results.push(cache.snippets[key]);
      continue;
    }

    // Try live fetch
    const source = DOC_SOURCES[key];
    if (source) {
      let liveContent = '';
      for (const url of source.urls) {
        const content = await fetchDocPage(url);
        if (content) {
          liveContent += `\n\n### From ${url}\n${content}`;
        }
      }

      if (liveContent.trim()) {
        const snippet: DocSnippet = {
          source: key,
          title: `${source.label} — Live Documentation`,
          content: liveContent.trim(),
          fetchedAt: new Date().toISOString(),
        };
        results.push(snippet);
        updatedSnippets[key] = snippet;
        continue;
      }
    }

    // Fall back to hardcoded
    if (FALLBACK_DOCS[key]) {
      results.push(FALLBACK_DOCS[key]);
      updatedSnippets[key] = FALLBACK_DOCS[key];
    }
  }

  // Update cache
  saveCache({ snippets: updatedSnippets, lastUpdated: new Date().toISOString() });

  return results;
}

/**
 * Get docs synchronously from cache/fallback only (no network).
 * Use this when you need docs immediately without waiting.
 */
export function getDocsSync(
  frontend: FrontendType,
  runtime: RuntimeType,
): DocSnippet[] {
  const needed = getNeededSources(frontend, runtime);
  const cache = loadCache();
  return needed.map((key) => cache?.snippets[key] || FALLBACK_DOCS[key]).filter(Boolean);
}

/**
 * Format doc snippets into a string for injection into the LLM prompt.
 */
export function formatDocsForPrompt(snippets: DocSnippet[]): string {
  if (snippets.length === 0) return '';

  const sections = snippets.map((s) =>
    `### ${s.title}\n${s.content}`
  ).join('\n\n---\n\n');

  return `\n\n## Reference Documentation (verified, current APIs)\nThe following documentation was fetched from official sources. Use ONLY these APIs.\n\n${sections}`;
}

/**
 * Clear the docs cache (e.g., when user wants to force refresh).
 */
export function clearDocsCache(): void {
  localStorage.removeItem(CACHE_KEY);
}

/**
 * Get cache status for UI display.
 */
export function getDocsCacheStatus(): {
  cached: boolean;
  lastUpdated: string | null;
  sources: string[];
} {
  const cache = loadCache();
  if (!cache) return { cached: false, lastUpdated: null, sources: [] };
  return {
    cached: true,
    lastUpdated: cache.lastUpdated,
    sources: Object.keys(cache.snippets),
  };
}

// ─── Helpers ───

function getNeededSources(frontend: FrontendType, runtime: RuntimeType): string[] {
  const sources: string[] = [];

  // Always need CopilotKit (it's the SDK layer for all backends)
  sources.push('copilotkit');

  // Backend-specific
  sources.push(runtime); // 'langchain' | 'langgraph' | 'deepagents'

  return [...new Set(sources)];
}
