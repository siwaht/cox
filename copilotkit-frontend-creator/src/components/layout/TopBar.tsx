import React, { useState, useRef, useEffect } from 'react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useToastStore } from '@/store/toast-store';
import { ExportModal } from '@/components/publish/ExportModal';
import { PromptModal } from '@/components/publish/PromptModal';
import { encodeWorkspaceToUrl } from '@/utils/share-url';
import { useThemeStore } from '@/store/theme-store';
import { Zap, Download, Menu, X, Save, FolderOpen, Trash2, Share2, HelpCircle, Sun, Moon, Sparkles, Undo2, Redo2 } from 'lucide-react';
import { useFrameworkStore } from '@/store/framework-store';
import type { FrontendType } from '@/types/connections';

export const TopBar: React.FC = () => {
  const { mode, setMode, workspace, updateWorkspace, savedWorkspaces, saveCurrentWorkspace, loadSavedWorkspace, deleteSavedWorkspace, undo, redo, canUndo, canRedo } = useWorkspaceStore();
  const { theme, toggleTheme } = useThemeStore();
  const addToast = useToastStore((s) => s.addToast);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
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
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-3 sm:px-5 h-14 shrink-0 transition-colors duration-300 border-b border-border/40" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-surface-raised) 90%, transparent) 0%, color-mix(in srgb, var(--color-surface-raised) 75%, transparent) 100%)', backdropFilter: 'blur(20px) saturate(1.3)', WebkitBackdropFilter: 'blur(20px) saturate(1.3)' }}>
        {/* Logo + workspace name */}
        <div className="flex items-center gap-2 min-w-0 group">
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
                         outline-none px-0 py-0 max-w-[200px] transition-all focus:border-b-2"
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

          <FrameworkToggle />
          <div className="w-px h-5 bg-border/40" />

          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5">
            <button onClick={() => canUndo() && undo()}
              disabled={!canUndo()}
              className={`p-1.5 rounded-lg transition-all ${canUndo() ? 'text-txt-muted hover:text-accent hover:bg-accent-soft' : 'text-txt-ghost cursor-not-allowed'}`}
              title="Undo (Ctrl+Z)">
              <Undo2 size={14} />
            </button>
            <button onClick={() => canRedo() && redo()}
              disabled={!canRedo()}
              className={`p-1.5 rounded-lg transition-all ${canRedo() ? 'text-txt-muted hover:text-accent hover:bg-accent-soft' : 'text-txt-ghost cursor-not-allowed'}`}
              title="Redo (Ctrl+Shift+Z)">
              <Redo2 size={14} />
            </button>
          </div>

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
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl bg-accent
                       hover:bg-accent-hover text-white transition-all font-medium active:scale-[0.97] shadow-lg shadow-accent/20 hover:shadow-accent/30 hover:shadow-xl">
            <Download size={13} /> Download Project
          </button>

          <button onClick={() => setShowPromptModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-accent/50
                       hover:bg-accent-soft text-accent hover:text-accent transition-all font-medium active:scale-95"
            title="Generate an AI prompt to recreate this frontend">
            <Sparkles size={13} /> AI Prompt
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
          <FrameworkToggle />
          <div className="flex gap-2">
            <button onClick={() => { setShowExportModal(true); setMobileMenuOpen(false); }}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs rounded-lg bg-accent
                         hover:bg-accent-hover text-white font-medium">
              <Download size={13} /> Download Project
            </button>
            <button onClick={() => { setShowPromptModal(true); setMobileMenuOpen(false); }}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs rounded-lg border border-accent/50
                         text-accent hover:bg-accent-soft font-medium">
              <Sparkles size={13} /> AI Prompt
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
      {showPromptModal && <PromptModal onClose={() => setShowPromptModal(false)} />}
    </>
  );
};

const ModeToggle: React.FC<{
  mode: 'editor' | 'preview' | 'published' | 'codegen';
  setMode: (m: 'editor' | 'preview' | 'published' | 'codegen') => void;
}> = ({ mode, setMode }) => (
  <div className="flex rounded-xl p-1 gap-0.5 w-full md:w-auto border border-white/5 shadow-inner" style={{ background: 'color-mix(in srgb, var(--color-surface-raised) 50%, transparent)', backdropFilter: 'blur(16px)' }}>
    {([
      { key: 'editor' as const, label: 'Edit', tip: 'Drag-and-drop block editor' },
      { key: 'preview' as const, label: 'Preview', tip: 'Live preview with agent connection' },
      { key: 'codegen' as const, label: 'Code', tip: 'Paste & transform your agent code' },
    ]).map((m) => (
      <button
        key={m.key}
        onClick={() => setMode(m.key)}
        title={m.tip}
        className={`flex-1 md:flex-none px-4 py-1.5 text-xs rounded-lg transition-all duration-300 ease-out font-medium active:scale-[0.97] ${
          mode === m.key
            ? 'bg-accent text-white shadow-[0_0_16px_rgba(139,92,246,0.4)] border border-accent-hover'
            : 'text-txt-muted hover:text-txt-primary hover:bg-white/5'
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
    <div className="absolute right-0 top-full mt-2 z-40 w-56 border border-border/50
                    rounded-2xl overflow-hidden animate-scale-in" style={{ background: 'color-mix(in srgb, var(--color-surface-raised) 95%, transparent)', backdropFilter: 'blur(24px) saturate(1.3)', WebkitBackdropFilter: 'blur(24px) saturate(1.3)', boxShadow: 'var(--shadow-elevated)' }}>
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

const FrameworkToggle: React.FC = () => {
  const { framework, setFramework } = useFrameworkStore();
  const addToast = useToastStore((s) => s.addToast);

  const handleSwitch = (fw: FrontendType) => {
    if (fw === framework) return;
    setFramework(fw);
    addToast(`Switched to ${fw === 'copilotkit' ? 'CopilotKit' : 'Tambo'}`, 'info', 2000);
  };

  return (
    <div className="flex rounded-xl p-0.5 gap-0.5 border border-white/5 shadow-inner"
      style={{ background: 'color-mix(in srgb, var(--color-surface-raised) 50%, transparent)', backdropFilter: 'blur(16px)' }}
      role="radiogroup" aria-label="Frontend framework">
      <button onClick={() => handleSwitch('copilotkit')} role="radio" aria-checked={framework === 'copilotkit'}
        className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-300 ease-out font-medium active:scale-[0.97] flex items-center gap-1.5 ${
          framework === 'copilotkit'
            ? 'bg-accent text-white shadow-[0_0_16px_rgba(139,92,246,0.4)] border border-accent-hover'
            : 'text-txt-muted hover:text-txt-primary hover:bg-white/5'
        }`}>
        <Zap size={11} /> CopilotKit
      </button>
      <button onClick={() => handleSwitch('tambo')} role="radio" aria-checked={framework === 'tambo'}
        className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-300 ease-out font-medium active:scale-[0.97] flex items-center gap-1.5 ${
          framework === 'tambo'
            ? 'bg-[#06b6d4] text-white shadow-[0_0_16px_rgba(6,182,212,0.4)] border border-[#0891b2]'
            : 'text-txt-muted hover:text-txt-primary hover:bg-white/5'
        }`}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v12M6 12h12" /></svg>
        Tambo
      </button>
    </div>
  );
};
