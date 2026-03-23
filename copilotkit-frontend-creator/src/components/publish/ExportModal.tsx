import React, { useState, useRef, useMemo } from 'react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useToastStore } from '@/store/toast-store';
import { validateImportConfig } from '@/utils/config-validator';
import { encodeWorkspaceToUrl } from '@/utils/share-url';
import { downloadProject, downloadFullProject, generateProjectFiles, generateFullProjectFiles, getProjectCodePreview } from '@/utils/project-generator';
import {
  X, Copy, Check, Terminal, FileJson, Download, Upload,
  AlertTriangle, CheckCircle, Code2, Link, FolderArchive, FileCode,
  Package, Eye, ChevronRight,
} from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const ExportModal: React.FC<Props> = ({ onClose }) => {
  const { workspace, loadWorkspace } = useWorkspaceStore();
  const addToast = useToastStore((s) => s.addToast);
  const [copied, setCopied] = useState<string | null>(null);
  const [importError, setImportError] = useState('');
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [codePreviewFile, setCodePreviewFile] = useState<string | null>(null);
  const [agentCode, setAgentCode] = useState('');
  const [showAgentInput, setShowAgentInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const blockCount = workspace.blocks.filter((b) => b.visible).length;

  // Generate project files for preview
  const projectFiles = useMemo(
    () => agentCode.trim()
      ? generateFullProjectFiles({ workspace, agentCode })
      : generateProjectFiles({ workspace }),
    [workspace, agentCode],
  );

  const handleDownloadProject = () => {
    if (agentCode.trim()) {
      downloadFullProject({ workspace, agentCode });
      addToast('Full project with agent code downloaded as .zip', 'success');
    } else {
      downloadProject({ workspace });
      addToast('Frontend project downloaded as .zip', 'success');
    }
  };

  const handleCopyAllCode = () => {
    const code = getProjectCodePreview({ workspace });
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
  }, null, 2);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
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
      <div className="border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] rounded-t-3xl sm:rounded-3xl
                      w-full sm:w-[540px] max-h-[85vh] overflow-hidden flex flex-col animate-slide-up" style={{ background: 'color-mix(in srgb, var(--color-surface-raised) 75%, transparent)', backdropFilter: 'blur(32px) saturate(1.5)', WebkitBackdropFilter: 'blur(32px) saturate(1.5)', boxShadow: '0 40px 100px -20px rgba(0,0,0,0.8), 0 20px 40px -10px rgba(0,0,0,0.6)' }}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <Download size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-txt-primary">Download Project</h2>
          </div>
          <button onClick={onClose} className="p-1 text-txt-muted hover:text-txt-secondary rounded-lg hover:bg-surface-overlay">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Readiness checklist */}
          <div className="bg-surface rounded-xl p-3.5 space-y-2">
            <h3 className="text-xs font-semibold text-txt-secondary mb-2">Download Checklist</h3>
            <CheckItem ok={blockCount > 0} label={`${blockCount} block(s) configured`} fail="Add at least one block" />
            <CheckItem ok={true} label="Frontend code ready to generate" />
            <CheckItem ok={!!agentCode.trim()} label="Agent backend code included" fail="Optional: paste agent code below" />
          </div>

          {/* Download Full Project — primary CTA */}
          <Section title="Download Complete Project (.zip)" icon={<Package size={14} />}>
            <p className="text-2xs text-txt-muted mb-2">
              Get a complete Vite + React + Tailwind + CopilotKit project with all your blocks{agentCode.trim() ? ' and your agent backend code' : ''}, ready to <code className="text-txt-secondary">npm install && npm run dev</code>.
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
              {projectFiles.length} files · Run locally or deploy to Vercel, Netlify, Docker, or any host.
            </p>
          </Section>

          {/* Include Agent Code */}
          <Section title="Include Agent Backend Code" icon={<FileCode size={14} />}>
            <p className="text-2xs text-txt-muted mb-2">
              Paste your LangChain / LangGraph / Python agent code here. It will be included in the ZIP as <code className="text-txt-secondary">agent/agent_server.py</code> with a requirements.txt and run instructions.
            </p>
            {!showAgentInput ? (
              <button onClick={() => setShowAgentInput(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border
                           hover:border-accent/50 hover:bg-accent-soft text-txt-secondary hover:text-accent transition-all">
                <Code2 size={12} /> Paste Agent Code
              </button>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={agentCode}
                  onChange={(e) => setAgentCode(e.target.value)}
                  placeholder="# Paste your Python agent code here...&#10;from langchain_core.agents import AgentExecutor&#10;..."
                  spellCheck={false}
                  className="w-full h-40 p-3 bg-surface rounded-xl text-xs font-mono text-txt-primary
                             resize-y outline-none border border-border focus:border-accent/50
                             placeholder:text-txt-ghost/50 leading-relaxed"
                />
                {agentCode.trim() && (
                  <div className="flex items-center gap-1.5 text-2xs text-success">
                    <CheckCircle size={10} />
                    <span>Agent code will be included in the ZIP download</span>
                  </div>
                )}
              </div>
            )}
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
            <CodeBlock id="quickstart" code={agentCode.trim()
              ? `# Frontend\nnpm install\nnpm run dev\n\n# Agent backend (in another terminal)\ncd agent\npip install -r requirements.txt\npython agent_server.py`
              : `npm install\nnpm run dev`
            } copied={copied} onCopy={copyToClipboard} />
          </Section>

          {/* Workspace Config */}
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

          {/* Standalone HTML */}
          <Section title="Quick HTML Preview" icon={<FolderArchive size={14} />}>
            <p className="text-2xs text-txt-muted mb-2">
              Single-file HTML snapshot — open in a browser for a quick layout preview.
            </p>
            <button onClick={() => {
              const blocksHtml = workspace.blocks
                .filter((b) => b.visible)
                .map((b) => `<div class="block" data-type="${b.type}" style="grid-column:span ${b.w};min-height:${b.h * 50}px"><div class="block-header">${b.label}</div><div class="block-body">${b.type} block</div></div>`)
                .join('\n        ');
              const html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${workspace.name}</title>\n  <style>\n    *{margin:0;padding:0;box-sizing:border-box}\n    body{font-family:system-ui,-apple-system,sans-serif;background:#0c0c0e;color:#e4e4e7;min-height:100vh}\n    .header{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:#18181b;border-bottom:1px solid #27272a}\n    .header h1{font-size:14px;font-weight:600}\n    .grid{display:grid;grid-template-columns:repeat(12,1fr);gap:10px;padding:16px;max-width:1200px;margin:0 auto}\n    .block{background:#18181b;border:1px solid #27272a;border-radius:12px;overflow:hidden}\n    .block-header{padding:8px 14px;border-bottom:1px solid #27272a33;font-size:11px;font-weight:500;color:#71717a;text-transform:uppercase;letter-spacing:0.05em}\n    .block-body{padding:12px;font-size:12px;color:#52525b;text-align:center;display:flex;align-items:center;justify-content:center;min-height:60px}\n    @media(max-width:640px){.grid{grid-template-columns:repeat(6,1fr)}}\n  </style>\n</head>\n<body>\n  <div class="header"><h1>${workspace.name}</h1></div>\n  <div class="grid">\n    ${blocksHtml}\n  </div>\n</body>\n</html>`;
              const blob = new Blob([html], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${workspace.name.toLowerCase().replace(/\s+/g, '-')}.html`;
              a.click();
              URL.revokeObjectURL(url);
              addToast('HTML preview downloaded', 'success');
            }}
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
