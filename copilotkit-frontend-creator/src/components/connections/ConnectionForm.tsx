import React, { useState } from 'react';
import type { AuthMode, ConnectionProfile, RuntimeType } from '@/types/connections';
import { Zap, Sparkles } from 'lucide-react';

interface Props {
  onSubmit: (profile: Omit<ConnectionProfile, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  initialValues?: Partial<ConnectionProfile>;
  submitLabel?: string;
}

const PRESETS: Array<{
  label: string; runtime: RuntimeType; baseUrl: string; agentId: string; description: string;
}> = [
  { label: 'LangGraph Local', runtime: 'langgraph', baseUrl: 'http://localhost:2024', agentId: 'agent', description: 'Default LangGraph dev server' },
  { label: 'LangChain Local', runtime: 'langchain', baseUrl: 'http://localhost:8000', agentId: '', description: 'Default LangChain serve' },
  { label: 'Deep Agent Local', runtime: 'deepagents', baseUrl: 'http://localhost:3001', agentId: 'default', description: 'Local deep agent server' },
  { label: 'Tambo + Backend', runtime: 'tambo', baseUrl: 'http://localhost:8000', agentId: '', description: 'Tambo generative UI via MCP' },
  { label: 'Custom Remote', runtime: 'langgraph', baseUrl: 'https://', agentId: '', description: 'Connect to a remote agent' },
];

export const ConnectionForm: React.FC<Props> = ({ onSubmit, onCancel, initialValues, submitLabel }) => {
  const [name, setName] = useState(initialValues?.name || '');
  const [runtime, setRuntime] = useState<RuntimeType>(initialValues?.runtime || 'langgraph');
  const [baseUrl, setBaseUrl] = useState(initialValues?.baseUrl || 'http://localhost:2024');
  const [agentId, setAgentId] = useState(initialValues?.agentId || 'agent');
  const [authMode, setAuthMode] = useState<AuthMode>(initialValues?.auth?.mode || 'none');
  const [tokenEnv, setTokenEnv] = useState(initialValues?.auth?.tokenEnv || '');
  const [tokenValue, setTokenValue] = useState(initialValues?.auth?.tokenValue || '');
  const [headerName, setHeaderName] = useState(initialValues?.auth?.headerName || '');
  const [tamboApiKey, setTamboApiKey] = useState(initialValues?.env?.TAMBO_API_KEY || '');
  const [tamboUrl, setTamboUrl] = useState(initialValues?.env?.TAMBO_URL || '');
  const [showAdvanced, setShowAdvanced] = useState(authMode !== 'none');
  const [urlError, setUrlError] = useState('');

  const applyPreset = (p: typeof PRESETS[0]) => {
    setRuntime(p.runtime); setBaseUrl(p.baseUrl); setAgentId(p.agentId); setName(p.label); setUrlError('');
  };

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) { setUrlError('URL is required'); return false; }
    try { new URL(url); setUrlError(''); return true; }
    catch { setUrlError('Enter a valid URL (e.g. http://localhost:2024)'); return false; }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateUrl(baseUrl)) return;
    onSubmit({
      name: name || `${runtime} agent`, runtime,
      baseUrl: baseUrl.replace(/\/+$/, ''),
      agentId: agentId || undefined,
      auth: {
        mode: authMode,
        ...(tokenEnv ? { tokenEnv } : {}),
        ...(tokenValue ? { tokenValue } : {}),
        ...(headerName ? { headerName } : {}),
      },
      ...(runtime === 'tambo' ? {
        env: {
          ...(tamboApiKey ? { TAMBO_API_KEY: tamboApiKey } : {}),
          ...(tamboUrl ? { TAMBO_URL: tamboUrl } : {}),
        },
      } : {}),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="border border-accent/30 rounded-xl p-4 bg-surface animate-scale-in">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={14} className="text-accent" />
        <h3 className="text-xs font-semibold text-txt-secondary">{initialValues ? 'Edit Connection' : 'Connect an Agent'}</h3>
      </div>

      {!initialValues && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={11} className="text-accent" />
            <span className="text-2xs text-txt-muted font-medium">Quick Start</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {PRESETS.map((p) => (
              <button key={p.label} type="button" onClick={() => applyPreset(p)}
                className={`text-left px-2.5 py-2 rounded-lg border transition-all text-2xs ${
                  runtime === p.runtime && baseUrl === p.baseUrl
                    ? 'border-accent/50 bg-accent-soft text-accent'
                    : 'border-border text-txt-secondary hover:border-txt-faint hover:text-txt-secondary'
                }`}>
                <div className="font-medium">{p.label}</div>
                <div className="text-txt-faint mt-0.5">{p.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Row label="Connection Name">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                 placeholder="My Agent" className="ck-input text-xs" />
        </Row>
        <Row label="Runtime Type" hint="Your agent framework">
          <select value={runtime} onChange={(e) => setRuntime(e.target.value as RuntimeType)} className="ck-input text-xs">
            <option value="langchain">LangChain</option>
            <option value="langgraph">LangGraph</option>
            <option value="deepagents">Deep Agents</option>
            <option value="tambo">Tambo (Generative UI)</option>
          </select>
        </Row>
        <Row label="Agent URL" hint="Where your agent is running">
          <input type="text" value={baseUrl}
            onChange={(e) => { setBaseUrl(e.target.value); if (urlError) validateUrl(e.target.value); }}
            onBlur={() => baseUrl && validateUrl(baseUrl)}
            placeholder="http://localhost:2024"
            className={`ck-input text-xs font-mono ${urlError ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`} />
          {urlError && <p className="text-2xs text-danger mt-1">{urlError}</p>}
        </Row>
        <Row label="Agent / Graph ID" hint={runtime === 'langchain' ? 'Optional for LangChain' : runtime === 'tambo' ? 'Not used for Tambo' : 'Required'}>
          <input type="text" value={agentId} onChange={(e) => setAgentId(e.target.value)}
                 placeholder="agent" className="ck-input text-xs font-mono"
                 disabled={runtime === 'tambo'} />
        </Row>

        {runtime === 'tambo' && (
          <div className="space-y-3 pl-3 border-l-2 border-purple-500/30 animate-fade-in">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles size={11} className="text-purple-400" />
              <span className="text-2xs text-txt-muted font-medium">Tambo Configuration</span>
            </div>
            <Row label="Tambo API Key" hint="From console.tambo.co">
              <input type="password" value={tamboApiKey} onChange={(e) => setTamboApiKey(e.target.value)}
                     placeholder="tb_..." className="ck-input text-xs font-mono" />
            </Row>
            <Row label="Tambo API URL" hint="Leave blank for Tambo Cloud">
              <input type="text" value={tamboUrl} onChange={(e) => setTamboUrl(e.target.value)}
                     placeholder="https://api.tambo.co (default)" className="ck-input text-xs font-mono" />
            </Row>
            <p className="text-2xs text-txt-ghost">
              Tambo connects to your backend via MCP. The Agent URL above should point to your
              LangChain/LangGraph/DeepAgents server — Tambo will use it as an MCP server.
            </p>
          </div>
        )}

        <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-2xs text-txt-faint hover:text-txt-secondary transition-colors">
          {showAdvanced ? '▾ Hide' : '▸ Show'} authentication settings
        </button>

        {showAdvanced && (
          <div className="space-y-3 pl-3 border-l-2 border-accent/20 animate-fade-in">
            <Row label="Authentication">
              <select value={authMode} onChange={(e) => setAuthMode(e.target.value as AuthMode)} className="ck-input text-xs">
                <option value="none">No Authentication</option>
                <option value="bearer">Bearer Token</option>
                <option value="api-key">API Key</option>
                <option value="custom-header">Custom Header</option>
              </select>
            </Row>
            {authMode !== 'none' && (
              <>
                <Row label="Token Env Variable" hint="Name of the env var holding your secret">
                  <input type="text" value={tokenEnv} onChange={(e) => setTokenEnv(e.target.value)}
                         placeholder="AGENT_API_TOKEN" className="ck-input text-xs font-mono" />
                </Row>
                <Row label="Token Value" hint="For local dev only — never commit">
                  <input type="password" value={tokenValue} onChange={(e) => setTokenValue(e.target.value)}
                         placeholder="••••••••" className="ck-input text-xs" />
                </Row>
                {authMode === 'custom-header' && (
                  <Row label="Header Name">
                    <input type="text" value={headerName} onChange={(e) => setHeaderName(e.target.value)}
                           placeholder="X-Custom-Auth" className="ck-input text-xs font-mono" />
                  </Row>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <button type="button" onClick={onCancel}
          className="flex-1 px-3 py-2.5 text-xs text-txt-secondary hover:text-txt-primary rounded-lg
                     border border-border hover:border-txt-faint transition-colors">
          Cancel
        </button>
        <button type="submit"
          className="flex-1 px-4 py-2.5 text-xs bg-accent hover:bg-accent-hover text-white
                     rounded-lg transition-colors font-medium">
          {submitLabel || 'Connect'}
        </button>
      </div>
    </form>
  );
};

const Row: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div>
    <div className="flex items-baseline justify-between mb-1">
      <label className="text-2xs text-txt-secondary font-medium">{label}</label>
      {hint && <span className="text-2xs text-txt-ghost">{hint}</span>}
    </div>
    {children}
  </div>
);
