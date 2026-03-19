import React, { useCallback, useEffect, useRef } from 'react';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useWorkspaceStore } from '@/store/workspace-store';
import { SortableBlock } from './SortableBlock';
import { TemplatePicker } from './TemplatePicker';
import { Layers, Undo2, Plus, Plug, Eye, Grid3x3 } from 'lucide-react';
import type { BlockConfig } from '@/types/blocks';

interface Props {
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  isOverCanvas?: boolean;
}

export const CanvasArea: React.FC<Props> = ({ selectedBlockId, onSelectBlock, isOverCanvas }) => {
  const { workspace, reorderBlocks, removeBlock, addBlock } = useWorkspaceStore();
  const [lastRemoved, setLastRemoved] = React.useState<{ type: string; label: string } | null>(null);
  const [showGrid, setShowGrid] = React.useState(false);
  const [newBlockId, setNewBlockId] = React.useState<string | null>(null);

  // Track newly added blocks for entrance animation
  const blockCount = workspace.blocks.length;
  const prevCountRef = useRef(blockCount);
  useEffect(() => {
    if (blockCount > prevCountRef.current) {
      const newest = workspace.blocks[workspace.blocks.length - 1];
      if (newest) {
        onSelectBlock(newest.id);
        setNewBlockId(newest.id);
        const timer = setTimeout(() => setNewBlockId(null), 400);
        return () => clearTimeout(timer);
      }
    }
    prevCountRef.current = blockCount;
  }, [blockCount, workspace.blocks, onSelectBlock]);

  const handleRemove = useCallback((id: string) => {
    const block = workspace.blocks.find((b) => b.id === id);
    if (block) {
      setLastRemoved({ type: block.type, label: block.label });
      setTimeout(() => setLastRemoved(null), 5000);
    }
    removeBlock(id);
    if (selectedBlockId === id) onSelectBlock(null);
  }, [removeBlock, selectedBlockId, onSelectBlock, workspace.blocks]);

  const handleUndo = useCallback(() => {
    if (!lastRemoved) return;
    addBlock(lastRemoved.type as any);
    setLastRemoved(null);
  }, [lastRemoved, addBlock]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedBlockId && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        handleRemove(selectedBlockId);
      }
      if (e.key === 'Escape') onSelectBlock(null);
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && lastRemoved) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedBlockId, lastRemoved, handleRemove, handleUndo, onSelectBlock]);

  // Droppable for palette items
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: 'canvas-drop-zone' });

  if (workspace.blocks.length === 0) {
    return <EmptyCanvas isOver={isOverCanvas || isOver} setDropRef={setDropRef} />;
  }

  return (
    <div
      ref={setDropRef}
      className={`flex-1 bg-surface overflow-y-auto p-4 sm:p-6 relative canvas-grid transition-colors
        ${(isOverCanvas || isOver) ? 'canvas-drop-active' : ''}`}
    >
      {/* Toolbar */}
      <div className="max-w-5xl mx-auto flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-2xs font-medium transition-colors ${
              showGrid
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'bg-surface-raised text-txt-muted border border-border hover:text-txt-secondary'
            }`}
            title="Toggle 12-column grid overlay"
          >
            <Grid3x3 size={12} />
            {showGrid ? 'Grid On' : 'Grid'}
          </button>
          <span className="text-2xs text-txt-ghost">12-column layout</span>
        </div>
        <RowUsageSummary blocks={workspace.blocks} />
      </div>

      {/* 12-column grid overlay */}
      {showGrid && (
        <div className="max-w-5xl mx-auto grid grid-cols-12 gap-2.5 pointer-events-none absolute inset-x-4 sm:inset-x-6 top-14" style={{ zIndex: 1 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-full min-h-[60vh] bg-accent/[0.03] border-x border-accent/[0.06] rounded-sm relative">
              <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[9px] text-accent/20 font-mono">{i + 1}</span>
            </div>
          ))}
        </div>
      )}

      <SortableContext
        items={workspace.blocks.map((b) => b.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="max-w-5xl mx-auto grid grid-cols-6 sm:grid-cols-12 gap-2.5 auto-rows-min">
          {workspace.blocks.map((block) => (
            <SortableBlock
              key={block.id}
              block={block}
              isSelected={selectedBlockId === block.id}
              isNew={newBlockId === block.id}
              onSelect={() => onSelectBlock(block.id)}
              onRemove={() => handleRemove(block.id)}
            />
          ))}
        </div>
      </SortableContext>

      {/* Drop hint when dragging from palette */}
      {(isOverCanvas || isOver) && (
        <div className="max-w-5xl mx-auto mt-2.5">
          <div className="border-2 border-dashed border-accent/40 rounded-xl p-4 flex items-center justify-center gap-2 bg-accent/5 animate-fade-in">
            <Plus size={14} className="text-accent" />
            <span className="text-xs text-accent font-medium">Drop here to add block</span>
          </div>
        </div>
      )}

      {/* Undo toast */}
      {lastRemoved && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
          <div className="flex items-center gap-3 bg-surface-raised border border-border rounded-xl px-4 py-2.5 shadow-xl">
            <span className="text-xs text-txt-secondary">
              Removed <span className="text-txt-primary">{lastRemoved.label}</span>
            </span>
            <button
              onClick={handleUndo}
              className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover font-medium transition-colors"
            >
              <Undo2 size={12} /> Undo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Shows how blocks fill up rows in the 12-column grid
const RowUsageSummary: React.FC<{ blocks: BlockConfig[] }> = ({ blocks }) => {
  if (blocks.length === 0) return null;

  const rows: number[][] = [];
  let currentRow: number[] = [];
  let remaining = 12;
  for (const b of blocks) {
    if (b.w > remaining) {
      if (currentRow.length > 0) rows.push(currentRow);
      currentRow = [b.w];
      remaining = 12 - b.w;
    } else {
      currentRow.push(b.w);
      remaining -= b.w;
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);

  return (
    <div className="flex items-center gap-2">
      <span className="text-2xs text-txt-ghost">{rows.length} row{rows.length !== 1 ? 's' : ''}</span>
      <div className="flex gap-1">
        {rows.map((row, ri) => {
          const used = row.reduce((a, b) => a + b, 0);
          return (
            <div key={ri} className="flex gap-px" title={`Row ${ri + 1}: ${row.join('+')} = ${used}/12 cols`}>
              {row.map((w, bi) => (
                <div key={bi} className="h-2 rounded-sm bg-accent/40" style={{ width: `${(w / 12) * 40}px` }} />
              ))}
              {used < 12 && (
                <div className="h-2 rounded-sm bg-surface-overlay" style={{ width: `${((12 - used) / 12) * 40}px` }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const EmptyCanvas: React.FC<{ isOver: boolean; setDropRef: (el: HTMLElement | null) => void }> = ({ isOver, setDropRef }) => (
  <div ref={setDropRef} className="flex-1 flex items-center justify-center bg-surface p-6">
    <div className={`w-full max-w-lg animate-fade-in`}>
      <div className={`text-center mb-6 p-8 rounded-2xl border-2 border-dashed transition-all duration-200 empty-canvas-drop-target
        ${isOver ? 'is-over border-accent bg-accent/5' : 'border-border/50'}`}>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-all duration-200
          ${isOver ? 'bg-accent/20 scale-110' : 'bg-accent/10'}`}>
          <Layers size={28} className="text-accent" />
        </div>
        <h2 className="text-lg font-semibold text-txt-primary mb-2">
          {isOver ? 'Drop to add block' : 'Build your AI frontend'}
        </h2>
        <p className="text-sm text-txt-muted leading-relaxed max-w-sm mx-auto">
          {isOver
            ? 'Release to place this block on your canvas'
            : 'Drag blocks from the palette, pick a template, or click any block to add it.'}
        </p>
      </div>

      {!isOver && (
        <>
          {/* Step indicators */}
          <div className="flex items-center justify-center gap-6 mb-6">
            {[
              { label: 'Add blocks', icon: <Plus size={12} /> },
              { label: 'Connect agent', icon: <Plug size={12} /> },
              { label: 'Preview & publish', icon: <Eye size={12} /> },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-2xs text-txt-muted">
                <div className="w-5 h-5 rounded-full bg-accent/15 flex items-center justify-center text-accent">
                  {s.icon}
                </div>
                <span>{s.label}</span>
              </div>
            ))}
          </div>

          <TemplatePicker />
        </>
      )}
    </div>
  </div>
);
