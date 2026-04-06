import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Copy, Check, Wand2, AlertTriangle, ChevronDown,
  Loader2, Terminal, RotateCcw,
  Key, X, Trash2, CheckCircle2, XCircle, Download,
  Settings, Brain, Sparkles, Eye, EyeOff, FileCode, ChevronRight, BookOpen,
  Plus, MessageSquare, LayoutList, Wrench, ShieldCheck, ScrollText,
  Activity, FileInput, Table, BarChart3, LayoutDashboard,
  Layers, PanelTop, FileText, GitBranch, ThumbsUp, Database,
  ClipboardList, Network, Gauge,
} from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useLLMStore, AVAILABLE_MODELS } from '@/store/llm-store';
import type { LLMProvider } from '@/store/llm-store';
import { useToastStore } from '@/store/toast-store';
import { useFrameworkStore } from '@/store/framework-store';
import { llmTransformCode } from '@/adapters/llm-transformer';
import type { LLMTransformResult, FrontendContext } from '@/adapters/llm-transformer';
import { getDocsCacheStatus, clearDocsCache } from '@/adapters/docs-fetcher';
import { getBlockDefinition } from '@/registry/block-registry';
import type { RuntimeCapability, BlockConfig, BlockType } from '@/types/blocks';
import type { WorkspaceConfig } from '@/types/workspace';
import { generateProjectFiles, generateFullProjectFiles, downloadProject, downloadFullProject, getProjectCodePreview } from '@/utils/project-generator';
import { analyzeAgentCode } from '@/adapters/code-analyzer';
import type { CodeAnalysis, BlockSuggestion, IncompatibleBlock } from '@/adapters/code-analyzer';
import { useCodeAnalysisStore } from '@/store/code-analysis-store';

type RuntimeType = 'langchain' | 'langgraph' | 'deepagents';
type CodeTab = 'backend' | 'frontend';

interface TransformResult {
  code: string;
  runtime: RuntimeType;
  warnings: string[];
  deps: string[];
  runCommand: string;
  explanation?: string;
}

// ─── Placeholder ───
const PLACEHOLDER = `# Paste your agent code here
# Supports LangChain, LangGraph, and Deep Agents
#
# Example:
#   from langchain.agents import create_agent
#   agent = create_agent(model="openai:gpt-4o", tools=[...])
#
# An AI model will:
#   - Analyze your code and detect the framework
#   - Add CopilotKit integration with correct imports
#   - Fix deprecated APIs automatically
#   - Generate a complete, runnable agent_server.py
#
# Configure your AI model in the ⚙ settings panel.`;

// ─── Capability detection ───
function detectCodeCapabilities(code: string, runtime: string): Set<RuntimeCapability> {
  const caps = new Set<RuntimeCapability>();
  if (runtime === 'langgraph' || runtime === 'langchain') {
    caps.add('chat');
    caps.add('streaming');
  }
  if (/CopilotKit|copilotkit/.test(code)) { caps.add('chat'); caps.add('streaming'); }
  if (/tools\s*=\s*\[|@tool|Tool\(|StructuredTool|BaseTool|bind_tools/.test(code)) {
    caps.add('toolCalls'); caps.add('toolResults');
  }
  if (/interrupt_before|interrupt_after|human_in_the_loop|approval|ask_human/.test(code)) caps.add('approvals');
  if (/BaseModel|TypedDict|Pydantic|structured_output|json_schema|response_format/.test(code)) caps.add('structuredOutput');
  if (/logging|logger|getLogger|print\(|verbose\s*=\s*True/.test(code)) caps.add('logs');
  if (/progress|status|callback|on_chain_start|on_chain_end|StreamEvent/.test(code)) caps.add('progress');
  if (/StateGraph|state_schema|AgentState|MessagesState/.test(code)) caps.add('intermediateState');
  if (/create_agent|AgentExecutor|multi.?agent|supervisor|crew/i.test(code)) caps.add('subagents');
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
    if (required.length === 0) return { block, compatible: true, missingCapabilities: [] };
    const missing = required.filter((cap) => !codeCapabilities.has(cap));
    return { block, compatible: missing.length === 0, missingCapabilities: missing };
  });
}

const SESSION_KEY = 'ck-code-input';

// ─── Main Component ───
export const CodeTransformerView: React.FC = () => {
  const [input, setInputRaw] = useState(() => sessionStorage.getItem(SESSION_KEY) || '');
  const [result, setResult] = useState<TransformResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformError, setTransformError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const setInput = useCallback((v: string) => {
    setInputRaw(v);
    sessionStorage.setItem(SESSION_KEY, v);
  }, []);

  const { workspace, removeBlock } = useWorkspaceStore();
  const llm = useLLMStore();
  const addToast = useToastStore((s) => s.addToast);

  const hasApiKey = !!llm.getActiveKey();
  const docsStatus = getDocsCacheStatus();

  // ─── Live code analysis: runs as user types/pastes code ───
  const [codeAnalysis, setCodeAnalysis] = useState<CodeAnalysis | null>(null);
  const analysisTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced analysis of raw input code
  useEffect(() => {
    if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);
    if (!input.trim()) {
      setCodeAnalysis(null);
      useCodeAnalysisStore.getState().setAnalysis(null);
      useCodeAnalysisStore.getState().setRawCode('');
      return;
    }
    analysisTimerRef.current = setTimeout(() => {
      const analysis = analyzeAgentCode(input, workspace.blocks);
      setCodeAnalysis(analysis);
      useCodeAnalysisStore.getState().setAnalysis(analysis);
      useCodeAnalysisStore.getState().setRawCode(input);
    }, 400); // 400ms debounce
    return () => { if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current); };
  }, [input, workspace.blocks]);

  // Auto-remove incompatible blocks when code analysis detects them
  const autoRemoveRanRef = React.useRef<string | null>(null);
  const [autoRemovedFromAnalysis, setAutoRemovedFromAnalysis] = useState<string[]>([]);

  useEffect(() => {
    if (!codeAnalysis || codeAnalysis.incompatibleBlocks.length === 0) return;
    // Key by input hash to only auto-remove once per code change
    const inputKey = input.slice(0, 80);
    if (autoRemoveRanRef.current === inputKey) return;
    autoRemoveRanRef.current = inputKey;

    const removed: string[] = [];
    for (const { block } of codeAnalysis.incompatibleBlocks) {
      removeBlock(block.id);
      removed.push(block.label);
    }
    if (removed.length > 0) {
      setAutoRemovedFromAnalysis(removed);
      addToast(
        `Auto-removed ${removed.length} block${removed.length > 1 ? 's' : ''} incompatible with your code: ${removed.join(', ')}`,
        'info',
      );
      // Clear after 8 seconds
      setTimeout(() => setAutoRemovedFromAnalysis([]), 8000);
    }
  }, [codeAnalysis]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle adding a suggested block
  const handleAddSuggested = useCallback((type: BlockType) => {
    const { addBlock } = useWorkspaceStore.getState();
    addBlock(type);
    addToast(`Added ${type} block to your workspace`, 'success');
  }, [addToast]);

  const blockCompatibility = useMemo(() => {
    if (!result || !input.trim()) return null;
    const caps = detectCodeCapabilities(result.code, result.runtime);
    return checkBlockCompatibility(workspace.blocks, caps);
  }, [result, input, workspace.blocks]);

  // Auto-fix: remove incompatible blocks after transform completes
  const [autoFixedBlocks, setAutoFixedBlocks] = useState<string[]>([]);
  const autoFixRanRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!blockCompatibility || !result) return;
    // Only auto-fix once per transform result (keyed by code hash)
    const resultKey = result.code.slice(0, 100);
    if (autoFixRanRef.current === resultKey) return;

    const incompatible = blockCompatibility.filter((c) => !c.compatible);
    if (incompatible.length === 0) {
      autoFixRanRef.current = resultKey;
      return;
    }

    autoFixRanRef.current = resultKey;
    const removed: string[] = [];
    for (const { block } of incompatible) {
      removeBlock(block.id);
      removed.push(block.label);
    }
    if (removed.length > 0) {
      setAutoFixedBlocks(removed);
      addToast(
        `Auto-removed ${removed.length} unsupported block${removed.length > 1 ? 's' : ''}: ${removed.join(', ')}`,
        'info'
      );
    }
  }, [blockCompatibility, result]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset auto-fix state when starting a new transform
  const handleTransform = useCallback(async () => {
    if (!input.trim()) return;
    if (!hasApiKey) { setShowSettings(true); return; }

    setAutoFixedBlocks([]);
    autoFixRanRef.current = null;
    setIsTransforming(true);
    setTransformError(null);
    setResult(null);

    try {
      const frontendCtx: FrontendContext = {
        blocks: workspace.blocks,
        workspaceName: workspace.name,
        theme: workspace.theme,
        frontend: useFrameworkStore.getState().framework,
        runtime: 'langchain',
      };
      const llmResult: LLMTransformResult = await llmTransformCode(
        input, llm.provider, llm.modelId, llm.getActiveKey(), frontendCtx,
      );
      setResult({
        code: llmResult.code,
        runtime: llmResult.runtime as RuntimeType,
        warnings: llmResult.warnings,
        deps: llmResult.deps,
        runCommand: llmResult.runCommand,
        explanation: llmResult.explanation,
      });
    } catch (err: unknown) {
      setTransformError(err instanceof Error ? err.message : 'Transform failed');
    } finally {
      setIsTransforming(false);
    }
  }, [input, llm, hasApiKey, workspace]);

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
    a.href = url; a.download = 'agent_server.py'; a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const handleDownloadFullProject = useCallback(() => {
    if (!result) return;
    downloadFullProject({ workspace, agentCode: result.code });
    addToast('Full project with agent code downloaded as .zip', 'success');
  }, [result, workspace, addToast]);

  const [codeTab, setCodeTab] = useState<CodeTab>('backend');
  const modelLabel = AVAILABLE_MODELS.find((m) => m.id === llm.modelId)?.label || llm.modelId;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-raised">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-accent" />
            <span className="text-sm font-semibold text-txt-primary">AI Code Transformer</span>
          </div>
          <div className="flex items-center bg-surface rounded-lg p-0.5 border border-border/50">
            <button onClick={() => setCodeTab('backend')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-2xs font-medium rounded-md transition-all ${
                codeTab === 'backend' ? 'bg-accent text-white shadow-sm' : 'text-txt-muted hover:text-txt-secondary'
              }`}>
              <Terminal size={10} /> Backend
            </button>
            <button onClick={() => setCodeTab('frontend')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-2xs font-medium rounded-md transition-all ${
                codeTab === 'frontend' ? 'bg-accent text-white shadow-sm' : 'text-txt-muted hover:text-txt-secondary'
              }`}>
              <FileCode size={10} /> Frontend
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {codeTab === 'backend' && (
            <div className="flex items-center gap-1.5 text-2xs text-txt-muted">
              <Sparkles size={10} className="text-accent" />
              <span>{modelLabel}</span>
            </div>
          )}
          <button onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-md transition-all ${showSettings ? 'bg-accent text-white' : 'text-txt-muted hover:text-accent hover:bg-accent-soft'}`}>
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && <LLMSettingsPanel onClose={() => setShowSettings(false)} />}

      {/* Frontend Code Panel */}
      {codeTab === 'frontend' && <FrontendCodePanel workspace={workspace} />}

      {/* Backend Panel */}
      {codeTab === 'backend' && <div className="flex-1 flex overflow-hidden">
        {/* Left: Input */}
        <div className="flex-1 flex flex-col border-r border-border min-w-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface">
            <span className="text-2xs font-medium text-txt-secondary">Your Agent Code</span>
            <span className="text-2xs text-txt-ghost">Paste your LangChain / LangGraph agent code</span>
          </div>
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={PLACEHOLDER} spellCheck={false}
            className="flex-1 w-full p-4 bg-surface text-txt-primary text-xs font-mono
                       resize-none outline-none placeholder:text-txt-ghost/50 leading-relaxed" />

          {/* Live code analysis: suggestions + auto-removal notice */}
          {codeAnalysis && input.trim() && (
            <CodeAnalysisPanel
              analysis={codeAnalysis}
              autoRemoved={autoRemovedFromAnalysis}
              onAddBlock={handleAddSuggested}
            />
          )}

          <div className="px-3 py-2 border-t border-border bg-surface-raised flex items-center gap-2">
            <button onClick={handleTransform} disabled={!input.trim() || isTransforming}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg
                         bg-accent hover:bg-accent-hover text-white transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed">
              {isTransforming ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
              {isTransforming ? 'Transforming...' : 'Transform & Add Compatibility'}
            </button>
            {!hasApiKey && (
              <span className="text-2xs text-warning flex items-center gap-1">
                <Key size={10} /> Add an API key in settings
              </span>
            )}
            {hasApiKey && workspace.blocks.length > 0 && (
              <span className="text-2xs text-txt-faint flex items-center gap-1">
                <Sparkles size={10} className="text-accent" />
                Syncing with {workspace.blocks.filter(b => b.visible).length} frontend block(s)
              </span>
            )}
            {hasApiKey && (
              <span className="text-2xs text-txt-faint flex items-center gap-1">
                <BookOpen size={10} className={docsStatus.cached ? 'text-success' : 'text-txt-ghost'} />
                {docsStatus.cached
                  ? `Docs cached (${docsStatus.sources.join(', ')})`
                  : 'Docs will be fetched on transform'}
                {docsStatus.cached && (
                  <button onClick={() => { clearDocsCache(); window.location.reload(); }}
                    className="text-2xs text-txt-ghost hover:text-accent ml-1" title="Refresh docs cache">
                    <RotateCcw size={8} />
                  </button>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Right: Output */}
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
                  <Download size={11} /> .py
                </button>
                <button onClick={handleDownloadFullProject}
                  className="flex items-center gap-1 px-2 py-1 text-2xs rounded-md
                             bg-accent/10 text-accent hover:bg-accent-soft transition-all font-medium">
                  <Download size={11} /> Full Project .zip
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

          {isTransforming ? (
            <div className="flex-1 flex items-center justify-center text-txt-ghost">
              <div className="text-center space-y-3">
                <Loader2 size={32} className="mx-auto animate-spin text-accent" />
                <p className="text-xs text-txt-secondary">AI is analyzing your code...</p>
                <p className="text-2xs text-txt-faint">
                  Fetching latest docs & checking CopilotKit, LangChain & LangGraph APIs
                  {workspace.blocks.length > 0 && ` • Syncing with ${workspace.blocks.filter(b => b.visible).length} frontend block(s)`}
                </p>
              </div>
            </div>
          ) : transformError ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center space-y-3 max-w-md">
                <AlertTriangle size={28} className="mx-auto text-danger" />
                <p className="text-xs text-danger">{transformError}</p>
                <button onClick={() => setTransformError(null)}
                  className="flex items-center gap-1.5 mx-auto text-2xs text-txt-muted hover:text-accent transition-colors">
                  <RotateCcw size={10} /> Try again
                </button>
              </div>
            </div>
          ) : result ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {result.explanation && (
                <div className="px-3 py-2 bg-accent-soft/30 border-b border-accent/10">
                  <div className="flex items-start gap-1.5 text-2xs text-accent">
                    <Sparkles size={10} className="mt-0.5 shrink-0" />
                    <span>{result.explanation}</span>
                  </div>
                </div>
              )}

              {/* Show only non-block-related warnings (block issues are handled by the compatibility panel below) */}
              {result.warnings.length > 0 && (() => {
                const blockKeywords = ['block', 'frontend has', 'doesn\'t return', 'doesn\'t have', 'doesn\'t support'];
                const nonBlockWarnings = result.warnings.filter(
                  w => !blockKeywords.some(kw => w.toLowerCase().includes(kw))
                );
                if (nonBlockWarnings.length === 0) return null;
                return (
                  <div className="px-3 py-2 bg-warning/10 border-b border-warning/20 space-y-1">
                    {nonBlockWarnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-2xs text-warning">
                        <AlertTriangle size={10} className="mt-0.5 shrink-0" /><span>{w}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Auto-fix summary: show what was auto-removed */}
              {autoFixedBlocks.length > 0 && (
                <div className="px-3 py-2 bg-accent/10 border-b border-accent/20">
                  <div className="flex items-start gap-1.5 text-2xs text-accent">
                    <Sparkles size={10} className="mt-0.5 shrink-0" />
                    <span>
                      Auto-removed {autoFixedBlocks.length} block{autoFixedBlocks.length > 1 ? 's' : ''} not supported by your agent: {autoFixedBlocks.join(', ')}.
                      Go to the Edit tab to adjust your layout.
                    </span>
                  </div>
                </div>
              )}

              {/* Show remaining compatible blocks */}
              {blockCompatibility && blockCompatibility.length > 0 && blockCompatibility.every(c => c.compatible) && (
                <div className="px-3 py-1.5 border-b border-border bg-surface-raised">
                  <div className="flex items-center gap-1.5 text-2xs text-success">
                    <CheckCircle2 size={10} className="shrink-0" />
                    <span>All {blockCompatibility.length} blocks are compatible with your agent code</span>
                  </div>
                </div>
              )}

              <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-txt-primary leading-relaxed bg-surface min-h-0">
                {result.code}
              </pre>

              {/* Download section */}
              <div className="border-t border-border bg-surface-raised p-3 space-y-2">
                <p className="text-2xs text-txt-muted font-medium">Download</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleDownloadFullProject}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg
                               bg-accent hover:bg-accent-hover text-white transition-colors">
                    <Download size={13} /> Download Full Project (.zip)
                  </button>
                  <button onClick={handleDownloadCode}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-border
                               hover:border-accent/50 hover:bg-accent-soft text-txt-secondary hover:text-accent transition-all">
                    <Download size={12} /> agent_server.py only
                  </button>
                </div>
                <p className="text-2xs text-txt-faint">
                  The .zip includes your frontend + agent backend with requirements.txt — ready to deploy anywhere.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-txt-ghost">
              <div className="text-center space-y-2">
                <Brain size={32} className="mx-auto opacity-30" />
                <p className="text-xs">AI-generated code will appear here</p>
                <p className="text-2xs">Uses {modelLabel} to produce correct, up-to-date code</p>
              </div>
            </div>
          )}
        </div>
      </div>}
    </div>
  );
};


// ─── Frontend Code Panel ───
const FrontendCodePanel: React.FC<{ workspace: WorkspaceConfig }> = ({ workspace }) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const projectFiles = useMemo(
    () => generateProjectFiles({ workspace }),
    [workspace],
  );

  const visibleBlocks = workspace.blocks.filter((b) => b.visible).length;

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownload = () => {
    downloadProject({ workspace });
  };

  const handleCopyAll = () => {
    const code = getProjectCodePreview({ workspace });
    copyText(code, 'all');
  };

  const selectedContent = projectFiles.find((f) => f.path === selectedFile);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface-raised">
        <div className="flex items-center gap-2">
          <span className="text-2xs text-txt-secondary font-medium">
            {projectFiles.length} files · {visibleBlocks} block(s)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={handleCopyAll}
            className="flex items-center gap-1 px-2 py-1 text-2xs rounded-md
                       text-txt-muted hover:text-accent hover:bg-accent-soft transition-all">
            {copied === 'all' ? <Check size={11} className="text-success" /> : <Copy size={11} />}
            {copied === 'all' ? 'Copied' : 'Copy All'}
          </button>
          <button onClick={handleDownload}
            className="flex items-center gap-1.5 px-2.5 py-1 text-2xs font-medium rounded-md
                       bg-accent hover:bg-accent-hover text-white transition-colors">
            <Download size={11} /> Download .zip
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-52 shrink-0 border-r border-border bg-surface overflow-y-auto">
          {projectFiles.map((f) => (
            <button key={f.path} onClick={() => setSelectedFile(selectedFile === f.path ? null : f.path)}
              className={`w-full flex items-center gap-1.5 px-3 py-1.5 text-left text-2xs font-mono
                         hover:bg-surface-overlay transition-colors ${
                selectedFile === f.path ? 'bg-accent-soft text-accent' : 'text-txt-secondary'
              }`}>
              <ChevronRight size={9} className={`shrink-0 transition-transform ${selectedFile === f.path ? 'rotate-90' : ''}`} />
              <span className="truncate">{f.path}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {selectedContent ? (
            <>
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-surface-raised">
                <span className="text-2xs font-mono text-txt-muted truncate">{selectedContent.path}</span>
                <button onClick={() => copyText(selectedContent.content, `file-${selectedContent.path}`)}
                  className="flex items-center gap-1 px-2 py-0.5 text-2xs rounded text-txt-faint hover:text-accent hover:bg-accent-soft transition-all">
                  {copied === `file-${selectedContent.path}` ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                  {copied === `file-${selectedContent.path}` ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-txt-primary leading-relaxed bg-surface">
                {selectedContent.content}
              </pre>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-txt-ghost">
              <div className="text-center space-y-2">
                <FileCode size={32} className="mx-auto opacity-30" />
                <p className="text-xs">Select a file to preview</p>
                <p className="text-2xs">
                  {visibleBlocks > 0
                    ? `Complete React + CopilotKit project with ${visibleBlocks} block(s)`
                    : 'Add blocks in the editor to generate frontend code'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── LLM Settings Panel ───
const LLMSettingsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { provider, modelId, apiKeys, setProvider, setModelId, setApiKey } = useLLMStore();
  const [showKey, setShowKey] = useState(false);

  const modelsForProvider = AVAILABLE_MODELS.filter((m) => m.provider === provider);
  const currentKey = apiKeys[provider] || '';

  const providerInfo: Record<LLMProvider, { label: string; placeholder: string; hint: string }> = {
    openai: { label: 'OpenAI', placeholder: 'sk-...', hint: 'platform.openai.com → API Keys' },
    gemini: { label: 'Google Gemini', placeholder: 'AI...', hint: 'aistudio.google.com → API Keys' },
    anthropic: { label: 'Anthropic', placeholder: 'sk-ant-...', hint: 'console.anthropic.com → API Keys' },
    mistral: { label: 'Mistral', placeholder: 'M...', hint: 'console.mistral.ai → API Keys' },
  };

  const info = providerInfo[provider];

  return (
    <div className="border-b border-border bg-surface-raised px-4 py-3 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={13} className="text-accent" />
          <span className="text-xs font-medium text-txt-primary">AI Model Settings</span>
        </div>
        <button onClick={onClose} className="text-txt-faint hover:text-txt-secondary transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-2xs text-txt-secondary font-medium">Provider</label>
          <select value={provider} onChange={(e) => setProvider(e.target.value as LLMProvider)}
            className="ck-input text-xs py-1.5 w-full">
            <option value="openai">OpenAI</option>
            <option value="gemini">Google Gemini</option>
            <option value="anthropic">Anthropic</option>
            <option value="mistral">Mistral</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-2xs text-txt-secondary font-medium">Model</label>
          <select value={modelId} onChange={(e) => setModelId(e.target.value)}
            className="ck-input text-xs py-1.5 w-full">
            {modelsForProvider.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-2xs text-txt-secondary font-medium">{info.label} API Key</label>
          <div className="flex gap-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={currentKey}
              onChange={(e) => setApiKey(provider, e.target.value)}
              placeholder={info.placeholder}
              className="ck-input text-xs font-mono py-1.5 flex-1"
            />
            <button onClick={() => setShowKey(!showKey)}
              className="p-1.5 text-txt-faint hover:text-txt-secondary transition-colors" title="Toggle visibility">
              {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          </div>
          <p className="text-2xs text-txt-ghost">{info.hint}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-2xs text-txt-ghost">
        <Key size={9} />
        <span>Keys are stored locally in your browser. Never sent anywhere except the provider's API.</span>
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
      <button onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-3 py-2 text-2xs font-medium text-txt-secondary hover:text-txt-primary transition-colors">
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
          {incompatible.map(({ block, missingCapabilities }) => {
            const fix = getFixSuggestion(block.type, missingCapabilities);
            return (
              <div key={block.id} className="rounded-lg bg-danger/5 border border-danger/15 overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <XCircle size={12} className="text-danger shrink-0" />
                    <span className="text-2xs font-medium text-txt-primary truncate">{block.label}</span>
                    <span className="text-2xs text-txt-faint">({block.type})</span>
                  </div>
                  <button onClick={() => onRemoveBlock(block.id)}
                    className="flex items-center gap-1 px-1.5 py-0.5 text-2xs rounded text-danger/70 hover:text-white hover:bg-danger transition-colors shrink-0">
                    <Trash2 size={10} /> Remove
                  </button>
                </div>
                <div className="px-2 pb-1.5 space-y-0.5">
                  <p className="text-2xs text-danger/90">{fix.problem}</p>
                  <p className="text-2xs text-txt-muted">{fix.action}</p>
                </div>
              </div>
            );
          })}
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

/** Maps missing capabilities to human-readable problem + actionable fix */
function getFixSuggestion(blockType: string, missing: RuntimeCapability[]): { problem: string; action: string } {
  // Block-specific messages
  const blockMessages: Record<string, { problem: string; action: string }> = {
    results: {
      problem: 'Your agent doesn\'t return structured data, so the Results block has nothing to display.',
      action: 'Fix: Add a Pydantic model or TypedDict to your agent\'s output — or remove this block.',
    },
    table: {
      problem: 'The Table block needs structured data (lists/dicts), but your agent doesn\'t output any.',
      action: 'Fix: Have your agent return structured data (e.g. list of dicts) — or remove this block.',
    },
    chart: {
      problem: 'The Chart block needs numeric/structured data, but your agent doesn\'t output any.',
      action: 'Fix: Have your agent return data with numeric fields for charting — or remove this block.',
    },
    dashboard: {
      problem: 'The Dashboard block needs KPI/metric data, but your agent doesn\'t return structured output.',
      action: 'Fix: Add structured output with metric fields to your agent — or remove this block.',
    },
    cards: {
      problem: 'The Cards block needs structured items, but your agent doesn\'t return any.',
      action: 'Fix: Have your agent return a list of structured items — or remove this block.',
    },
    toolActivity: {
      problem: 'The Tool Activity block shows live tool calls, but your agent has no tools defined.',
      action: 'Fix: Add tools to your agent using the @tool decorator — or remove this block.',
    },
    approvals: {
      problem: 'The Approvals block needs human-in-the-loop, but your agent has no interrupt points.',
      action: 'Fix: Add interrupt_before/interrupt_after to your LangGraph — or remove this block.',
    },
    logs: {
      problem: 'The Logs block shows execution logs, but your agent has no logging configured.',
      action: 'Fix: Add "import logging" and "logging.basicConfig(level=logging.INFO)" — or remove this block.',
    },
    status: {
      problem: 'The Status block shows progress, but your agent doesn\'t emit progress events.',
      action: 'Fix: Add streaming callbacks or progress tracking to your agent — or remove this block.',
    },
    traceViewer: {
      problem: 'The Trace Viewer needs LangSmith tracing, but it\'s not enabled in your agent.',
      action: 'Fix: Set LANGCHAIN_TRACING_V2=true in your .env and install langsmith — or remove this block.',
    },
    feedback: {
      problem: 'The Feedback block needs LangSmith, but it\'s not configured.',
      action: 'Fix: Add "from langsmith import Client" and configure LangSmith — or remove this block.',
    },
    dataset: {
      problem: 'The Dataset block needs LangSmith dataset access and structured output.',
      action: 'Fix: Configure LangSmith Client and add structured output — or remove this block.',
    },
    annotationQueue: {
      problem: 'The Annotation Queue needs LangSmith with human review workflows.',
      action: 'Fix: Configure LangSmith and add interrupt points — or remove this block.',
    },
    reasoningChain: {
      problem: 'The Reasoning Chain block needs intermediate state streaming from a Deep Agent.',
      action: 'Fix: Use a Deep Agent with intermediate state streaming — or remove this block.',
    },
    subAgentTree: {
      problem: 'The Sub-Agent Tree block needs a multi-agent setup with progress tracking.',
      action: 'Fix: Set up sub-agents with delegation tracking — or remove this block.',
    },
    depthIndicator: {
      problem: 'The Depth Indicator needs progress tracking from a Deep Agent.',
      action: 'Fix: Add progress/depth tracking to your Deep Agent — or remove this block.',
    },
  };

  if (blockMessages[blockType]) return blockMessages[blockType];

  // Fallback: build message from capability names
  const capLabels: Record<string, string> = {
    chat: 'chat/message handling',
    streaming: 'streaming support',
    toolCalls: 'tool definitions (@tool)',
    toolResults: 'tool result handling',
    approvals: 'human-in-the-loop (interrupt_before)',
    structuredOutput: 'structured output (Pydantic/TypedDict)',
    logs: 'logging (import logging)',
    progress: 'progress tracking (callbacks)',
    intermediateState: 'intermediate state streaming',
    subagents: 'sub-agent setup',
  };
  const readable = missing.map(c => capLabels[c] || c).join(', ');
  return {
    problem: `This block requires: ${readable} — which your agent code doesn't provide.`,
    action: `Fix: Add the missing capability to your agent code — or remove this block.`,
  };
}

// ─── Code Analysis Panel (live suggestions + auto-removal) ───
const CodeAnalysisPanel: React.FC<{
  analysis: CodeAnalysis;
  autoRemoved: string[];
  onAddBlock: (type: BlockType) => void;
}> = ({ analysis, autoRemoved, onAddBlock }) => {
  const [expanded, setExpanded] = useState(true);
  const suggestedCount = analysis.suggestedBlocks.length;
  const hasSuggestions = suggestedCount > 0;

  if (!hasSuggestions && autoRemoved.length === 0 && analysis.codeSummary === '') return null;

  return (
    <div className="border-t border-border bg-surface-raised/80">
      {/* Summary bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-3 py-2 text-2xs hover:bg-surface-overlay transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={11} className="text-accent" />
          {analysis.codeSummary && (
            <span className="text-txt-secondary font-medium">{analysis.codeSummary}</span>
          )}
          {hasSuggestions && (
            <span className="px-1.5 py-0.5 rounded bg-accent/15 text-accent text-2xs font-medium">
              {suggestedCount} block{suggestedCount !== 1 ? 's' : ''} suggested
            </span>
          )}
        </div>
        <ChevronDown size={10} className={`text-txt-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-3 pb-2.5 space-y-2 animate-fade-in">
          {/* Auto-removed notice */}
          {autoRemoved.length > 0 && (
            <div className="flex items-start gap-1.5 text-2xs text-accent bg-accent/5 rounded-lg px-2.5 py-2 border border-accent/10">
              <Sparkles size={10} className="mt-0.5 shrink-0" />
              <span>
                Auto-removed {autoRemoved.length} incompatible block{autoRemoved.length > 1 ? 's' : ''}: {autoRemoved.join(', ')}
              </span>
            </div>
          )}

          {/* Suggested blocks */}
          {hasSuggestions && (
            <div className="space-y-1">
              <p className="text-2xs text-txt-muted font-medium px-0.5">
                Compatible blocks you can add:
              </p>
              <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                {analysis.suggestedBlocks.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.type}
                    suggestion={suggestion}
                    onAdd={() => onAddBlock(suggestion.type)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Detected capabilities */}
          {analysis.capabilities.size > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {Array.from(analysis.capabilities).map((cap) => (
                <span key={cap} className="px-1.5 py-0.5 rounded bg-success/10 text-success text-[9px] font-medium border border-success/10">
                  {cap}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Suggestion Card ───
const SuggestionCard: React.FC<{
  suggestion: BlockSuggestion;
  onAdd: () => void;
}> = ({ suggestion, onAdd }) => {
  const SUGGESTION_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
    MessageSquare, LayoutList, Wrench, ShieldCheck, ScrollText,
    Activity, FileInput, Table, BarChart3, LayoutDashboard,
    Layers, PanelTop, FileText,
    GitBranch, ThumbsUp, Database, ClipboardList,
    Brain, Network, Gauge,
  };
  const Icon = SUGGESTION_ICONS[suggestion.icon] || FileText;

  return (
    <button
      onClick={onAdd}
      className="flex items-start gap-2 px-2.5 py-2 rounded-lg border border-border
                 hover:border-accent/40 hover:bg-accent-soft text-left transition-all group"
    >
      <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center shrink-0 mt-0.5
                      group-hover:bg-accent/20 transition-colors">
        <Icon size={12} className="text-accent" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-2xs font-medium text-txt-primary">{suggestion.label}</span>
          <Plus size={9} className="text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-[9px] text-txt-muted leading-tight mt-0.5 line-clamp-2">{suggestion.reason}</p>
      </div>
    </button>
  );
};

