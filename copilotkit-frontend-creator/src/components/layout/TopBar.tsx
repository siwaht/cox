import React, { useState, useRef, useEffect } from 'react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useToastStore } from '@/store/toast-store';
import { ExportModal } from '@/components/publish/ExportModal';
import { encodeWorkspaceToUrl } from '@/utils/share-url';
import { useThemeStore } from '@/store/theme-store';
import { Zap, Download, Menu, X, Save, FolderOpen, Trash2, Share2, HelpCircle, Sun, Moon } from 'lucide-react';

export const TopBar: React.FC = () => {
  const { mode, setMode, workspace, updateWorkspace, savedWorkspaces, saveCurrentWorkspace, loadSavedWorkspace, deleteSavedWorkspace } = useWorkspaceStore();
  const { theme, toggleTheme } = useThemeStore();
  const addToast = useToastStore((s) => s.addToast);
  const [showExportModal, setShowExportModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showWorkspaces, setShowWorkspaces] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(workspace.name);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingName && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.select();
    }
  }, [isEditingName]);

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
              className="font-semibold text-sm text-txt-primary bg-transparent border-b border-accent
                         outline-none px-0 py-0 max-w-[200px]"
            />
          ) : (
            <span
              className="font-semibold text-sm sm:text-base text-txt-primary tracking-tight truncate cursor-text"
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
              className="p-1.5 text-txt-muted hover:text-accent rounded-lg hover:bg-accent-soft transition-all"
              title="Save workspace (persists to browser)">
              <Save size={14} />
            </button>
            <button onClick={() => setShowWorkspaces(!showWorkspaces)}
              className="p-1.5 text-txt-muted hover:text-accent rounded-lg hover:bg-accent-soft transition-all"
              title="Saved workspaces">
              <FolderOpen size={14} />
            </button>
            <button onClick={handleShare}
              className="p-1.5 text-txt-muted hover:text-accent rounded-lg hover:bg-accent-soft transition-all"
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

          <button onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-lg bg-accent
                       hover:bg-accent-hover text-white transition-colors font-medium">
            <Download size={13} /> Download Project
          </button>

          <button onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))}
            className="p-1.5 text-txt-faint hover:text-txt-secondary rounded-lg hover:bg-surface-overlay transition-all"
            title="Keyboard shortcuts (?)">
            <HelpCircle size={14} />
          </button>

          <button onClick={toggleTheme}
            className="p-1.5 text-txt-faint hover:text-txt-secondary rounded-lg hover:bg-surface-overlay transition-all"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-txt-secondary hover:text-txt-primary" aria-label="Toggle menu">
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface-raised border-b border-border px-4 py-3 space-y-3 animate-slide-up">
          <ModeToggle mode={mode} setMode={(m) => { setMode(m); setMobileMenuOpen(false); }} />
          <div className="flex gap-2">
            <button onClick={() => { setShowExportModal(true); setMobileMenuOpen(false); }}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs rounded-lg bg-accent
                         hover:bg-accent-hover text-white font-medium">
              <Download size={13} /> Download Project
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { handleSave(); setMobileMenuOpen(false); }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg
                         border border-border text-txt-muted hover:text-accent hover:border-accent/50 transition-all">
              <Save size={12} /> Save
            </button>
            <button onClick={() => { handleShare(); setMobileMenuOpen(false); }}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg
                         border border-border text-txt-muted hover:text-accent hover:border-accent/50 transition-all">
              <Share2 size={12} /> Share
            </button>
            <button onClick={() => { toggleTheme(); setMobileMenuOpen(false); }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-lg
                         border border-border text-txt-muted hover:text-accent hover:border-accent/50 transition-all">
              {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
            </button>
          </div>
        </div>
      )}

      {showExportModal && <ExportModal onClose={() => setShowExportModal(false)} />}
    </>
  );
};

const ModeToggle: React.FC<{
  mode: 'editor' | 'preview' | 'published' | 'codegen';
  setMode: (m: 'editor' | 'preview' | 'published' | 'codegen') => void;
}> = ({ mode, setMode }) => (
  <div className="flex bg-surface rounded-lg p-0.5 gap-0.5 w-full md:w-auto">
    {([
      { key: 'editor' as const, label: 'Edit', tip: 'Drag-and-drop block editor' },
      { key: 'preview' as const, label: 'Preview', tip: 'Live preview with agent connection' },
      { key: 'codegen' as const, label: 'Code', tip: 'Paste & transform your agent code' },
    ]).map((m) => (
      <button
        key={m.key}
        onClick={() => setMode(m.key)}
        title={m.tip}
        className={`flex-1 md:flex-none px-3 py-1.5 text-xs rounded-md transition-all font-medium ${
          mode === m.key
            ? 'bg-accent text-white shadow-sm shadow-accent/20'
            : 'text-txt-muted hover:text-txt-secondary hover:bg-surface-overlay'
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
        <p className="text-2xs text-txt-faint p-3 text-center">No saved workspaces yet</p>
      ) : (
        <div className="max-h-48 overflow-y-auto">
          {savedWorkspaces.map((w) => (
            <div
              key={w.id}
              className={`flex items-center justify-between px-3 py-2 hover:bg-surface-overlay transition-colors ${
                w.id === currentId ? 'bg-accent-soft' : ''
              }`}
            >
              <button onClick={() => onLoad(w.id)} className="text-xs text-txt-secondary truncate flex-1 text-left">
                {w.name}
                {w.id === currentId && <span className="text-2xs text-accent ml-1.5">(current)</span>}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(w.id); }}
                className="p-1 text-txt-faint hover:text-danger shrink-0"
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
