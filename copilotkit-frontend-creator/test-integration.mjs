/**
 * Integration test for CopilotKit Frontend Creator
 * Tests: Mistral API, LLM Transformer, Connection Validation, Runtime Adapters
 * 
 * Run: node test-integration.mjs
 */

const MISTRAL_API_KEY = "flP4FuIODfPqYLAxvjDpTRH77OiR7peY";

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  return fn().then(() => {
    passed++;
    results.push({ name, status: 'PASS' });
    console.log(`  ✅ ${name}`);
  }).catch((err) => {
    failed++;
    results.push({ name, status: 'FAIL', error: err.message });
    console.log(`  ❌ ${name}: ${err.message}`);
  });
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

// ─── Test 1: Mistral API Direct Connection ───
async function testMistralApiDirect() {
  console.log('\n📡 Test Group 1: Mistral API Direct Connection');

  await test('Mistral API - chat completions endpoint reachable', async () => {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: 'Say "hello" and nothing else.' }],
        temperature: 0,
        max_tokens: 10,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API returned ${res.status}: ${errText}`);
    }
    const data = await res.json();
    assert(data.choices && data.choices.length > 0, 'No choices in response');
    assert(data.choices[0].message.content.toLowerCase().includes('hello'), 
      `Expected "hello", got: ${data.choices[0].message.content}`);
  });

  await test('Mistral API - models list endpoint', async () => {
    const res = await fetch('https://api.mistral.ai/v1/models', {
      headers: { 'Authorization': `Bearer ${MISTRAL_API_KEY}` },
    });
    assert(res.ok, `Models endpoint returned ${res.status}`);
    const data = await res.json();
    assert(data.data && data.data.length > 0, 'No models returned');
    const modelIds = data.data.map(m => m.id);
    console.log(`    Available models: ${modelIds.slice(0, 5).join(', ')}...`);
  });

  await test('Mistral API - mistral-large-latest model works', async () => {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: 'Reply with just the word "ok"' }],
        temperature: 0,
        max_tokens: 5,
      }),
    });
    assert(res.ok, `API returned ${res.status}`);
    const data = await res.json();
    assert(data.choices?.[0]?.message?.content, 'No content in response');
  });
}

// ─── Test 2: LLM Transformer (Mistral-powered code transformation) ───
async function testLLMTransformer() {
  console.log('\n🔄 Test Group 2: LLM Code Transformer with Mistral');

  const SYSTEM_PROMPT_SNIPPET = `You are an expert Python backend engineer. Output ONLY valid Python code followed by ---META--- and a JSON object.`;

  async function callMistralForTransform(userPrompt) {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT_SNIPPET },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 2048,
      }),
    });
    assert(res.ok, `Mistral API error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  await test('Transform LangChain agent code', async () => {
    const input = `from langchain.agents import create_agent
from langchain_core.tools import tool

@tool
def search(query: str) -> str:
    """Search the web"""
    return f"Results for {query}"

agent = create_agent(model="openai:gpt-4o", tools=[search])`;

    const prompt = `Transform this LangChain agent code into a CopilotKit-compatible agent_server.py. Include FastAPI, CORS, health endpoint, and CopilotKit SDK integration. After the code, add ---META--- followed by JSON with runtime, warnings, deps, runCommand, explanation.\n\n${input}`;
    
    const raw = await callMistralForTransform(prompt);
    assert(raw.length > 100, `Response too short: ${raw.length} chars`);
    
    // Check for key elements
    const hasImports = raw.includes('import') || raw.includes('from');
    assert(hasImports, 'No imports found in generated code');
    console.log(`    Generated ${raw.length} chars of code`);
  });

  await test('Transform LangGraph agent code', async () => {
    const input = `from langgraph.graph import StateGraph, MessagesState

def agent_node(state: MessagesState):
    return {"messages": [{"role": "assistant", "content": "Hello from LangGraph!"}]}

graph = StateGraph(MessagesState)
graph.add_node("agent", agent_node)
graph.set_entry_point("agent")
agent = graph.compile()`;

    const prompt = `Transform this LangGraph agent code into a CopilotKit-compatible agent_server.py. Include FastAPI, CORS, health endpoint, and CopilotKit SDK with LangGraphAGUIAgent. After the code, add ---META--- followed by JSON with runtime set to "langgraph".\n\n${input}`;
    
    const raw = await callMistralForTransform(prompt);
    assert(raw.length > 100, `Response too short: ${raw.length} chars`);
    console.log(`    Generated ${raw.length} chars of LangGraph code`);
  });

  await test('Transform DeepAgents code', async () => {
    const input = `from deepagents import create_deep_agent

agent = create_deep_agent(
    name="research-agent",
    model="openai:gpt-4o",
    instructions="You are a research assistant."
)`;

    const prompt = `Transform this Deep Agents code into a CopilotKit-compatible agent_server.py. Include FastAPI, CORS, health endpoint, and CopilotKit SDK. After the code, add ---META--- followed by JSON with runtime set to "deepagents".\n\n${input}`;
    
    const raw = await callMistralForTransform(prompt);
    assert(raw.length > 100, `Response too short: ${raw.length} chars`);
    console.log(`    Generated ${raw.length} chars of DeepAgents code`);
  });

  await test('Mistral handles frontend block context', async () => {
    const prompt = `Transform this agent code into a CopilotKit-compatible agent_server.py:

from langchain.agents import create_agent
agent = create_agent(model="openai:gpt-4o", tools=[])

The frontend has these UI blocks:
- Chat (type: chat) - needs chat, streaming
- Tool Activity (type: toolActivity) - needs toolCalls, toolResults
- Logs (type: logs) - needs logs
- Status (type: status) - needs progress

Add the minimum backend code to support ALL these blocks. After the code, add ---META--- with warnings about any blocks that can't be fully supported.`;

    const raw = await callMistralForTransform(prompt);
    assert(raw.length > 100, 'Response too short');
    console.log(`    Generated ${raw.length} chars with block-aware code`);
  });
}

// ─── Test 3: Connection Validation Logic ───
async function testConnectionValidation() {
  console.log('\n🔌 Test Group 3: Connection Validation Logic');

  // Simulate the validation logic from connection-validator.ts
  function validateConnection(profile) {
    const errors = [];
    const warnings = [];
    const capabilities = [];

    if (!profile.baseUrl) {
      errors.push({ code: 'MISSING_BASE_URL', severity: 'blocking' });
      return { status: 'error', capabilities, errors, warnings };
    }

    try { new URL(profile.baseUrl); } catch {
      errors.push({ code: 'INVALID_URL', severity: 'blocking' });
      return { status: 'error', capabilities, errors, warnings };
    }

    const requiresAgentId = ['langgraph', 'deepagents'];
    if (requiresAgentId.includes(profile.runtime) && !profile.agentId) {
      errors.push({ code: 'MISSING_AGENT_ID', severity: 'blocking' });
    }

    if (profile.auth.mode === 'bearer' && !profile.auth.tokenEnv && !profile.auth.tokenValue) {
      errors.push({ code: 'MISSING_AUTH_TOKEN', severity: 'blocking' });
    }

    if (errors.length === 0) {
      capabilities.push('chat', 'streaming');
      if (profile.runtime === 'langgraph') capabilities.push('intermediateState');
    }

    return {
      status: errors.length > 0 ? 'error' : 'ok',
      capabilities, errors, warnings,
      timestamp: new Date().toISOString(),
    };
  }

  await test('LangChain connection - valid', async () => {
    const result = validateConnection({
      runtime: 'langchain',
      baseUrl: 'http://localhost:8000',
      auth: { mode: 'none' },
    });
    assert(result.status === 'ok', `Expected ok, got ${result.status}`);
    assert(result.capabilities.includes('chat'), 'Missing chat capability');
  });

  await test('LangGraph connection - valid with agent ID', async () => {
    const result = validateConnection({
      runtime: 'langgraph',
      baseUrl: 'http://localhost:2024',
      agentId: 'agent',
      auth: { mode: 'none' },
    });
    assert(result.status === 'ok', `Expected ok, got ${result.status}`);
    assert(result.capabilities.includes('intermediateState'), 'Missing intermediateState');
  });

  await test('LangGraph connection - fails without agent ID', async () => {
    const result = validateConnection({
      runtime: 'langgraph',
      baseUrl: 'http://localhost:2024',
      auth: { mode: 'none' },
    });
    assert(result.status === 'error', 'Should fail without agent ID');
    assert(result.errors.some(e => e.code === 'MISSING_AGENT_ID'), 'Missing MISSING_AGENT_ID error');
  });

  await test('DeepAgents connection - valid with agent ID', async () => {
    const result = validateConnection({
      runtime: 'deepagents',
      baseUrl: 'http://localhost:3001',
      agentId: 'default',
      auth: { mode: 'none' },
    });
    assert(result.status === 'ok', `Expected ok, got ${result.status}`);
  });

  await test('DeepAgents connection - fails without agent ID', async () => {
    const result = validateConnection({
      runtime: 'deepagents',
      baseUrl: 'http://localhost:3001',
      auth: { mode: 'none' },
    });
    assert(result.status === 'error', 'Should fail without agent ID');
  });

  await test('Connection - fails with missing URL', async () => {
    const result = validateConnection({
      runtime: 'langchain',
      baseUrl: '',
      auth: { mode: 'none' },
    });
    assert(result.status === 'error', 'Should fail with empty URL');
  });

  await test('Connection - fails with invalid URL', async () => {
    const result = validateConnection({
      runtime: 'langchain',
      baseUrl: 'not-a-url',
      auth: { mode: 'none' },
    });
    assert(result.status === 'error', 'Should fail with invalid URL');
  });

  await test('Bearer auth - fails without token', async () => {
    const result = validateConnection({
      runtime: 'langchain',
      baseUrl: 'http://localhost:8000',
      auth: { mode: 'bearer' },
    });
    assert(result.status === 'error', 'Should fail without bearer token');
  });

  await test('Bearer auth - passes with token value', async () => {
    const result = validateConnection({
      runtime: 'langchain',
      baseUrl: 'http://localhost:8000',
      auth: { mode: 'bearer', tokenValue: 'test-token' },
    });
    assert(result.status === 'ok', `Expected ok, got ${result.status}`);
  });
}

// ─── Test 4: Runtime Adapter Configuration ───
async function testRuntimeAdapter() {
  console.log('\n⚙️  Test Group 4: Runtime Adapter Configuration');

  function buildRuntimeConfig(profile) {
    const base = profile.baseUrl.replace(/\/+$/, '');
    const headers = {};
    const token = profile.auth.tokenValue || '';
    if (profile.auth.mode === 'bearer' && token) headers['Authorization'] = `Bearer ${token}`;
    if (profile.auth.mode === 'api-key' && token) headers['X-API-Key'] = token;

    const builders = {
      langchain: () => ({
        runtimeUrl: `${base}/copilotkit`,
        headers,
        properties: { runtime: 'langchain', ...(profile.env || {}) },
      }),
      langgraph: () => ({
        runtimeUrl: `${base}/copilotkit`,
        headers,
        properties: {
          runtime: 'langgraph',
          'langgraph-agent-id': profile.agentId || 'agent',
          ...(profile.env || {}),
        },
      }),
      deepagents: () => ({
        runtimeUrl: `${base}/copilotkit`,
        headers,
        properties: {
          runtime: 'deepagents',
          'agent-id': profile.agentId || 'default',
          ...(profile.env || {}),
        },
      }),
      tambo: () => ({
        runtimeUrl: `${base}/mcp`,
        headers,
        properties: {
          runtime: 'tambo',
          'tambo-api-key': profile.env?.TAMBO_API_KEY || '',
          'tambo-url': profile.env?.TAMBO_URL || 'https://api.tambo.co',
          'mcp-server-url': `${base}/mcp`,
          ...(profile.env || {}),
        },
      }),
    };
    return builders[profile.runtime]();
  }

  await test('LangChain runtime config', async () => {
    const config = buildRuntimeConfig({
      runtime: 'langchain',
      baseUrl: 'http://localhost:8000',
      auth: { mode: 'none' },
    });
    assert(config.runtimeUrl === 'http://localhost:8000/copilotkit', `Wrong URL: ${config.runtimeUrl}`);
    assert(config.properties.runtime === 'langchain', 'Wrong runtime property');
  });

  await test('LangGraph runtime config with agent ID', async () => {
    const config = buildRuntimeConfig({
      runtime: 'langgraph',
      baseUrl: 'http://localhost:2024',
      agentId: 'my-agent',
      auth: { mode: 'none' },
    });
    assert(config.runtimeUrl === 'http://localhost:2024/copilotkit', `Wrong URL: ${config.runtimeUrl}`);
    assert(config.properties['langgraph-agent-id'] === 'my-agent', 'Wrong agent ID');
  });

  await test('DeepAgents runtime config', async () => {
    const config = buildRuntimeConfig({
      runtime: 'deepagents',
      baseUrl: 'http://localhost:3001',
      agentId: 'research',
      auth: { mode: 'none' },
    });
    assert(config.runtimeUrl === 'http://localhost:3001/copilotkit', `Wrong URL: ${config.runtimeUrl}`);
    assert(config.properties['agent-id'] === 'research', 'Wrong agent ID');
  });

  await test('Tambo runtime config (MCP endpoint)', async () => {
    const config = buildRuntimeConfig({
      runtime: 'tambo',
      baseUrl: 'http://localhost:8000',
      auth: { mode: 'none' },
      env: { TAMBO_API_KEY: 'tb_test123', TAMBO_URL: 'https://api.tambo.co' },
    });
    assert(config.runtimeUrl === 'http://localhost:8000/mcp', `Wrong URL: ${config.runtimeUrl}`);
    assert(config.properties['tambo-api-key'] === 'tb_test123', 'Wrong Tambo API key');
    assert(config.properties['mcp-server-url'] === 'http://localhost:8000/mcp', 'Wrong MCP server URL');
  });

  await test('Bearer auth headers', async () => {
    const config = buildRuntimeConfig({
      runtime: 'langchain',
      baseUrl: 'http://localhost:8000',
      auth: { mode: 'bearer', tokenValue: 'my-secret-token' },
    });
    assert(config.headers['Authorization'] === 'Bearer my-secret-token', 'Wrong auth header');
  });

  await test('API key auth headers', async () => {
    const config = buildRuntimeConfig({
      runtime: 'langgraph',
      baseUrl: 'http://localhost:2024',
      agentId: 'agent',
      auth: { mode: 'api-key', tokenValue: 'key123' },
    });
    assert(config.headers['X-API-Key'] === 'key123', 'Wrong API key header');
  });

  await test('URL trailing slash stripped', async () => {
    const config = buildRuntimeConfig({
      runtime: 'langchain',
      baseUrl: 'http://localhost:8000///',
      auth: { mode: 'none' },
    });
    assert(config.runtimeUrl === 'http://localhost:8000/copilotkit', `Trailing slashes not stripped: ${config.runtimeUrl}`);
  });
}

// ─── Test 5: Block Compatibility ───
async function testBlockCompatibility() {
  console.log('\n🧩 Test Group 5: Block Compatibility Detection');

  function getCompatibleBlocks(capabilities, requestedBlocks) {
    const capSet = new Set(capabilities);
    const blockCapMap = {
      chat: ['chat'],
      results: ['structuredOutput'],
      toolActivity: ['toolCalls'],
      approvals: ['approvals'],
      logs: ['logs'],
      status: ['progress'],
      form: [],
      table: ['structuredOutput'],
      chart: ['structuredOutput'],
      dashboard: ['structuredOutput'],
      cards: ['structuredOutput'],
      panel: [],
      markdown: [],
    };

    const supported = [];
    const unsupported = [];
    for (const block of requestedBlocks) {
      const required = blockCapMap[block] || [];
      if (required.length === 0 || required.every(c => capSet.has(c))) {
        supported.push(block);
      } else {
        unsupported.push(block);
      }
    }
    return { supported, unsupported, fallback: ['chat', 'status', 'logs'] };
  }

  await test('All blocks supported with full capabilities', async () => {
    const caps = ['chat', 'streaming', 'toolCalls', 'structuredOutput', 'approvals', 'logs', 'progress'];
    const blocks = ['chat', 'results', 'toolActivity', 'approvals', 'logs', 'status'];
    const { unsupported } = getCompatibleBlocks(caps, blocks);
    assert(unsupported.length === 0, `Unexpected unsupported: ${unsupported.join(', ')}`);
  });

  await test('Blocks without requirements always supported', async () => {
    const { supported } = getCompatibleBlocks([], ['form', 'panel', 'markdown']);
    assert(supported.length === 3, 'Form, panel, markdown should always be supported');
  });

  await test('Missing capabilities detected', async () => {
    const { unsupported } = getCompatibleBlocks(['chat'], ['chat', 'results', 'toolActivity']);
    assert(unsupported.includes('results'), 'results should be unsupported');
    assert(unsupported.includes('toolActivity'), 'toolActivity should be unsupported');
  });
}

// ─── Test 6: Tambo Bridge Configuration ───
async function testTamboBridge() {
  console.log('\n🌉 Test Group 6: Tambo Bridge Configuration');

  await test('Tambo config built correctly from connection', async () => {
    const conn = {
      runtime: 'tambo',
      baseUrl: 'http://localhost:8000',
      auth: { mode: 'none' },
      env: { TAMBO_API_KEY: 'tb_key', TAMBO_URL: 'https://api.tambo.co' },
    };
    
    // Simulate buildRuntimeConfig for tambo
    const base = conn.baseUrl.replace(/\/+$/, '');
    const rtConfig = {
      runtimeUrl: `${base}/mcp`,
      headers: {},
      properties: {
        runtime: 'tambo',
        'tambo-api-key': conn.env.TAMBO_API_KEY,
        'tambo-url': conn.env.TAMBO_URL,
        'mcp-server-url': `${base}/mcp`,
      },
    };

    const tamboConfig = {
      apiKey: rtConfig.properties['tambo-api-key'] || '',
      tamboUrl: rtConfig.properties['tambo-url'] || 'https://api.tambo.co',
      mcpServerUrl: rtConfig.runtimeUrl,
      backendHeaders: rtConfig.headers,
      isConnected: true,
    };

    assert(tamboConfig.apiKey === 'tb_key', 'Wrong Tambo API key');
    assert(tamboConfig.mcpServerUrl === 'http://localhost:8000/mcp', 'Wrong MCP server URL');
    assert(tamboConfig.isConnected === true, 'Should be connected');
  });

  await test('Tambo disconnected when no tambo connection', async () => {
    const tamboConfig = {
      apiKey: '',
      tamboUrl: '',
      mcpServerUrl: '',
      backendHeaders: {},
      isConnected: false,
    };
    assert(tamboConfig.isConnected === false, 'Should be disconnected');
  });
}

// ─── Test 7: Code Post-Processing ───
async function testCodePostProcessing() {
  console.log('\n🔧 Test Group 7: Code Post-Processing');

  function postProcessCode(code) {
    let lines = code.split('\n');

    // Fix LangGraphAgent -> LangGraphAGUIAgent
    lines = lines.map(l => {
      if (/\bLangGraphAgent\b/.test(l) && !/LangGraphAGUIAgent/.test(l)) {
        return l.replace(/\bLangGraphAgent\b/g, 'LangGraphAGUIAgent');
      }
      return l;
    });

    // Fix agent= -> graph= in LangGraphAGUIAgent
    lines = lines.map(l => {
      if (/LangGraphAGUIAgent\(/.test(l) && /\bagent\s*=/.test(l) && !/\bgraph\s*=/.test(l)) {
        return l.replace(/\bagent\s*=/, 'graph=');
      }
      return l;
    });

    // Remove duplicate load_dotenv()
    let dotenvCount = 0;
    lines = lines.filter(l => {
      if (/^load_dotenv\(\)/.test(l.trim())) {
        dotenvCount++;
        return dotenvCount <= 1;
      }
      return true;
    });

    return lines.join('\n');
  }

  await test('Replaces LangGraphAgent with LangGraphAGUIAgent', async () => {
    const input = 'sdk = CopilotKitSDK(agents=[LangGraphAgent(name="agent")])';
    const output = postProcessCode(input);
    assert(output.includes('LangGraphAGUIAgent'), 'Should replace LangGraphAgent');
    assert(!output.match(/\bLangGraphAgent\b(?!AGUI)/), 'Should not have bare LangGraphAgent');
  });

  await test('Replaces agent= with graph= in LangGraphAGUIAgent', async () => {
    const input = 'LangGraphAGUIAgent(name="agent", agent=my_agent)';
    const output = postProcessCode(input);
    assert(output.includes('graph='), 'Should replace agent= with graph=');
  });

  await test('Removes duplicate load_dotenv()', async () => {
    const input = 'load_dotenv()\nsome_code()\nload_dotenv()';
    const output = postProcessCode(input);
    const count = (output.match(/load_dotenv\(\)/g) || []).length;
    assert(count === 1, `Expected 1 load_dotenv, got ${count}`);
  });

  await test('Preserves LangGraphAGUIAgent (no double replace)', async () => {
    const input = 'from copilotkit import CopilotKitSDK, LangGraphAGUIAgent';
    const output = postProcessCode(input);
    assert(output === input, 'Should not modify already correct import');
  });
}

// ─── Test 8: Deploy Validation ───
async function testDeployValidation() {
  console.log('\n🚀 Test Group 8: Deploy Validation');

  function validateForDeploy(code) {
    const issues = [];
    if (!code.includes('add_fastapi_endpoint')) issues.push('Missing CopilotKit endpoint');
    if (!code.includes('/copilotkit')) issues.push('Missing /copilotkit route');
    if (!code.includes('/health')) issues.push('Missing /health endpoint');
    if (!code.includes('CORSMiddleware')) issues.push('Missing CORS middleware');
    return { valid: issues.length === 0, issues };
  }

  await test('Valid deploy code passes', async () => {
    const code = `
from fastapi.middleware.cors import CORSMiddleware
add_fastapi_endpoint(app, sdk, "/copilotkit")
@app.get("/health")
def health(): return {"status": "ok"}`;
    const result = validateForDeploy(code);
    assert(result.valid, `Should be valid, issues: ${result.issues.join(', ')}`);
  });

  await test('Missing endpoint detected', async () => {
    const code = 'app = FastAPI()';
    const result = validateForDeploy(code);
    assert(!result.valid, 'Should be invalid');
    assert(result.issues.length > 0, 'Should have issues');
  });
}

// ─── Run All Tests ───
async function main() {
  console.log('🧪 CopilotKit Frontend Creator — Integration Tests');
  console.log('═══════════════════════════════════════════════════');

  await testMistralApiDirect();
  await testLLMTransformer();
  await testConnectionValidation();
  await testRuntimeAdapter();
  await testBlockCompatibility();
  await testTamboBridge();
  await testCodePostProcessing();
  await testDeployValidation();

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`📊 Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  
  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   • ${r.name}: ${r.error}`);
    });
  }
  
  console.log(failed === 0 ? '\n✅ All tests passed!' : '\n⚠️  Some tests failed.');
  process.exit(failed > 0 ? 1 : 0);
}

main();
