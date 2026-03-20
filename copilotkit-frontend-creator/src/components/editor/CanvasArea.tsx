import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { SortableBlock } from './SortableBlock';
import { TemplatePicker } from './TemplatePicker';
import { Layers, Undo2, Redo2, Plus, Plug, Eye, Grid3x3, Hash } from 'lucide-react';
import type { BlockConfig, BlockType } from '@/types/blocks';

const GRID_COLS = 12;
const ROW_HEIGHT = 80; // px per grid row
const GAP = 10; // px gap between cells

interface Props {
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  isOverCanvas?: boolean;
}

export const CanvasArea: React.FC<Props> = ({ selectedBlockId, onSelectBlock, isOverCanvas }) => {
  const { workspace, removeBlock, addBlock, undo, redo, canUndo, canRedo, selectedBlockIds, selectBlock, clearSelection } = useWorkspaceStore();
  const [showGrid, setShowGrid] = useState(false);
  const [newBlockId, setNewBlockId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(960);

  // Measure container width for grid calculations
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    setContainerWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  const colWidth = (containerWidth - (GRID_COLS - 1) * GAP) / GRID_COLS;

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
    removeBlock(id);
    if (selectedBlockId === id) onSelectBlock(null);
  }, [removeBlock, selectedBlockId, onSelectBlock]);

  const handleBlockClick = useCallback((id: string, e?: React.MouseEvent) => {
    if (e && (e.ctrlKey || e.metaKey || e.shiftKey)) {
      selectBlock(id, true);
    } else {
      clearSelection();
      onSelectBlock(id);
    }
  }, [selectBlock, clearSelection, onSelectBlock]);

  // Click on canvas background to deselect
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvasBg !== undefined) {
      clearSelection();
      onSelectBlock(null);
    }
  }, [clearSelection, onSelectBlock]);

  // Handle drop from palette (simple drop zone)
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const blockType = e.dataTransfer.getData('application/block-type');
    if (blockType) {
      addBlock(blockType as BlockType);
    }
  }, [addBlock]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Compute total grid height from blocks
  const totalRows = useMemo(() => {
    if (workspace.blocks.length === 0) return 4;
    return Math.max(4, ...workspace.blocks.map(b => b.y + b.h)) + 2; // +2 for breathing room
  }, [workspace.blocks]);

  const canvasHeight = totalRows * ROW_HEIGHT + (totalRows - 1) * GAP;

  // Row usage info
  const rowInfo = useMemo(() => computeRows(workspace.blocks), [workspace.blocks]);

  if (workspace.blocks.length === 0) {
    return <EmptyCanvas isOver={!!isOverCanvas} onDrop={handleDrop} onDragOver={handleDragOver} />;
  }

  return (
    <div
      onClick={handleCanvasClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={`flex-1 bg-surface overflow-y-auto p-4 sm:p-6 relative canvas-grid transition-colors
        ${isOverCanvas ? 'canvas-drop-active' : ''}`}
    >
      {/* Toolbar */}
      <div className="max-w-5xl mx-auto flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 mr-1">
            <button
              onClick={() => canUndo() && undo()}
              disabled={!canUndo()}
              className={`p-1.5 rounded-lg text-2xs transition-colors ${
                canUndo()
                  ? 'text-txt-muted hover:text-accent hover:bg-accent-soft'
                  : 'text-txt-ghost cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo2 size={13} />
            </button>
            <button
              onClick={() => canRedo() && redo()}
              disabled={!canRedo()}
              className={`p-1.5 rounded-lg text-2xs transition-colors ${
                canRedo()
                  ? 'text-txt-muted hover:text-accent hover:bg-accent-soft'
                  : 'text-txt-ghost cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Shift+Z)"
              aria-label="Redo"
            >
              <Redo2 size={13} />
            </button>
          </div>

          <div className="w-px h-4 bg-border/50" />

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-2xs font-medium transition-colors ${
              showGrid
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'bg-surface-raised text-txt-muted border border-border hover:text-txt-secondary'
            }`}
            title="Toggle 12-column grid overlay"
            aria-pressed={showGrid}
          >
            <Grid3x3 size={12} />
            {showGrid ? 'Grid On' : 'Grid'}
          </button>

          <span className="text-2xs text-txt-ghost hidden sm:inline">
            <Hash size={10} className="inline mr-0.5" />{workspace.blocks.length} blocks · {rowInfo.rows} row{rowInfo.rows !== 1 ? 's' : ''}
          </span>

          {selectedBlockIds.size > 1 && (
            <span className="text-2xs text-accent font-medium animate-fade-in">
              {selectedBlockIds.size} selected
            </span>
          )}
        </div>
        <RowUsageSummary rowInfo={rowInfo} />
      </div>

      {/* Grid container */}
      <div
        ref={containerRef}
        className="max-w-5xl mx-auto relative"
        style={{ height: canvasHeight }}
        data-canvas-bg
      >
        {/* 12-column grid overlay */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
            {Array.from({ length: GRID_COLS }).map((_, i) => {
              const left = i * (colWidth + GAP);
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 bg-accent/[0.03] border-x border-accent/[0.06] rounded-sm"
                  style={{ left, width: colWidth }}
                >
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[9px] text-accent/20 font-mono">{i + 1}</span>
                </div>
              );
            })}
            {/* Row lines */}
            {Array.from({ length: totalRows }).map((_, i) => {
              const top = i * (ROW_HEIGHT + GAP);
              return (
                <div
                  key={`row-${i}`}
                  className="absolute left-0 right-0 border-t border-accent/[0.04]"
                  style={{ top }}
                />
              );
            })}
          </div>
        )}

        {/* Blocks */}
        {workspace.blocks.map((block) => (
          <SortableBlock
            key={block.id}
            block={block}
            isSelected={selectedBlockId === block.id || selectedBlockIds.has(block.id)}
            isMultiSelected={selectedBlockIds.has(block.id) && selectedBlockIds.size > 1}
            isNew={newBlockId === block.id}
            onSelect={(e?: React.MouseEvent) => handleBlockClick(block.id, e)}
            onRemove={() => handleRemove(block.id)}
          />
        ))}
      </div>

      {/* Drop hint when dragging from palette */}
      {isOverCanvas && (
        <div className="max-w-5xl mx-auto mt-2.5">
          <div className="border-2 border-dashed border-accent/40 rounded-xl p-4 flex items-center justify-center gap-2 bg-accent/5 animate-fade-in">
            <Plus size={14} className="text-accent" />
            <span className="text-xs text-accent font-medium">Drop here to add block</span>
          </div>
        </div>
      )}
    </div>
  );
};


// ─── Row computation ───
interface RowInfo {
  rows: number;
  totalUsed: number;
  rowWidths: number[];
}

function computeRows(blocks: BlockConfig[]): RowInfo {
  if (blocks.length === 0) return { rows: 0, totalUsed: 0, rowWidths: [] };
  const maxRow = Math.max(...blocks.map(b => b.y + b.h));
  const totalUsed = blocks.reduce((sum, b) => sum + b.w * b.h, 0);
  // Compute how much of each row is used
  const rowWidths: number[] = [];
  for (let r = 0; r < maxRow; r++) {
    let used = 0;
    for (const b of blocks) {
      if (r >= b.y && r < b.y + b.h) {
        used += b.w;
      }
    }
    rowWidths.push(Math.min(used, 12));
  }
  return { rows: maxRow, totalUsed, rowWidths };
}

const RowUsageSummary: React.FC<{ rowInfo: RowInfo }> = ({ rowInfo }) => {
  const { rowWidths } = rowInfo;
  if (rowWidths.length === 0) return null;

  return (
    <div className="flex items-center gap-2" aria-label={`${rowWidths.length} rows used`}>
      <div className="flex gap-1">
        {rowWidths.slice(0, 8).map((used, ri) => (
          <div key={ri} className="flex gap-px" title={`Row ${ri + 1}: ${used}/12 cols used`}>
            <div className="h-2 rounded-sm bg-accent/40 transition-all" style={{ width: `${(used / 12) * 40}px` }} />
            {used < 12 && (
              <div className="h-2 rounded-sm bg-surface-overlay" style={{ width: `${((12 - used) / 12) * 40}px` }} />
            )}
          </div>
        ))}
        {rowWidths.length > 8 && (
          <span className="text-2xs text-txt-ghost">+{rowWidths.length - 8}</span>
        )}
      </div>
    </div>
  );
};

const EmptyCanvas: React.FC<{
  isOver: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
}> = ({ isOver, onDrop, onDragOver }) => (
  <div onDrop={onDrop} onDragOver={onDragOver} className="flex-1 flex items-center justify-center bg-surface p-6">
    <div className="w-full max-w-lg animate-fade-in">
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
