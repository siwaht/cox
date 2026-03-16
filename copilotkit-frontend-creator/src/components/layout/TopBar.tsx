import React, { useState, useRef, useEffect } from 'react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useConnectionStore } from '@/store/connection-store';
import { useToastStore } from '@/store/toast-store';
import { ConnectionModal } from '@/components/connections/ConnectionModal';
import { ExportModal } from '@/components/publish/ExportModal';
import { encodeWorkspaceToUrl } from '@/utils/share-url';
import { Zap, Plug, Rocket, Menu, X, Save, FolderOpen, Trash2, Share2, HelpCircle } from 'lucide-react';

export const TopBar: React.FC = () => {
  const { mode, setMode, workspace, updateWorkspace, savedWorkspaces, saveCurrentWorkspace, loadSavedWorkspace, deleteSavedWorkspace } = useWorkspaceStore();
  const { activeConnectionId, connections, connectionStatus } = useConnectionStore();
  const addToast = useToastStore((s) => s.addToast);
  const [showConnModal, setShowConnModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showWorkspaces, setShowWorkspaces] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(workspace.name);
  const nameRef = useRef<HTMLInputElement>(null);

  const activeConn = connections.find((c) => c.id === activeConnectionId);

  const statusColor =
    connectionStatus === 'connected' ? 'bg-success' :
    connectionStatus === 'error' ? 'bg-danger' :
    connectionStatus === 'validating' ? 'bg-warning animate-pulse' : 'bg-zinc-600';

  useEffect(() => {
    if (isEditingName && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.select();
    }
  }, [isEditingName]);

  // Sync name value when workspace name changes externally (e.g., import)
  useEffect(() => {
    if (!isEditingName) setNameValue(workspace.name);
  }, [workspace.name, isEditingName]);

  const commitName = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== workspace.name) {
      updateWorkspace({ name: trimmed });
    } else {
      setNameValue(workspace.name);
    }
    setIsEditingName(false);
  };

  const handleSave = () => {
    saveCurrentWorkspace();
    addToast('Workspace saved', 'success');
  };

  const handleShare = () => {
    const config = {
      workspace: {
        name: workspace.name,
        template: workspace.template,
        blocks: workspace.blocks.map((b) => ({
          type: b.type, label: b.label, w: b.w, h: b.h, props: b.props, visible: b.visible,
        })),
        fallbackMode: workspace.fallbackMode,
      },
    };
    const url = encodeWorkspaceToUrl(config);
    if (url) {
      navigator.clipboard.writeText(url);
      addToast('Share link copied to clipboard', 'success');
    } else {
      addToast('Failed to generate share link', 'error');
    }
  };

  return (
    <>
      <header className="flex items-center justify-between px-3 sm:px-5 bg-surface-raised border-b border-border h-14 shrink-0">
        {/* Logo + workspace name */}
        <div className="flex items-center gap-2 min-w-0">
          <Zap size={18} className="text-accent shrink-0" />
          {isEditingName ? (
            <input
              ref={nameRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitName();
                if (e.key === 'Escape') { setNameValue(workspace.name); setIsEditingName(false); }
              }}
              className="font-semibold text-sm text-zinc-100 bg-transparent border-b border-accent
                         outline-none px-0 py-0 max-w-[200px]"
            />
          ) : (
            <span
              className="font-semibold text-sm sm:text-base text-zinc-100 tracking-tight truncate cursor-text"
              onDoubleClick={() => { setNameValue(workspace.name); setIsEditingName(true); }}
              title="Double-click to rename workspace"
            >
              {workspace.name}
            </span>
          )}
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2">
          <ModeToggle mode={mode} setMode={setMode} />

          {/* Save / Load / Share */}
          <div className="relative flex items-center gap-0.5">
            <button onClick={handleSave}
              className="p-1.5 text-zinc-500 hover:text-accent rounded-lg hover:bg-accent-soft transition-all"
              title="Save workspace (persists to browser)">
              <Save size={14} />
            </button>
            <button onClick={() => setShowWorkspaces(!showWorkspaces)}
              className="p-1.5 text-zinc-500 hover:text-accent rounded-lg hover:bg-accent-soft transition-all"
              title="Saved workspaces">
              <FolderOpen size={14} />
            </button>
            <button onClick={handleShare}
              className="p-1.5 text-zinc-500 hover:text-accent rounded-lg hover:bg-accent-soft transition-all"
              title="Copy share link">
              <Share2 size={14} />
            </button>

            {showWorkspaces && (
              <WorkspaceDropdown
                savedWorkspaces={savedWorkspaces}
                currentId={workspace.id}
                onLoad={(id) => { loadSavedWorkspace(id); setShowWorkspaces(false); addToast('Workspace loaded', 'info'); }}
                onDelete={(id) => { deleteSavedWorkspace(id); addToast('Workspace deleted', 'info'); }}
                onClose={() => setShowWorkspaces(false)}
              />
            )}
          </div>

          <button onClick={() => setShowConnModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border border-border
                       hover:border-accent/50 hover:bg-accent-soft transition-all">
            <span className={`w-2 h-2 rounded-full ${statusColor}`} />
            <Plug size={13} className="text-zinc-500" />
            <span className="text-zinc-300">{activeConn ? activeConn.name : 'Connect Agent'}</span>
          </button>

          <button onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-lg bg-accent
                       hover:bg-accent-hover text-white transition-colors font-medium">
            <Rocket size={13} /> Publish
          </button>

          <button onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))}
            className="p-1.5 text-zinc-600 hover:text-zinc-400 rounded-lg hover:bg-surface-overlay transition-all"
            title="Keyboard shortcuts (?)">
            <HelpCircle size={14} />
          </button>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-zinc-400 hover:text-white" aria-label="Toggle menu">
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface-raised border-b border-border px-4 py-3 space-y-3 animate-slide-up">
          <ModeToggle mode={mode} setMode={(m) => { setMode(m); setMobileMenuOpen(false); }} />
          <div className="flex gap-2">
            <button onClick={() => { setShowConnModal(true); setMobileMenuOpen(false); }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs rounded-lg
                         border border-border hover:border-accent/50 transition-all">
              <span className={`w-2 h-2 rounded-full ${statusColor}`} />
              {activeConn ? activeConn.name : 'Connect Agent'}
            </button>
            <button onClick={() => { setShowExportModal(true); setMobileMenuOpen(false); }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs rounded-lg bg-accent
                         hover:bg-accent-hover text-white font-medium">
              <Rocket size={13} /> Publish
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { handleSave(); setMobileMenuOpen(false); }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg
                         border border-border text-zinc-400 hover:text-accent hover:border-accent/50 transition-all">
              <Save size={12} /> Save
            </button>
            <button onClick={() => { handleShare(); setMobileMenuOpen(false); }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg
                         border border-border text-zinc-400 hover:text-accent hover:border-accent/50 transition-all">
              <Share2 size={12} /> Share
            </button>
          </div>
        </div>
      )}

      {showConnModal && <ConnectionModal onClose={() => setShowConnModal(false)} />}
      {showExportModal && <ExportModal onClose={() => setShowExportModal(false)} />}
    </>
  );
};

const ModeToggle: React.FC<{
  mode: 'editor' | 'preview' | 'published';
  setMode: (m: 'editor' | 'preview' | 'published') => void;
}> = ({ mode, setMode }) => (
  <div className="flex bg-surface rounded-lg p-0.5 gap-0.5 w-full md:w-auto">
    {([
      { key: 'editor' as const, label: 'Edit', tip: 'Drag-and-drop block editor' },
      { key: 'preview' as const, label: 'Preview', tip: 'See your frontend with sample data' },
      { key: 'published' as const, label: 'Live', tip: 'Connected to your agent in real-time' },
    ]).map((m) => (
      <button
        key={m.key}
        onClick={() => setMode(m.key)}
        title={m.tip}
        className={`flex-1 md:flex-none px-3 py-1.5 text-xs rounded-md transition-all font-medium ${
          mode === m.key
            ? 'bg-accent text-white shadow-sm shadow-accent/20'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-surface-overlay'
        }`}
      >
        {m.label}
      </button>
    ))}
  </div>
);

const WorkspaceDropdown: React.FC<{
  savedWorkspaces: Array<{ id: string; name: string }>;
  currentId: string;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}> = ({ savedWorkspaces, currentId, onLoad, onDelete, onClose }) => (
  <>
    <div className="fixed inset-0 z-30" onClick={onClose} />
    <div className="absolute right-0 top-full mt-1 z-40 w-56 bg-surface-raised border border-border
                    rounded-xl shadow-xl overflow-hidden animate-scale-in">
      {savedWorkspaces.length === 0 ? (
        <p className="text-2xs text-zinc-600 p-3 text-center">No saved workspaces yet</p>
      ) : (
        <div className="max-h-48 overflow-y-auto">
          {savedWorkspaces.map((w) => (
            <div
              key={w.id}
              className={`flex items-center justify-between px-3 py-2 hover:bg-surface-overlay transition-colors ${
                w.id === currentId ? 'bg-accent-soft' : ''
              }`}
            >
              <button onClick={() => onLoad(w.id)} className="text-xs text-zinc-300 truncate flex-1 text-left">
                {w.name}
                {w.id === currentId && <span className="text-2xs text-accent ml-1.5">(current)</span>}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(w.id); }}
                className="p-1 text-zinc-600 hover:text-danger shrink-0"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  </>
);
