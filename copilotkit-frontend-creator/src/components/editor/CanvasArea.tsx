import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { SortableBlock } from './SortableBlock';
import { TemplatePicker } from './TemplatePicker';
import { Layers, Undo2, Redo2, Plus, Plug, Eye, Grid3x3, Hash, Columns } from 'lucide-react';
import type { BlockConfig, BlockType } from '@/types/blocks';

const GRID_COLS = 12;

interface Props {
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  isOverCanvas?: boolean;
}

export const CanvasArea: React.FC<Props> = ({ selectedBlockId, onSelectBlock, isOverCanvas }) => {
  const { workspace, removeBlock, addBlock, undo, redo, canUndo, canRedo, selectedBlockIds, selectBlock, clearSelection, reorderBlocks, moveBlock, resizeBlock } = useWorkspaceStore();
  const [showGrid, setShowGrid] = useState(false);
  const [newBlockId, setNewBlockId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ rowIdx: number; position: 'before' | 'after' | 'into' } | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);

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

  // Group blocks into visual rows based on y coordinate
  const rows = useMemo(() => computeVisualRows(workspace.blocks), [workspace.blocks]);

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
    setDropTarget(null);
  }, [addBlock]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Internal block drag handlers
  const handleBlockDragStart = useCallback((blockId: string) => {
    setDraggedBlockId(blockId);
  }, []);

  const handleBlockDragEnd = useCallback(() => {
    if (draggedBlockId && dropTarget) {
      const block = workspace.blocks.find(b => b.id === draggedBlockId);
      if (block) {
        const targetRow = rows[dropTarget.rowIdx];
        if (dropTarget.position === 'into' && targetRow) {
          // Merge into existing row: set y to match the row, find x position
          const rowY = targetRow[0].y;
          const usedCols = targetRow.reduce((sum, b) => sum + b.w, 0);
          const remainingCols = GRID_COLS - usedCols;
          const newW = Math.min(block.w, Math.max(2, remainingCols));
          const newX = usedCols;
          moveBlock(block.id, newX, rowY);
          if (newW !== block.w) resizeBlock(block.id, newW, block.h);
        } else if (dropTarget.position === 'before' || dropTarget.position === 'after') {
          // Reorder: shift block to new row position
          const targetRowY = dropTarget.position === 'before'
            ? (rows[dropTarget.rowIdx]?.[0]?.y ?? 0)
            : (rows[dropTarget.rowIdx]?.[0]?.y ?? 0) + 1;
          
          // Shift all blocks at or after targetRowY down by block.h to make room
          const blocksToShift = workspace.blocks.filter(b => b.id !== block.id && b.y >= targetRowY);
          blocksToShift.forEach(b => moveBlock(b.id, b.x, b.y + block.h));
          moveBlock(block.id, 0, targetRowY);
        }
      }
    }
    setDraggedBlockId(null);
    setDropTarget(null);
  }, [draggedBlockId, dropTarget, workspace.blocks, rows, moveBlock, resizeBlock]);

  // Row-level drop zone handlers
  const handleRowDragOver = useCallback((e: React.DragEvent, rowIdx: number, position: 'before' | 'after' | 'into') => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ rowIdx, position });
  }, []);

  const handleRowDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

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
            <Hash size={10} className="inline mr-0.5" />{workspace.blocks.length} blocks · {rows.length} row{rows.length !== 1 ? 's' : ''}
          </span>

          {selectedBlockIds.size > 1 && (
            <span className="text-2xs text-accent font-medium animate-fade-in">
              {selectedBlockIds.size} selected
            </span>
          )}
        </div>
        <RowUsageSummary rowInfo={rowInfo} />
      </div>

      {/* Grid rows container */}
      <div className="max-w-5xl mx-auto space-y-2" data-canvas-bg>
        {/* 12-column grid overlay */}
        {showGrid && (
          <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none max-w-5xl mx-auto px-4 sm:px-6" style={{ zIndex: 0 }}>
            <div className="grid grid-cols-12 gap-2.5 h-full">
              {Array.from({ length: GRID_COLS }).map((_, i) => (
                <div key={i} className="bg-accent/[0.03] border-x border-accent/[0.06] rounded-sm relative">
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[9px] text-accent/20 font-mono">{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {rows.map((rowBlocks, rowIdx) => {
          const rowUsed = rowBlocks.reduce((sum, b) => sum + b.w, 0);
          const canFitMore = rowUsed < GRID_COLS;
          const isDropBefore = dropTarget?.rowIdx === rowIdx && dropTarget.position === 'before';
          const isDropInto = dropTarget?.rowIdx === rowIdx && dropTarget.position === 'into';
          const isDropAfter = dropTarget?.rowIdx === rowIdx && dropTarget.position === 'after';

          return (
            <div key={rowBlocks.map(b => b.id).join('-')} className="relative">
              {/* Drop indicator: before this row */}
              <div
                className={`h-1 rounded-full mx-2 mb-1 transition-all duration-150 ${
                  isDropBefore ? 'bg-accent/60 scale-y-150' : 'bg-transparent'
                }`}
                onDragOver={(e) => handleRowDragOver(e, rowIdx, 'before')}
                onDragLeave={handleRowDragLeave}
                onDrop={handleBlockDragEnd}
                style={{ minHeight: draggedBlockId ? '8px' : '2px' }}
              />

              {/* Row container with CSS Grid */}
              <div
                className={`grid gap-2.5 transition-all duration-150 ${
                  isDropInto ? 'ring-2 ring-accent/40 ring-offset-2 ring-offset-surface rounded-xl' : ''
                }`}
                style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}
                onDragOver={(e) => {
                  if (canFitMore && draggedBlockId) handleRowDragOver(e, rowIdx, 'into');
                }}
                onDragLeave={handleRowDragLeave}
                onDrop={handleBlockDragEnd}
              >
                {rowBlocks.map((block) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    isSelected={selectedBlockId === block.id || selectedBlockIds.has(block.id)}
                    isMultiSelected={selectedBlockIds.has(block.id) && selectedBlockIds.size > 1}
                    isNew={newBlockId === block.id}
                    onSelect={(e?: React.MouseEvent) => handleBlockClick(block.id, e)}
                    onRemove={() => handleRemove(block.id)}
                    onDragStart={() => handleBlockDragStart(block.id)}
                    onDragEnd={handleBlockDragEnd}
                  />
                ))}

                {/* Empty space indicator in row */}
                {canFitMore && (
                  <div
                    className="rounded-xl border-2 border-dashed border-border/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-default"
                    style={{ gridColumn: `span ${GRID_COLS - rowUsed}` }}
                    onDragOver={(e) => handleRowDragOver(e, rowIdx, 'into')}
                    onDragLeave={handleRowDragLeave}
                    onDrop={(e) => {
                      e.preventDefault();
                      const blockType = e.dataTransfer.getData('application/block-type');
                      if (blockType) {
                        addBlock(blockType as BlockType);
                      }
                      handleBlockDragEnd();
                    }}
                  >
                    <span className="text-2xs text-txt-ghost flex items-center gap-1">
                      <Columns size={10} /> {GRID_COLS - rowUsed} cols free
                    </span>
                  </div>
                )}
              </div>

              {/* Drop indicator: after this row */}
              {rowIdx === rows.length - 1 && (
                <div
                  className={`h-1 rounded-full mx-2 mt-1 transition-all duration-150 ${
                    isDropAfter ? 'bg-accent/60 scale-y-150' : 'bg-transparent'
                  }`}
                  onDragOver={(e) => handleRowDragOver(e, rowIdx, 'after')}
                  onDragLeave={handleRowDragLeave}
                  onDrop={handleBlockDragEnd}
                  style={{ minHeight: draggedBlockId ? '8px' : '2px' }}
                />
              )}
            </div>
          );
        })}
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


// ─── Group blocks into visual rows by y coordinate ───
function computeVisualRows(blocks: BlockConfig[]): BlockConfig[][] {
  if (blocks.length === 0) return [];
  const sorted = [...blocks].sort((a, b) => a.y - b.y || a.x - b.x);
  const rowMap = new Map<number, BlockConfig[]>();
  for (const block of sorted) {
    const existing = rowMap.get(block.y);
    if (existing) {
      existing.push(block);
    } else {
      rowMap.set(block.y, [block]);
    }
  }
  // Sort rows by y, then sort blocks within each row by x
  return Array.from(rowMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, blocks]) => blocks.sort((a, b) => a.x - b.x));
}

// ─── Row computation ───
interface RowInfo {
  rows: number;
  totalUsed: number;
  rowWidths: number[];
}

function computeRows(blocks: BlockConfig[]): RowInfo {
  if (blocks.length === 0) return { rows: 0, totalUsed: 0, rowWidths: [] };
  const visualRows = computeVisualRows(blocks);
  const totalUsed = blocks.reduce((sum, b) => sum + b.w * b.h, 0);
  const rowWidths = visualRows.map(row => Math.min(row.reduce((sum, b) => sum + b.w, 0), 12));
  return { rows: visualRows.length, totalUsed, rowWidths };
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
