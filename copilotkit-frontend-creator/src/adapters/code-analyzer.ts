// ─── Agent Code Analyzer ───
// Analyzes raw agent code to detect capabilities, suggest compatible blocks,
// and identify incompatible blocks that should be removed.

import type { RuntimeCapability, BlockType, BlockConfig } from '@/types/blocks';
import { BLOCK_REGISTRY, getBlockDefinition } from '@/registry/block-registry';

export interface CodeAnalysis {
  /** Capabilities detected from the raw agent code */
  capabilities: Set<RuntimeCapability>;
  /** Detected runtime/framework */
  runtime: 'langchain' | 'langgraph' | 'langsmith' | 'deepagents' | 'unknown';
  /** Blocks that are compatible with the code and not yet added */
  suggestedBlocks: BlockSuggestion[];
  /** Blocks currently in workspace that are NOT compatible */
  incompatibleBlocks: IncompatibleBlock[];
  /** Blocks currently in workspace that ARE compatible */
  compatibleBlocks: BlockConfig[];
  /** Brief summary of what the code does */
  codeSummary: string;
}

export interface BlockSuggestion {
  type: BlockType;
  label: string;
  description: string;
  icon: string;
  /** Why this block is recommended for this code */
  reason: string;
  /** Priority: higher = more relevant (1-10) */
  priority: number;
  /** Which detected capabilities make this block work */
  matchedCapabilities: RuntimeCapability[];
}

export interface IncompatibleBlock {
  block: BlockConfig;
  missingCapabilities: RuntimeCapability[];
  reason: string;
}

/**
 * Analyze agent code and return capabilities, suggestions, and incompatibilities.
 */
export function analyzeAgentCode(
  code: string,
  currentBlocks: BlockConfig[],
): CodeAnalysis {
  if (!code.trim()) {
    return {
      capabilities: new Set(),
      runtime: 'unknown',
      suggestedBlocks: [],
      incompatibleBlocks: [],
      compatibleBlocks: [],
      codeSummary: '',
    };
  }

  const capabilities = detectCapabilities(code);
  const runtime = detectRuntime(code);
  const codeSummary = buildCodeSummary(code, capabilities, runtime);

  // Add implicit capabilities based on runtime
  addImplicitCapabilities(capabilities, runtime);

  // Find blocks already in workspace
  const currentTypes = new Set(currentBlocks.map((b) => b.type));

  // Suggest blocks that match capabilities and aren't already added
  const suggestedBlocks = buildSuggestions(capabilities, currentTypes, runtime);

  // Find incompatible blocks in current workspace
  const incompatibleBlocks: IncompatibleBlock[] = [];
  const compatibleBlocks: BlockConfig[] = [];

  for (const block of currentBlocks) {
    const def = getBlockDefinition(block.type);
    const required = def?.requiredCapabilities ?? [];
    if (required.length === 0) {
      compatibleBlocks.push(block);
      continue;
    }
    const missing = required.filter((cap) => !capabilities.has(cap));
    if (missing.length > 0) {
      incompatibleBlocks.push({
        block,
        missingCapabilities: missing,
        reason: getIncompatibilityReason(block.type, missing),
      });
    } else {
      compatibleBlocks.push(block);
    }
  }

  return {
    capabilities,
    runtime,
    suggestedBlocks,
    incompatibleBlocks,
    compatibleBlocks,
    codeSummary,
  };
}


// ─── Capability Detection ───

function detectCapabilities(code: string): Set<RuntimeCapability> {
  const caps = new Set<RuntimeCapability>();

  // Chat & streaming — any agent framework implies these
  if (/CopilotKit|copilotkit|create_react_agent|StateGraph|AgentExecutor|ChatModel|BaseChatModel/.test(code)) {
    caps.add('chat');
    caps.add('streaming');
  }

  // Tool calls
  if (/tools\s*=\s*\[|@tool|Tool\(|StructuredTool|BaseTool|bind_tools|tool_calls|function_call/.test(code)) {
    caps.add('toolCalls');
    caps.add('toolResults');
  }

  // Approvals / human-in-the-loop
  if (/interrupt_before|interrupt_after|human_in_the_loop|approval|ask_human|HumanApproval/.test(code)) {
    caps.add('approvals');
  }

  // Structured output
  if (/BaseModel|TypedDict|Pydantic|structured_output|json_schema|response_format|output_schema|with_structured_output/.test(code)) {
    caps.add('structuredOutput');
  }

  // Logging
  if (/import\s+logging|logging\.basicConfig|getLogger|logger\s*=|verbose\s*=\s*True/.test(code)) {
    caps.add('logs');
  }

  // Progress / status tracking
  if (/progress|on_chain_start|on_chain_end|StreamEvent|callback|CallbackHandler|AsyncCallbackHandler/.test(code)) {
    caps.add('progress');
  }

  // Intermediate state (LangGraph StateGraph)
  if (/StateGraph|state_schema|AgentState|MessagesState|add_node|add_edge|compile/.test(code)) {
    caps.add('intermediateState');
  }

  // Sub-agents / multi-agent
  if (/create_agent|multi.?agent|supervisor|crew|sub.?agent|delegate|AgentExecutor/i.test(code)) {
    caps.add('subagents');
  }

  // LangSmith tracing
  if (/LANGCHAIN_TRACING|langsmith|LangSmith|Client\(\)|from\s+langsmith/.test(code)) {
    caps.add('logs');
    caps.add('toolCalls');
  }

  return caps;
}

function detectRuntime(code: string): CodeAnalysis['runtime'] {
  if (/from\s+deepagents|create_deep_agent|DeepAgent/i.test(code)) return 'deepagents';
  if (/from\s+langsmith|LangSmith|LANGCHAIN_TRACING_V2/.test(code)) return 'langsmith';
  if (/StateGraph|from\s+langgraph|create_react_agent|MessagesState/.test(code)) return 'langgraph';
  if (/from\s+langchain|LangChain|AgentExecutor|ChatOpenAI|ChatAnthropic/.test(code)) return 'langchain';
  return 'unknown';
}

function addImplicitCapabilities(caps: Set<RuntimeCapability>, runtime: CodeAnalysis['runtime']) {
  // LangGraph always supports chat, streaming, and intermediate state
  if (runtime === 'langgraph') {
    caps.add('chat');
    caps.add('streaming');
    caps.add('intermediateState');
  }
  // LangChain always supports chat and streaming
  if (runtime === 'langchain') {
    caps.add('chat');
    caps.add('streaming');
  }
  // LangSmith adds logs and tool tracking
  if (runtime === 'langsmith') {
    caps.add('chat');
    caps.add('streaming');
    caps.add('logs');
    caps.add('toolCalls');
    caps.add('toolResults');
  }
  // Deep agents add sub-agent and progress tracking
  if (runtime === 'deepagents') {
    caps.add('chat');
    caps.add('streaming');
    caps.add('subagents');
    caps.add('progress');
    caps.add('intermediateState');
  }
}

// ─── Block Suggestions ───

function buildSuggestions(
  capabilities: Set<RuntimeCapability>,
  currentTypes: Set<string>,
  runtime: CodeAnalysis['runtime'],
): BlockSuggestion[] {
  const suggestions: BlockSuggestion[] = [];

  for (const def of BLOCK_REGISTRY) {
    // Skip blocks already in workspace
    if (currentTypes.has(def.type)) continue;
    // Skip custom type
    if (def.type === 'custom') continue;

    const required = def.requiredCapabilities;

    // Blocks with no requirements are always compatible (but low priority)
    if (required.length === 0) {
      suggestions.push({
        type: def.type,
        label: def.label,
        description: def.description,
        icon: def.icon,
        reason: `Universal block — works with any agent`,
        priority: 2,
        matchedCapabilities: [],
      });
      continue;
    }

    // Check if all required capabilities are met
    const matched = required.filter((cap) => capabilities.has(cap));
    const missing = required.filter((cap) => !capabilities.has(cap));

    if (missing.length === 0) {
      const reason = getSuggestionReason(def.type, matched, runtime);
      const priority = getSuggestionPriority(def.type, matched, runtime);
      suggestions.push({
        type: def.type,
        label: def.label,
        description: def.description,
        icon: def.icon,
        reason,
        priority,
        matchedCapabilities: matched,
      });
    }
  }

  // Sort by priority descending
  suggestions.sort((a, b) => b.priority - a.priority);
  return suggestions;
}

function getSuggestionReason(
  blockType: string,
  matched: RuntimeCapability[],
  runtime: CodeAnalysis['runtime'],
): string {
  const reasons: Record<string, string> = {
    chat: 'Your agent supports chat — add a Chat panel for interactive conversations',
    results: 'Your agent returns structured data — display it with a Results block',
    toolActivity: 'Your agent has tools — show live tool calls and results',
    approvals: 'Your agent has human-in-the-loop — add an Approvals panel',
    logs: 'Your agent has logging — display execution logs in real-time',
    status: 'Your agent tracks progress — show a status indicator',
    table: 'Your agent returns structured data — display it in a sortable table',
    chart: 'Your agent returns structured data — visualize it with charts',
    dashboard: 'Your agent returns structured data — create a KPI dashboard',
    cards: 'Your agent returns structured data — show items as cards',
    traceViewer: 'Your agent has tracing enabled — view execution traces',
    feedback: 'Add user feedback collection for agent responses',
    dataset: 'Your agent returns structured data — browse datasets',
    annotationQueue: 'Your agent has approval flows — add annotation review',
    reasoningChain: 'Your agent streams intermediate state — visualize reasoning steps',
    subAgentTree: 'Your agent uses sub-agents — show the delegation tree',
    depthIndicator: 'Your agent tracks progress — show reasoning depth',
  };
  return reasons[blockType] || `Compatible with your agent's capabilities: ${matched.join(', ')}`;
}

function getSuggestionPriority(
  blockType: string,
  matched: RuntimeCapability[],
  runtime: CodeAnalysis['runtime'],
): number {
  // Core blocks get higher priority
  const priorities: Record<string, number> = {
    chat: 10,
    toolActivity: 8,
    results: 7,
    logs: 6,
    approvals: 7,
    status: 5,
    table: 6,
    chart: 5,
    dashboard: 5,
    cards: 5,
    traceViewer: runtime === 'langsmith' ? 8 : 4,
    feedback: 3,
    dataset: runtime === 'langsmith' ? 6 : 3,
    annotationQueue: 4,
    reasoningChain: runtime === 'deepagents' ? 8 : 4,
    subAgentTree: runtime === 'deepagents' ? 8 : 4,
    depthIndicator: runtime === 'deepagents' ? 6 : 3,
  };
  return priorities[blockType] ?? Math.min(matched.length * 2, 6);
}

// ─── Incompatibility Reasons ───

function getIncompatibilityReason(blockType: string, missing: RuntimeCapability[]): string {
  const reasons: Record<string, string> = {
    results: 'Agent doesn\'t return structured data (needs Pydantic/TypedDict)',
    toolActivity: 'Agent has no tools defined (needs @tool decorator)',
    approvals: 'Agent has no interrupt points (needs interrupt_before/after)',
    logs: 'Agent has no logging configured (needs import logging)',
    status: 'Agent doesn\'t track progress (needs callbacks/StreamEvent)',
    table: 'Agent doesn\'t return structured data',
    chart: 'Agent doesn\'t return structured/numeric data',
    dashboard: 'Agent doesn\'t return structured KPI data',
    cards: 'Agent doesn\'t return structured items',
    traceViewer: 'Agent doesn\'t have tracing or tool calls enabled',
    annotationQueue: 'Agent doesn\'t have approval workflows',
    reasoningChain: 'Agent doesn\'t stream intermediate state',
    subAgentTree: 'Agent doesn\'t use sub-agents with progress tracking',
    depthIndicator: 'Agent doesn\'t track progress/depth',
    dataset: 'Agent doesn\'t return structured data',
  };
  return reasons[blockType] || `Missing capabilities: ${missing.join(', ')}`;
}

// ─── Code Summary ───

function buildCodeSummary(
  code: string,
  capabilities: Set<RuntimeCapability>,
  runtime: CodeAnalysis['runtime'],
): string {
  const parts: string[] = [];

  const runtimeLabels: Record<string, string> = {
    langgraph: 'LangGraph',
    langchain: 'LangChain',
    langsmith: 'LangSmith',
    deepagents: 'Deep Agents',
    unknown: 'Python',
  };
  parts.push(`${runtimeLabels[runtime]} agent`);

  // Count tools
  const toolMatches = code.match(/@tool|def\s+\w+.*->.*:/g);
  if (toolMatches) {
    parts.push(`${toolMatches.length} tool(s)`);
  }

  if (capabilities.has('approvals')) parts.push('human-in-the-loop');
  if (capabilities.has('structuredOutput')) parts.push('structured output');
  if (capabilities.has('subagents')) parts.push('multi-agent');

  return parts.join(' · ');
}
