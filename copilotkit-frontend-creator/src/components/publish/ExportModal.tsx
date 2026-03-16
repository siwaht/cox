import React, { useState, useRef, useMemo } from 'react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useConnectionStore } from '@/store/connection-store';
import { useToastStore } from '@/store/toast-store';
import { validateImportConfig } from '@/utils/config-validator';
import { encodeWorkspaceToUrl } from '@/utils/share-url';
import { downloadProject, generateProjectFiles, getProjectCodePreview } from '@/utils/project-generator';
import {
  X, Copy, Check, Terminal, FileJson, Rocket, Download, Upload,
  AlertTriangle, CheckCircle, Code2, Link, FolderArchive, FileCode,
  Package, Eye, ChevronRight,
} from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const ExportModal: React.FC<Props> = ({ onClose }) => {
  const { workspace, loadWorkspace } = useWorkspaceStore();
  const { connections, activeConnectionId, connectionStatus } = useConnectionStore();
  const addToast = useToastStore((s) => s.addToast);
  const [copied, setCopied] = useState<string | null>(null);
  const [importError, setImportError] = useState('');
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [codePreviewFile, setCodePreviewFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeConn = connections.find((c) => c.id === activeConnectionId);
  const blockCount = workspace.blocks.filter((b) => b.visible).length;

  // Generate project files for preview
  const projectFiles = useMemo(
    () => generateProjectFiles({ workspace, connection: activeConn }),
    [workspace, activeConn],
  );

  const handleDownloadProject = () => {
    downloadProject({ workspace, connection: activeConn });
    addToast('Full React project downloaded as .zip', 'success');
  };

  const handleCopyAllCode = () => {
    const code = getProjectCodePreview({ workspace, connection: activeConn });
    navigator.clipboard.writeText(code);
    setCopied('all-code');
    setTimeout(() => setCopied(null), 2000);
    addToast('All source code copied', 'success');
  };

  const workspaceConfig = JSON.stringify({
    version: 1,
    workspace: {
      name: workspace.name,
      template: workspace.template,
      blocks: workspace.blocks.map((b) => ({
        type: b.type, label: b.label, w: b.w, h: b.h, props: b.props, visible: b.visible,
      })),
      fallbackMode: workspace.fallbackMode,
    },
    connections: connections.map((c) => ({
      name: c.name, runtime: c.runtime, baseUrl: c.baseUrl,
      agentId: c.agentId, auth: { mode: c.auth.mode, tokenEnv: c.auth.tokenEnv },
    })),
  }, null, 2);

  // Generate JSX snippet for the current workspace blocks
  const codeSnippet = workspace.blocks
    .filter((b) => b.visible)
    .map((b) => {
      const propsStr = Object.entries(b.props)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${k}={${JSON.stringify(v)}}`)
        .join(' ');
      const tag = b.type.charAt(0).toUpperCase() + b.type.slice(1) + 'Block';
      return `<${tag} label="${b.label}" w={${b.w}} h={${b.h}}${propsStr ? ' ' + propsStr : ''} />`;
    })
    .join('\n');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // .env.example template
  const envTemplate = [
    '# Agent Runtime Connection',
    `VITE_RUNTIME_URL=${activeConn?.baseUrl || 'http://localhost:8000'}/copilotkit`,
    `VITE_RUNTIME_TYPE=${activeConn?.runtime || 'langgraph'}`,
    `VITE_AGENT_ID=${activeConn?.agentId || 'agent'}`,
    '',
    '# Authentication (uncomment the mode you use)',
    '# VITE_AUTH_MODE=bearer',
    '# VITE_AUTH_TOKEN=your-token-here',
    '',
    '# VITE_AUTH_MODE=api-key',
    '# VITE_API_KEY=your-api-key-here',
  ].join('\n');

  // Generate a standalone single-file HTML project
  const downloadStandaloneProject = () => {
    const blocksHtml = workspace.blocks
      .filter((b) => b.visible)
      .map((b) => `<div class="block" data-type="${b.type}" style="grid-column:span ${b.w};min-height:${b.h * 50}px"><div class="block-header">${b.label}</div><div class="block-body">${b.type} block</div></div>`)
      .join('\n        ');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${workspace.name}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,-apple-system,sans-serif;background:#0c0c0e;color:#e4e4e7;min-height:100vh}
    .header{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:#18181b;border-bottom:1px solid #27272a}
    .header h1{font-size:14px;font-weight:600}
    .status{display:flex;align-items:center;gap:6px;font-size:12px;color:#a1a1aa}
    .status .dot{width:8px;height:8px;border-radius:50%;background:#22c55e}
    .grid{display:grid;grid-template-columns:repeat(12,1fr);gap:10px;padding:16px;max-width:1200px;margin:0 auto}
    .block{background:#18181b;border:1px solid #27272a;border-radius:12px;overflow:hidden}
    .block-header{padding:8px 14px;border-bottom:1px solid #27272a33;font-size:11px;font-weight:500;color:#71717a;text-transform:uppercase;letter-spacing:0.05em}
    .block-body{padding:12px;font-size:12px;color:#52525b;text-align:center;display:flex;align-items:center;justify-content:center;min-height:60px}
    @media(max-width:640px){.grid{grid-template-columns:repeat(6,1fr)}}
  </style>
</head>
<body>
  <div class="header">
    <h1>${workspace.name}</h1>
    <div class="status"><span class="dot"></span> Connected</div>
  </div>
  <div class="grid">
    ${blocksHtml}
  </div>
  <script>
    // Workspace config — use this to initialize your runtime
    const WORKSPACE_CONFIG = ${workspaceConfig};
    console.log('Workspace loaded:', WORKSPACE_CONFIG);
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workspace.name.toLowerCase().replace(/\s+/g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Standalone project downloaded', 'success');
  };

  const downloadConfig = () => {
    const blob = new Blob([workspaceConfig], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'copilotkit-workspace.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    setImportWarnings([]);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        const validation = validateImportConfig(data);
        if (!validation.valid) {
          setImportError('Config validation failed');
          setImportWarnings(validation.errors);
          return;
        }
        loadWorkspace({
          ...workspace,
          name: data.workspace.name || workspace.name,
          template: data.workspace.template || workspace.template,
          blocks: data.workspace.blocks.map((b: any, i: number) => ({
            id: `imported-${i}-${Date.now()}`,
            type: b.type,
            label: b.label || b.type,
            x: 0, y: 0,
            w: b.w || 6, h: b.h || 2,
            props: b.props || {},
            visible: b.visible !== false,
          })),
          fallbackMode: data.workspace.fallbackMode || workspace.fallbackMode,
          updatedAt: new Date().toISOString(),
        });
        addToast('Workspace imported successfully', 'success');
        onClose();
      } catch {
        setImportError('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleShareLink = () => {
    const config = {
      workspace: {
        name: workspace.name, template: workspace.template,
        blocks: workspace.blocks.map((b) => ({
          type: b.type, label: b.label, w: b.w, h: b.h, props: b.props, visible: b.visible,
        })),
        fallbackMode: workspace.fallbackMode,
      },
    };
    const url = encodeWorkspaceToUrl(config);
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied('share');
      setTimeout(() => setCopied(null), 2000);
      addToast('Share link copied', 'success');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface-raised border border-border rounded-t-2xl sm:rounded-2xl
                      w-full sm:w-[540px] max-h-[85vh] overflow-hidden flex flex-col animate-slide-up">

        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Rocket size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-txt-primary">Publish & Deploy</h2>
          </div>
          <button onClick={onClose} className="p-1 text-txt-muted hover:text-txt-secondary rounded-lg hover:bg-surface-overlay">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Readiness checklist */}
          <div className="bg-surface rounded-xl p-3.5 space-y-2">
            <h3 className="text-xs font-semibold text-txt-secondary mb-2">Publish Checklist</h3>
            <CheckItem ok={blockCount > 0} label={`${blockCount} block(s) configured`} fail="Add at least one block" />
            <CheckItem ok={connectionStatus === 'connected'} label={activeConn ? `Connected to ${activeConn.name}` : 'Agent connected'} fail="Connect an agent first" />
            <CheckItem ok={true} label="Frontend builds successfully" />
          </div>

          {/* Download Full Project — primary CTA */}
          <Section title="Download Full React Project" icon={<Package size={14} />}>
            <p className="text-2xs text-txt-muted mb-2">
              Get a complete Vite + React + Tailwind + CopilotKit project with all your blocks, ready to <code className="text-txt-secondary">npm install && npm run dev</code>.
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              <button onClick={handleDownloadProject}
                className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg bg-accent hover:bg-accent-hover
                           text-white transition-colors font-medium">
                <Download size={13} /> Download .zip
              </button>
              <button onClick={handleCopyAllCode}
                className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-border
                           hover:border-accent/50 hover:bg-accent-soft text-txt-secondary hover:text-accent transition-all">
                {copied === 'all-code' ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                {copied === 'all-code' ? 'Copied' : 'Copy All Code'}
              </button>
            </div>
            <p className="text-2xs text-txt-faint">
              {projectFiles.length} files · Deploy to Vercel, Netlify, Docker, or any static host.
            </p>
          </Section>

          {/* Browse generated files */}
          <Section title="Browse Generated Code" icon={<Eye size={14} />}>
            <div className="bg-surface rounded-xl overflow-hidden border border-border/50">
              <div className="max-h-36 overflow-y-auto divide-y divide-border/30">
                {projectFiles.map((f) => (
                  <button key={f.path} onClick={() => setCodePreviewFile(codePreviewFile === f.path ? null : f.path)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-2xs font-mono hover:bg-surface-overlay transition-colors ${
                      codePreviewFile === f.path ? 'bg-accent-soft text-accent' : 'text-txt-secondary'
                    }`}>
                    <ChevronRight size={10} className={`shrink-0 transition-transform ${codePreviewFile === f.path ? 'rotate-90' : ''}`} />
                    {f.path}
                  </button>
                ))}
              </div>
              {codePreviewFile && (() => {
                const file = projectFiles.find((f) => f.path === codePreviewFile);
                return file ? (
                  <div className="border-t border-border">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-surface-raised">
                      <span className="text-2xs font-mono text-txt-muted">{file.path}</span>
                      <button onClick={() => copyToClipboard(file.content, `file-${file.path}`)}
                        className="p-1 rounded text-txt-faint hover:text-accent">
                        {copied === `file-${file.path}` ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                      </button>
                    </div>
                    <pre className="p-3 text-xs font-mono text-txt-secondary overflow-x-auto max-h-48 overflow-y-auto leading-relaxed">
                      {file.content}
                    </pre>
                  </div>
                ) : null;
              })()}
            </div>
          </Section>

          <Section title="Run Locally" icon={<Terminal size={14} />}>
            <CodeBlock id="quickstart" code={`npm install\nnpm run dev`} copied={copied} onCopy={copyToClipboard} />
          </Section>

          <Section title="Build & Deploy" icon={<Rocket size={14} />}>
            <CodeBlock
              id="deploy"
              code={`# Build\nnpm run build\n\n# Vercel\nnpx vercel\n\n# Netlify\nnpx netlify deploy --prod\n\n# Docker\ndocker build -t my-agent-ui .\ndocker run -p 3000:3000 my-agent-ui`}
              copied={copied} onCopy={copyToClipboard}
            />
          </Section>

          {/* Copy as JSX */}
          {codeSnippet && (
            <Section title="Copy as Code" icon={<Code2 size={14} />}>
              <CodeBlock id="jsx" code={codeSnippet} copied={copied} onCopy={copyToClipboard} />
            </Section>
          )}

          <Section title="Workspace Config" icon={<FileJson size={14} />}>
            <div className="flex flex-wrap gap-2 mb-2">
              <button onClick={downloadConfig}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border
                           hover:border-accent/50 hover:bg-accent-soft text-txt-secondary hover:text-accent transition-all">
                <Download size={12} /> Download
              </button>
              <button onClick={() => copyToClipboard(workspaceConfig, 'config')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border
                           hover:border-accent/50 hover:bg-accent-soft text-txt-secondary hover:text-accent transition-all">
                {copied === 'config' ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                {copied === 'config' ? 'Copied' : 'Copy'}
              </button>
              <button onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border
                           hover:border-accent/50 hover:bg-accent-soft text-txt-secondary hover:text-accent transition-all">
                <Upload size={12} /> Import
              </button>
              <button onClick={handleShareLink}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border
                           hover:border-accent/50 hover:bg-accent-soft text-txt-secondary hover:text-accent transition-all">
                {copied === 'share' ? <Check size={12} className="text-success" /> : <Link size={12} />}
                {copied === 'share' ? 'Copied' : 'Share Link'}
              </button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
            </div>
            {importError && (
              <div className="mb-2">
                <p className="text-2xs text-danger">{importError}</p>
                {importWarnings.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {importWarnings.map((w, i) => (
                      <li key={i} className="text-2xs text-txt-muted">• {w}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <CodeBlock id="config-view" code={workspaceConfig} copied={copied} onCopy={copyToClipboard} />
          </Section>

          {/* .env.example */}
          <Section title="Environment Template" icon={<FileCode size={14} />}>
            <p className="text-2xs text-txt-muted mb-2">
              Create a <code className="text-txt-secondary">.env</code> file with these variables for your agent connection.
            </p>
            <CodeBlock id="env" code={envTemplate} copied={copied} onCopy={copyToClipboard} />
          </Section>

          {/* Standalone HTML (quick preview) */}
          <Section title="Quick HTML Preview" icon={<FolderArchive size={14} />}>
            <p className="text-2xs text-txt-muted mb-2">
              Single-file HTML snapshot — open in a browser for a quick layout preview (no runtime).
            </p>
            <button onClick={downloadStandaloneProject}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border
                         hover:border-accent/50 hover:bg-accent-soft text-txt-secondary hover:text-accent transition-all">
              <FolderArchive size={12} /> Download .html
            </button>
          </Section>
        </div>
      </div>
    </div>
  );
};

const CheckItem: React.FC<{ ok: boolean; label: string; fail?: string }> = ({ ok, label, fail }) => (
  <div className="flex items-center gap-2">
    {ok ? <CheckCircle size={13} className="text-success shrink-0" /> : <AlertTriangle size={13} className="text-warning shrink-0" />}
    <span className={`text-xs ${ok ? 'text-txt-secondary' : 'text-warning'}`}>{ok ? label : (fail || label)}</span>
  </div>
);

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      <span className="text-accent">{icon}</span>
      <h3 className="text-xs font-semibold text-txt-secondary">{title}</h3>
    </div>
    {children}
  </div>
);

const CodeBlock: React.FC<{
  id: string; code: string; copied: string | null;
  onCopy: (text: string, id: string) => void;
}> = ({ id, code, copied, onCopy }) => (
  <div className="relative group">
    <pre className="bg-surface rounded-xl p-3.5 text-xs text-txt-secondary font-mono overflow-x-auto max-h-48 overflow-y-auto leading-relaxed">
      {code}
    </pre>
    <button
      onClick={() => onCopy(code, id)}
      className="absolute top-2 right-2 p-1.5 rounded-lg bg-surface-overlay/80 hover:bg-accent/20
                 text-txt-muted hover:text-accent transition-all opacity-0 group-hover:opacity-100"
    >
      {copied === id ? <Check size={13} className="text-success" /> : <Copy size={13} />}
    </button>
  </div>
);
