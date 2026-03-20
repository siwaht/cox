import React, { useState, useCallback, useEffect } from 'react';
import { BlockPalette } from './BlockPalette';
import { CanvasArea } from './CanvasArea';
import { BlockInspector } from './BlockInspector';
import { ThemePanel } from './ThemePanel';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useToastStore } from '@/store/toast-store';
import { PanelLeft, Settings2, Palette } from 'lucide-react';

export const EditorView: React.FC = () => {
  const [showPalette, setShowPalette] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isOverCanvas, setIsOverCanvas] = useState(false);

  const { workspace, undo, redo, canUndo, canRedo,
          selectAll, clearSelection, removeSelected, duplicateSelected, selectedBlockIds } = useWorkspaceStore();
  const addToast = useToastStore((s) => s.addToast);

  // ─── Global keyboard shortcuts ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) { undo(); addToast('Undone', 'info', 1500); }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo()) { redo(); addToast('Redone', 'info', 1500); }
        return;
      }

      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selectAll();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedBlockIds.size > 0) {
          duplicateSelected();
          addToast(`Duplicated ${selectedBlockIds.size} block(s)`, 'success', 1500);
        } else if (selectedBlockId) {
          useWorkspaceStore.getState().duplicateBlock(selectedBlockId);
          addToast('Block duplicated', 'success', 1500);
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedBlockIds.size > 0) {
          const count = selectedBlockIds.size;
          removeSelected();
          addToast(`Removed ${count} block(s)`, 'info', 2000);
        } else if (selectedBlockId) {
          useWorkspaceStore.getState().removeBlock(selectedBlockId);
          setSelectedBlockId(null);
          addToast('Block removed', 'info', 2000);
        }
        return;
      }

      if (e.key === 'Escape') {
        clearSelection();
        setSelectedBlockId(null);
        return;
      }

      // Arrow keys to nudge selected block
      if (selectedBlockId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const store = useWorkspaceStore.getState();
        const block = store.workspace.blocks.find(b => b.id === selectedBlockId);
        if (!block) return;
        let { x, y } = block;
        if (e.key === 'ArrowLeft') x = Math.max(0, x - 1);
        if (e.key === 'ArrowRight') x = Math.min(12 - block.w, x + 1);
        if (e.key === 'ArrowUp') y = Math.max(0, y - 1);
        if (e.key === 'ArrowDown') y = y + 1;
        store.moveBlock(block.id, x, y);
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedBlockId, selectedBlockIds, undo, redo, canUndo, canRedo, selectAll, clearSelection, removeSelected, duplicateSelected, addToast]);

  return (
    <div className="flex h-full relative">
      {/* Mobile toggle buttons */}
      <div className="absolute top-3 left-3 z-20 flex gap-1.5 lg:hidden">
        <button
          onClick={() => { setShowPalette(!showPalette); setShowInspector(false); setShowTheme(false); }}
          className={`p-2 rounded-lg border transition-all ${
            showPalette ? 'bg-accent text-white border-accent' : 'bg-surface-raised text-txt-secondary border-border'
          }`}
          aria-label="Toggle block palette"
        >
          <PanelLeft size={16} />
        </button>
        <button
          onClick={() => { setShowInspector(!showInspector); setShowPalette(false); setShowTheme(false); }}
          className={`p-2 rounded-lg border transition-all ${
            showInspector ? 'bg-accent text-white border-accent' : 'bg-surface-raised text-txt-secondary border-border'
          }`}
          aria-label="Toggle inspector"
        >
          <Settings2 size={16} />
        </button>
        <button
          onClick={() => { setShowTheme(!showTheme); setShowPalette(false); setShowInspector(false); }}
          className={`p-2 rounded-lg border transition-all ${
            showTheme ? 'bg-accent text-white border-accent' : 'bg-surface-raised text-txt-secondary border-border'
          }`}
          aria-label="Toggle theme panel"
        >
          <Palette size={16} />
        </button>
      </div>

      {/* Left: Block palette */}
      <div className={`
        lg:relative lg:block lg:w-60 lg:shrink-0
        ${showPalette ? 'fixed inset-y-0 left-0 z-30 w-72 animate-fade-in' : 'hidden'}
      `}>
        <BlockPalette onClose={() => setShowPalette(false)} />
      </div>

      {/* Backdrop for mobile overlays */}
      {(showPalette || showInspector || showTheme) && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden backdrop-blur-sm"
          onClick={() => { setShowPalette(false); setShowInspector(false); setShowTheme(false); }}
        />
      )}

      {/* Center: Canvas */}
      <CanvasArea
        selectedBlockId={selectedBlockId}
        onSelectBlock={setSelectedBlockId}
        isOverCanvas={isOverCanvas}
      />

      {/* Right: Inspector */}
      <div className={`
        ${showTheme ? 'hidden' : `lg:relative lg:block lg:w-64 lg:shrink-0 ${showInspector ? 'fixed inset-y-0 right-0 z-30 w-72 animate-fade-in' : 'hidden'}`}
      `}>
        <BlockInspector
          selectedBlockId={selectedBlockId}
          onSelectBlock={setSelectedBlockId}
          onOpenTheme={() => { setShowTheme(true); setShowInspector(false); }}
        />
      </div>

      {/* Right: Theme panel */}
      <div className={`
        ${showTheme ? 'lg:relative lg:block lg:w-64 lg:shrink-0 fixed inset-y-0 right-0 z-30 w-72 animate-fade-in lg:animate-none' : 'hidden'}
      `}>
        <ThemePanel onClose={() => setShowTheme(false)} />
      </div>
    </div>
  );
};
