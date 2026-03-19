import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useThemeStore } from '@/store/theme-store';
import { EditorView } from '@/components/editor/EditorView';
import { CodeTransformerView } from '@/components/codegen/CodeTransformerView';
import { PreviewView } from '@/components/preview/PreviewView';
import { TopBar } from '@/components/layout/TopBar';
import { ToastContainer } from '@/components/layout/ToastContainer';
import { KeyboardShortcuts } from '@/components/layout/KeyboardShortcuts';
import { useToastStore } from '@/store/toast-store';
import { useLocalAgent } from '@/hooks/useLocalAgent';
import { useConnectionStore } from '@/store/connection-store';
import { decodeWorkspaceFromUrl } from '@/utils/share-url';

export const App: React.FC = () => {
  const { mode, workspace, loadWorkspace } = useWorkspaceStore();
  const theme = useThemeStore((s) => s.theme);
  const addToast = useToastStore((s) => s.addToast);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Auto-seed local agent connection and start periodic health checks
  useLocalAgent();

  useEffect(() => {
    const store = useConnectionStore.getState();
    store.startHealthCheck();
    return () => store.stopHealthCheck();
  }, []);

  // Dynamic page title
  useEffect(() => {
    document.title = `${workspace.name} — Frontend Creator`;
  }, [workspace.name]);

  // Import workspace from URL on mount
  useEffect(() => {
    const shared = decodeWorkspaceFromUrl();
    if (shared && typeof shared === 'object' && 'workspace' in shared) {
      const ws = (shared as any).workspace;
      if (ws && Array.isArray(ws.blocks)) {
        loadWorkspace({
          ...workspace,
          name: ws.name || workspace.name,
          template: ws.template || workspace.template,
          blocks: ws.blocks.map((b: any, i: number) => ({
            id: `shared-${i}-${Date.now()}`,
            type: b.type, label: b.label || b.type,
            x: 0, y: 0, w: b.w || 6, h: b.h || 2,
            props: b.props || {}, visible: b.visible !== false,
          })),
          fallbackMode: ws.fallbackMode || workspace.fallbackMode,
          updatedAt: new Date().toISOString(),
        });
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
        addToast('Workspace loaded from shared link', 'success');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global ? shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        setShowShortcuts((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div data-theme={theme} className="flex flex-col h-screen w-screen overflow-hidden bg-surface text-txt-primary transition-colors duration-200">
      <TopBar />
      <main className="flex-1 overflow-hidden transition-opacity duration-200 mt-14">
        {mode === 'editor' && <EditorView />}
        {mode === 'preview' && <PreviewView />}
        {mode === 'codegen' && <CodeTransformerView />}
      </main>
      <ToastContainer />
      {showShortcuts && <KeyboardShortcuts onClose={() => setShowShortcuts(false)} />}
    </div>
  );
};
