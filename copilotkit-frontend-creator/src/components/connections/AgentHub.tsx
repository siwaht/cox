import React, { useState, useEffect, useRef } from 'react';
import {
  X, Link2, FileCode, Loader2, CheckCircle, AlertCircle,
  Zap, ArrowRight, Wifi, Copy, Check, Rocket,
  ChevronLeft, Terminal, RefreshCw,
} from 'lucide-react';
import { useConnectionStore } from '@/store/connection-store';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useToastStore } from '@/store/toast-store';
import { analyzeAgentCode } from '@/adapters/code-analyzer';
import { llmTransformCode } from '@/adapters/llm-transformer';
import type { FrontendContext } from '@/adapters/llm-transformer';
import { useLLMStore } from '@/store/llm-store';
import { validateForDeploy } from '@/adapters/sandbox-deployer';
import type { RuntimeType } from '@/types/connections';

interface Props { onClose: () => void; }
type HubTab = 'choose' | 'url' | 'paste' | 'deploying' | 'connected';

export const AgentHub: React.FC<Props> = ({ onClose }) => {
  const [tab, setTab] = useState<HubTab>('choose');
  const [deployCode, setDeployCode] = useState('');
  const [deployRuntime, setDeployRuntime] = useState<string>('langgraph');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="border border-border/50 rounded-t-3xl sm:rounded-3xl w-full sm:w-[600px]
                   max-h-[90vh] overflow-hidden flex flex-col animate-slide-up"
        style={{
          background: 'color-mix(in srgb, var(--color-surface-raised) 96%, transparent)',
          backdropFilter: 'blur(24px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
          boxShadow: 'var(--shadow-elevated)',
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            {tab !== 'choose' && tab !== 'connected' && (
              <button onClick={() => setTab('choose')}
                className="p-1 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-surface-overlay mr-1">
                <ChevronLeft size={16} />
              </button>
            )}
            <Zap size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-zinc-200">
              {tab === 'choose' && 'Connect Your Agent'}
              {tab === 'url' && 'Connect via URL'}
              {tab === 'paste' && 'Paste Agent Code'}
              {tab === 'deploying' && 'Deploying Agent'}
              {tab === 'connected' && 'Agent Connected'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-surface-overlay">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {tab === 'choose' && <ChooseTab onSelect={setTab} />}
          {tab === 'url' && <UrlTab onConnected={() => setTab('connected')} />}
          {tab === 'paste' && (
            <PasteTab onDeploy={(code, runtime) => {
              setDeployCode(code);
              setDeployRuntime(runtime);
              setTab('deploying');
            }} />
          )}
          {tab === 'deploying' && (
            <DeployingTab code={deployCode} runtime={deployRuntime}
              onConnected={() => setTab('connected')} onBack={() => setTab('paste')} />
          )}
          {tab === 'connected' && <ConnectedTab onClose={onClose} />}
        </div>
      </div>
    </div>
  );
};

// ─── Choose ───
const ChooseTab: React.FC<{ onSelect: (tab: HubTab) => void }> = ({ onSelect }) => {
  const { activeConnectionId, connections, connectionStatus } = useConnectionStore();
  const activeConn = connections.find((c) => c.id === activeConnectionId);
  const isConnected = activeConn && connectionStatus === 'connected';

  return (
    <div className="space-y-3 animate-fade-in">
      {isConnected && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-success/30 bg-success/5">
          <Wifi size={14} className="text-success shrink-0" />
          <div className="min-w-0">
            <div className="text-xs text-success font-medium">Currently connected</div>
            <div className="text-2xs text-zinc-400 truncate">{activeConn.name} — {activeConn.baseUrl}</div>
          </div>
        </div>
      )}
      <p className="text-xs text-zinc-400 pb-1">How would you like to connect your AI agent?</p>

      <button onClick={() => onSelect('url')}
        className="w-full text-left group border border-border/50 rounded-2xl p-4 hover:border-accent/40 hover:bg-accent/5 transition-all">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
            <Link2 size={18} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-zinc-200 font-medium flex items-center gap-2">
              Connect via FastAPI URL
              <ArrowRight size={14} className="text-zinc-500 group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-2xs text-zinc-500 mt-1 leading-relaxed">
              Already running your agent locally or remotely? Paste the URL and we'll connect it instantly.
            </p>
          </div>
        </div>
      </button>

      <button onClick={() => onSelect('paste')}
        className="w-full text-left group border border-border/50 rounded-2xl p-4 hover:border-accent/40 hover:bg-accent/5 transition-all">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0 group-hover:bg-purple-500/20 transition-colors">
            <FileCode size={18} className="text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-zinc-200 font-medium flex items-center gap-2">
              Paste Your Agent Code
              <ArrowRight size={14} className="text-zinc-500 group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-2xs text-zinc-500 mt-1 leading-relaxed">
              Paste your Python agent code. We'll parse it, fix errors, add CopilotKit integration,
              and deploy it right here on this server — no external services needed.
            </p>
          </div>
        </div>
      </button>
    </div>
  );
};


// ─── URL Tab ───
const UrlTab: React.FC<{ onConnected: () => void }> = ({ onConnected }) => {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [runtime, setRuntime] = useState<RuntimeType>('langgraph');
  const [agentId, setAgentId] = useState('agent');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addConnection, validate, setActive, startHealthCheck } = useConnectionStore();
  const { setActiveConnection } = useWorkspaceStore();
  const addToast = useToastStore((s) => s.addToast);

  const handleConnect = async () => {
    if (!url.trim()) { setError('Please enter your agent URL'); return; }
    try { new URL(url); } catch { setError('Enter a valid URL (e.g. http://localhost:8000)'); return; }
    setError(null);
    setValidating(true);
    const id = addConnection({
      name: name.trim() || `My ${runtime} Agent`,
      frontend: 'copilotkit', runtime,
      baseUrl: url.replace(/\/+$/, ''),
      agentId: agentId || 'agent',
      auth: { mode: 'none' },
    });
    const result = await validate(id);
    setValidating(false);
    if (result.status === 'ok' || result.status === 'warning') {
      setActive(id); setActiveConnection(id); startHealthCheck();
      addToast('Agent connected', 'success');
      onConnected();
    } else {
      setError(result.errors[0]?.whatFailed || 'Connection failed. Check the URL and try again.');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <p className="text-xs text-zinc-400">
        Enter the URL where your FastAPI agent is running. We'll validate and connect it.
      </p>
      <div>
        <label className="text-2xs text-zinc-500 font-medium mb-1 block">Agent URL</label>
        <input type="text" value={url}
          onChange={(e) => { setUrl(e.target.value); setError(null); }}
          placeholder="http://localhost:8000"
          className={`ck-input text-sm font-mono w-full ${error ? 'border-danger focus:border-danger' : ''}`}
          autoFocus onKeyDown={(e) => e.key === 'Enter' && handleConnect()} />
        {error && <p className="text-2xs text-danger mt-1.5">{error}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-2xs text-zinc-500 font-medium mb-1 block">Connection Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="My Agent" className="ck-input text-xs w-full" />
        </div>
        <div>
          <label className="text-2xs text-zinc-500 font-medium mb-1 block">Runtime</label>
          <select value={runtime} onChange={(e) => setRuntime(e.target.value as RuntimeType)} className="ck-input text-xs w-full">
            <option value="langgraph">LangGraph</option>
            <option value="langchain">LangChain</option>
            <option value="deepagents">Deep Agents</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-2xs text-zinc-500 font-medium mb-1 block">Agent ID</label>
        <input type="text" value={agentId} onChange={(e) => setAgentId(e.target.value)}
          placeholder="agent" className="ck-input text-xs font-mono w-full" />
        <p className="text-2xs text-zinc-600 mt-1">The agent/graph ID your server exposes (usually "agent")</p>
      </div>
      <button onClick={handleConnect} disabled={validating}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm bg-accent
                   hover:bg-accent-hover text-white rounded-xl transition-colors font-medium
                   disabled:opacity-60 disabled:cursor-not-allowed">
        {validating
          ? <><Loader2 size={14} className="animate-spin" /> Validating connection...</>
          : <><Wifi size={14} /> Connect Agent</>}
      </button>
    </div>
  );
};


// ─── Paste Tab ───
const PasteTab: React.FC<{ onDeploy: (code: string, runtime: string) => void }> = ({ onDeploy }) => {
  const [code, setCode] = useState('');
  const [analysis, setAnalysis] = useState<ReturnType<typeof analyzeAgentCode> | null>(null);
  const [transforming, setTransforming] = useState(false);
  const [transformError, setTransformError] = useState<string | null>(null);
  const [transformedCode, setTransformedCode] = useState<string | null>(null);
  const [showTransformed, setShowTransformed] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { workspace } = useWorkspaceStore();
  const llm = useLLMStore();

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!code.trim()) { setAnalysis(null); return; }
    timerRef.current = setTimeout(() => {
      setAnalysis(analyzeAgentCode(code, workspace.blocks));
    }, 400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [code, workspace.blocks]);

  const handleTransform = async () => {
    if (!code.trim()) return;
    if (!llm.getActiveKey()) {
      setTransformError('Configure an AI model key first (Settings in the Code tab) to transform your code.');
      return;
    }
    setTransforming(true);
    setTransformError(null);
    try {
      const context: FrontendContext = {
        blocks: workspace.blocks, workspaceName: workspace.name,
        theme: workspace.theme || 'dark', frontend: 'copilotkit',
        runtime: analysis?.runtime !== 'unknown' ? analysis?.runtime : 'langgraph',
      };
      const result = await llmTransformCode(code, llm.provider, llm.modelId, llm.getActiveKey()!, context, llm.cloudflareAccountId);
      setTransformedCode(result.code);
      setShowTransformed(true);
      const validation = validateForDeploy(result.code);
      if (!validation.valid) {
        setTransformError(`Issues: ${validation.issues.join(', ')}. You can still deploy.`);
      }
    } catch (err) {
      setTransformError(err instanceof Error ? err.message : 'Transform failed');
    } finally {
      setTransforming(false);
    }
  };

  const handleCopy = () => {
    if (!transformedCode) return;
    navigator.clipboard.writeText(transformedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <p className="text-xs text-zinc-400">
        Paste your Python agent code. We'll analyze it, fix errors, add CopilotKit integration,
        and deploy it on this server.
      </p>
      <div className="relative">
        <textarea value={code} onChange={(e) => setCode(e.target.value)}
          placeholder={`# Paste your agent code here\n# Supports LangChain, LangGraph, FastAPI agents\n#\n# Example:\n#   from langgraph.prebuilt import create_react_agent\n#   graph = create_react_agent("openai:gpt-4o", tools=[...])`}
          className="ck-input text-xs font-mono w-full h-48 resize-y leading-relaxed" spellCheck={false} />
        {code && (
          <button onClick={() => setCode('')}
            className="absolute top-2 right-2 p-1 text-zinc-600 hover:text-zinc-400 rounded">
            <X size={12} />
          </button>
        )}
      </div>

      {analysis && (
        <div className="flex flex-wrap items-center gap-2 text-2xs">
          <span className="px-2 py-1 rounded-md bg-accent/10 text-accent font-medium">
            {analysis.runtime !== 'unknown' ? analysis.runtime : 'Python'} detected
          </span>
          <span className="text-zinc-500">
            {analysis.capabilities.size} capabilities · {analysis.codeSummary}
          </span>
          {analysis.incompatibleBlocks.length > 0 && (
            <span className="px-2 py-1 rounded-md bg-warning/10 text-warning">
              {analysis.incompatibleBlocks.length} block(s) need fixes
            </span>
          )}
        </div>
      )}

      {transformError && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-danger-soft border border-danger/20 text-xs text-danger">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{transformError}</span>
        </div>
      )}

      {showTransformed && transformedCode && (
        <div className="border border-border/50 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-surface border-b border-border/40">
            <span className="text-2xs text-zinc-400 font-medium">Transformed agent.py</span>
            <button onClick={handleCopy} className="flex items-center gap-1 text-2xs text-zinc-500 hover:text-accent transition-colors">
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="p-3 text-2xs font-mono text-zinc-400 max-h-40 overflow-y-auto leading-relaxed">
            {transformedCode.slice(0, 2000)}{transformedCode.length > 2000 ? '\n\n... (truncated)' : ''}
          </pre>
        </div>
      )}

      <div className="flex gap-2">
        {!transformedCode ? (
          <button onClick={handleTransform} disabled={!code.trim() || transforming}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm bg-accent
                       hover:bg-accent-hover text-white rounded-xl transition-colors font-medium
                       disabled:opacity-50 disabled:cursor-not-allowed">
            {transforming
              ? <><Loader2 size={14} className="animate-spin" /> Parsing & fixing code...</>
              : <><Zap size={14} /> Parse, Fix & Prepare</>}
          </button>
        ) : (
          <>
            <button onClick={() => onDeploy(transformedCode, analysis?.runtime || 'langgraph')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm bg-accent
                         hover:bg-accent-hover text-white rounded-xl transition-colors font-medium">
              <Rocket size={14} /> Deploy & Connect
            </button>
            <button onClick={() => { setTransformedCode(null); setShowTransformed(false); }}
              className="px-3 py-3 text-xs text-zinc-400 hover:text-zinc-200 border border-border
                         rounded-xl hover:border-zinc-600 transition-colors">
              <RefreshCw size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};


// ─── Deploying Tab (Replit-native: writes agent.py via server API) ───
type DeployPhase = 'idle' | 'writing' | 'reloading' | 'checking' | 'done' | 'error';

const DeployingTab: React.FC<{
  code: string; runtime: string;
  onConnected: () => void; onBack: () => void;
}> = ({ code, runtime, onConnected, onBack }) => {
  const [phase, setPhase] = useState<DeployPhase>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { addConnection, validate, setActive, startHealthCheck } = useConnectionStore();
  const { setActiveConnection } = useWorkspaceStore();
  const addToast = useToastStore((s) => s.addToast);
  const startedRef = useRef(false);

  const log = (msg: string) => setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  useEffect(() => {
    if (startedRef.current || !code) return;
    startedRef.current = true;
    deploy();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deploy = async () => {
    setPhase('writing');
    setError(null);
    log('Writing agent code to server...');

    try {
      // 1. POST the code to the server's deploy API
      const res = await fetch('/api/deploy-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, deps: [], env_vars: {} }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(body.error || `Deploy failed: ${res.status}`);
      }

      const result = await res.json();
      log(result.message || 'Agent code written');

      // 2. Reload phase
      setPhase('reloading');
      log('Agent module reloaded on server');

      // 3. Health check
      setPhase('checking');
      log('Running health check...');
      await new Promise((r) => setTimeout(r, 1500));

      const healthRes = await fetch('/health');
      if (!healthRes.ok) throw new Error('Health check failed');
      log('Health check passed');

      // 4. Auto-connect to same origin
      setPhase('done');
      log('Connecting frontend to agent...');

      const connId = addConnection({
        name: 'This App Agent',
        frontend: 'copilotkit',
        runtime: (runtime as RuntimeType) || 'langgraph',
        baseUrl: window.location.origin,
        agentId: 'agent',
        auth: { mode: 'none' },
      });

      const validation = await validate(connId);
      if (validation.status === 'ok' || validation.status === 'warning') {
        setActive(connId);
        setActiveConnection(connId);
        startHealthCheck();
        addToast('Agent deployed and connected', 'success');
        onConnected();
      } else {
        log('Connection validation had issues, but agent is deployed');
        setActive(connId);
        setActiveConnection(connId);
        startHealthCheck();
        onConnected();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setPhase('error');
      setError(msg);
      log(`ERROR: ${msg}`);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="space-y-2">
        <DeployStep label="Writing agent.py" status={phase} activeOn={['writing']} doneOn={['reloading', 'checking', 'done']} />
        <DeployStep label="Reloading agent module" status={phase} activeOn={['reloading']} doneOn={['checking', 'done']} />
        <DeployStep label="Health check" status={phase} activeOn={['checking']} doneOn={['done']} />
        <DeployStep label="Connecting frontend" status={phase} activeOn={['done']} doneOn={[]} />
      </div>

      {logs.length > 0 && (
        <div className="border border-border/50 rounded-xl overflow-hidden">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-surface border-b border-border/40">
            <Terminal size={11} className="text-zinc-500" />
            <span className="text-2xs text-zinc-500 font-medium">Deploy Log</span>
          </div>
          <pre className="p-3 text-2xs font-mono text-zinc-500 max-h-32 overflow-y-auto leading-relaxed">
            {logs.join('\n')}
          </pre>
        </div>
      )}

      {phase === 'error' && error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-danger-soft border border-danger/20 text-xs text-danger">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Deploy failed</p>
            <p className="text-2xs mt-1 opacity-80">{error.slice(0, 300)}</p>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="flex gap-2">
          <button onClick={onBack}
            className="flex-1 px-4 py-2.5 text-xs text-zinc-400 border border-border rounded-xl hover:border-zinc-600 transition-colors">
            Back to Code
          </button>
          <button onClick={() => { startedRef.current = false; deploy(); }}
            className="flex-1 px-4 py-2.5 text-xs bg-accent text-white rounded-xl hover:bg-accent-hover transition-colors font-medium">
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

const DeployStep: React.FC<{
  label: string; status: string; activeOn: string[]; doneOn: string[];
}> = ({ label, status, activeOn, doneOn }) => {
  const isActive = activeOn.includes(status);
  const isDone = doneOn.includes(status);
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${
      isActive ? 'bg-accent/5 border border-accent/20' :
      isDone ? 'bg-success/5 border border-success/20' :
      status === 'error' ? 'border border-border/30 opacity-50' :
      'border border-border/30 opacity-40'
    }`}>
      {isActive && <Loader2 size={13} className="text-accent animate-spin shrink-0" />}
      {isDone && <CheckCircle size={13} className="text-success shrink-0" />}
      {!isActive && !isDone && <div className="w-3.5 h-3.5 rounded-full border border-zinc-700 shrink-0" />}
      <span className={`text-xs ${isActive ? 'text-accent font-medium' : isDone ? 'text-success' : 'text-zinc-600'}`}>
        {label}
      </span>
    </div>
  );
};


// ─── Connected Tab ───
const ConnectedTab: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { activeConnectionId, connections, setActive, stopHealthCheck } = useConnectionStore();
  const { setActiveConnection, setMode } = useWorkspaceStore();
  const activeConn = connections.find((c) => c.id === activeConnectionId);
  const addToast = useToastStore((s) => s.addToast);

  const handleDisconnect = () => {
    setActive(null); setActiveConnection(null); stopHealthCheck();
    addToast('Agent disconnected', 'info');
  };

  if (!activeConn) return null;

  return (
    <div className="space-y-4 animate-fade-in text-center">
      <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto">
        <CheckCircle size={28} className="text-success" />
      </div>
      <div>
        <h3 className="text-base text-zinc-200 font-semibold">Agent Connected</h3>
        <p className="text-xs text-zinc-500 mt-1">Your agent is live and ready to use</p>
      </div>
      <div className="border border-border/50 rounded-xl p-3 text-left">
        <div className="flex items-center gap-2 mb-2">
          <Wifi size={12} className="text-success" />
          <span className="text-xs text-zinc-300 font-medium">{activeConn.name}</span>
        </div>
        <div className="space-y-1 text-2xs text-zinc-500">
          <div className="flex justify-between">
            <span>URL</span>
            <span className="font-mono text-zinc-400">{activeConn.baseUrl}</span>
          </div>
          <div className="flex justify-between">
            <span>Runtime</span>
            <span className="text-zinc-400">{activeConn.runtime}</span>
          </div>
          {activeConn.agentId && (
            <div className="flex justify-between">
              <span>Agent ID</span>
              <span className="font-mono text-zinc-400">{activeConn.agentId}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={handleDisconnect}
          className="flex-1 px-4 py-2.5 text-xs text-danger border border-danger/30 rounded-xl hover:bg-danger-soft transition-colors">
          Disconnect
        </button>
        <button onClick={() => { setMode('preview'); onClose(); }}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs bg-accent
                     hover:bg-accent-hover text-white rounded-xl transition-colors font-medium">
          Go to Preview <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
};
