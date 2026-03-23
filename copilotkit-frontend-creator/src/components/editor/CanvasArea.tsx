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
  const { workspace, removeBlock, addBlock, undo, redo, canUndo, canRedo, selectedBlockIds, selectBlock, clearSelection, updateWorkspace } = useWorkspaceStore();
  const [showGrid, setShowGrid] = useState(false);
  const [newBlockId, setNewBlockId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ rowIdx: number; position: 'before' | 'after' | 'into'; hoverCol?: number } | null>(null);

  // Use refs for drag state so it's always current in event handlers (no stale closures)
  const draggedBlockIdRef = useRef<string | null>(null);
  const dropTargetRef = useRef<typeof dropTarget>(null);
  const [dragActive, setDragActive] = useState(false);

  // Keep ref in sync with state
  const updateDropTarget = useCallback((dt: typeof dropTarget) => {
    dropTargetRef.current = dt;
    setDropTarget(dt);
  }, []);

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
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const blocksRef = useRef(workspace.blocks);
  blocksRef.current = workspace.blocks;

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

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvasBg !== undefined) {
      clearSelection();
      onSelectBlock(null);
    }
  }, [clearSelection, onSelectBlock]);

  // ─── Drag from palette (new block) ───
  const handlePaletteDrop = useCallback((e: React.DragEvent) => {
    const blockType = e.dataTransfer.getData('application/block-type');
    if (blockType) {
      e.preventDefault();
      e.stopPropagation();
      addBlock(blockType as BlockType);
    }
  }, [addBlock]);

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Allow both palette drops and block reorder drops
    if (draggedBlockIdRef.current) {
      e.dataTransfer.dropEffect = 'move';
    } else {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  // ─── Internal block drag ───
  const handleBlockDragStart = useCallback((blockId: string) => {
    draggedBlockIdRef.current = blockId;
    setDragActive(true);
  }, []);

  const handleBlockDragEnd = useCallback(() => {
    draggedBlockIdRef.current = null;
    dropTargetRef.current = null;
    setDragActive(false);
    setDropTarget(null);
  }, []);

  // Commit the drag using refs (always current, no stale closure issues)
  const commitDrag = useCallback(() => {
    const dragId = draggedBlockIdRef.current;
    const dt = dropTargetRef.current;
    if (!dragId || !dt) return;

    const blocks = blocksRef.current;
    const currentRows = rowsRef.current;
    const block = blocks.find(b => b.id === dragId);
    if (!block) return;

    const targetRow = currentRows[dt.rowIdx];

    if (dt.position === 'into' && targetRow) {
      const rowY = targetRow[0].y;
      const otherBlocksInRow = targetRow.filter(b => b.id !== block.id);
      const usedCols = otherBlocksInRow.reduce((sum, b) => sum + b.w, 0);
      const remainingCols = GRID_COLS - usedCols;
      if (remainingCols <= 0) return;
      
      const newW = Math.min(block.w, Math.max(2, remainingCols));
      const modifiedBlock = { ...block, w: newW };

      otherBlocksInRow.sort((a, b) => a.x - b.x);
      let insertIndex = otherBlocksInRow.length;
      
      if (dt.hoverCol !== undefined) {
          let currentX = 0;
          for (let i = 0; i < otherBlocksInRow.length; i++) {
              const b = otherBlocksInRow[i];
              if (dt.hoverCol <= currentX + b.w / 2) {
                  insertIndex = i;
                  break;
              }
              currentX += b.w;
          }
      }
      
      otherBlocksInRow.splice(insertIndex, 0, modifiedBlock);
      
      let currentX = 0;
      otherBlocksInRow.forEach(b => {
         b.x = currentX;
         currentX += b.w;
      });
      
      const updatedIds = new Set(otherBlocksInRow.map(b => b.id));
      const newBlocks = blocks.map(b => {
         if (updatedIds.has(b.id)) {
             const updated = otherBlocksInRow.find(ob => ob.id === b.id)!;
             return { ...b, x: updated.x, y: rowY, w: updated.w };
         }
         return b;
      });
      
      updateWorkspace({ blocks: normalizeBlockPositions(newBlocks) });
    } else if (dt.position === 'before' || dt.position === 'after') {
      const targetRowY = dt.position === 'before'
        ? (currentRows[dt.rowIdx]?.[0]?.y ?? 0)
        : (currentRows[dt.rowIdx]?.[0]?.y ?? 0) + 1;

      const newBlocks = blocks.map(b => {
        if (b.id === block.id) return { ...b, x: 0, y: targetRowY };
        if (b.y >= targetRowY) return { ...b, y: b.y + block.h };
        return b;
      });
      updateWorkspace({ blocks: normalizeBlockPositions(newBlocks) });
    }
  }, [updateWorkspace]);

  // The actual drop handler for block reordering
  const handleBlockDrop = useCallback((e: React.DragEvent) => {
    // Only handle block reorder drops, not palette drops
    const blockId = e.dataTransfer.getData('application/block-id');
    if (!blockId) return;
    e.preventDefault();
    e.stopPropagation();
    commitDrag();
    draggedBlockIdRef.current = null;
    dropTargetRef.current = null;
    setDragActive(false);
    setDropTarget(null);
  }, [commitDrag]);

  // Row-level drag over — detects before/after/into based on cursor Y position
  const handleRowDragOver = useCallback((e: React.DragEvent, rowIdx: number) => {
    // Only respond to internal block drags
    if (!draggedBlockIdRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const edgeZone = Math.max(20, rect.height * 0.22);

    const colWidth = rect.width / GRID_COLS;
    const hoverCol = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(x / colWidth)));

    let position: 'before' | 'after' | 'into';
    if (y < edgeZone) {
      position = 'before';
    } else if (y > rect.height - edgeZone) {
      position = 'after';
    } else {
      const currentRows = rowsRef.current;
      const rowBlocks = currentRows[rowIdx] || [];
      const usedCols = rowBlocks.filter(b => b.id !== draggedBlockIdRef.current).reduce((sum, b) => sum + b.w, 0);
      const draggedBlockInfo = blocksRef.current.find(b => b.id === draggedBlockIdRef.current);
      const draggedBlockW = draggedBlockInfo ? draggedBlockInfo.w : 0;
      
      const isAlreadyInRow = rowBlocks.some(b => b.id === draggedBlockIdRef.current);
      if (usedCols + draggedBlockW <= GRID_COLS || isAlreadyInRow) {
        position = 'into';
      } else {
        position = y < rect.height / 2 ? 'before' : 'after';
      }
    }

    // Only update if changed (avoids re-renders)
    const prev = dropTargetRef.current;
    if (!prev || prev.rowIdx !== rowIdx || prev.position !== position || prev.hoverCol !== hoverCol) {
      updateDropTarget({ rowIdx, position, hoverCol });
    }
  }, [updateDropTarget]);

  // Explicit before/after zone drag over
  const handleZoneDragOver = useCallback((e: React.DragEvent, rowIdx: number, position: 'before' | 'after') => {
    if (!draggedBlockIdRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const prev = dropTargetRef.current;
    if (!prev || prev.rowIdx !== rowIdx || prev.position !== position) {
      updateDropTarget({ rowIdx, position });
    }
  }, [updateDropTarget]);

  // Only clear drop target when leaving the entire canvas rows area
  const handleCanvasDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if we're actually leaving the container (not entering a child)
    const related = e.relatedTarget as HTMLElement | null;
    if (!related || !e.currentTarget.contains(related)) {
      updateDropTarget(null);
    }
  }, [updateDropTarget]);

  // Row usage info
  const rowInfo = useMemo(() => computeRows(workspace.blocks), [workspace.blocks]);

  if (workspace.blocks.length === 0) {
    return <EmptyCanvas isOver={!!isOverCanvas} onDrop={handlePaletteDrop} onDragOver={handleCanvasDragOver} />;
  }

  return (
    <div
      onClick={handleCanvasClick}
      onDrop={handlePaletteDrop}
      onDragOver={handleCanvasDragOver}
      className={`flex-1 overflow-y-auto p-4 sm:p-6 relative canvas-grid transition-all duration-300
        ${isOverCanvas ? 'canvas-drop-active shadow-[inset_0_0_100px_rgba(139,92,246,0.12)] bg-accent/[0.02]' : ''}`}
      style={{ background: isOverCanvas ? undefined : 'var(--color-surface)' }}
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
      <div
        className="max-w-5xl mx-auto space-y-0"
        data-canvas-bg
        onDragLeave={handleCanvasDragLeave}
      >
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
            <div key={`row-${rowIdx}`} className="relative">
              {/* Drop zone: before this row */}
              <div
                className={`transition-all duration-150 ${
                  isDropBefore
                    ? 'h-3 my-1'
                    : dragActive ? 'h-3' : 'h-1'
                }`}
                onDragOver={(e) => handleZoneDragOver(e, rowIdx, 'before')}
                onDrop={handleBlockDrop}
              >
                <div className={`h-full rounded-full mx-4 transition-all duration-150 ${
                  isDropBefore ? 'bg-accent/60' : 'bg-transparent'
                }`} />
              </div>

              {/* Row container with CSS Grid */}
              <div
                className={`grid gap-2.5 transition-all duration-150 ${
                  isDropInto ? 'ring-2 ring-accent/40 ring-offset-2 ring-offset-surface rounded-xl' : ''
                }`}
                style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}
                onDragOver={(e) => handleRowDragOver(e, rowIdx)}
                onDrop={handleBlockDrop}
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
                    className={`rounded-xl border-2 border-dashed border-border/30 flex items-center justify-center transition-opacity cursor-default ${
                      dragActive ? 'opacity-60' : 'opacity-0 hover:opacity-100'
                    }`}
                    style={{ gridColumn: `span ${GRID_COLS - rowUsed}` }}
                  >
                    <span className="text-2xs text-txt-ghost flex items-center gap-1">
                      <Columns size={10} /> {GRID_COLS - rowUsed} cols free
                    </span>
                  </div>
                )}
              </div>

              {/* Drop zone: after this row */}
              <div
                className={`transition-all duration-150 ${
                  isDropAfter
                    ? 'h-3 my-1'
                    : dragActive ? 'h-3' : 'h-1'
                }`}
                onDragOver={(e) => handleZoneDragOver(e, rowIdx, 'after')}
                onDrop={handleBlockDrop}
              >
                <div className={`h-full rounded-full mx-4 transition-all duration-150 ${
                  isDropAfter ? 'bg-accent/60' : 'bg-transparent'
                }`} />
              </div>
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
  // Use original array index as a stable tiebreaker when y and x are equal
  const tagged = blocks.map((b, i) => ({ block: b, idx: i }));
  tagged.sort((a, b) => a.block.y - b.block.y || a.block.x - b.block.x || a.idx - b.idx);
  const rowMap = new Map<number, BlockConfig[]>();
  for (const { block } of tagged) {
    const existing = rowMap.get(block.y);
    if (existing) {
      existing.push(block);
    } else {
      rowMap.set(block.y, [block]);
    }
  }
  return Array.from(rowMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([, rowBlocks]) => rowBlocks);
}

// ─── Normalize y-coordinates to sequential (0, 1, 2, ...) to prevent gaps ───
function normalizeBlockPositions(blocks: BlockConfig[]): BlockConfig[] {
  const rows = computeVisualRows(blocks);
  const yMap = new Map<number, number>();
  rows.forEach((row, idx) => {
    const oldY = row[0].y;
    if (oldY !== idx) yMap.set(oldY, idx);
  });
  if (yMap.size === 0) return blocks;
  return blocks.map(b => {
    const newY = yMap.get(b.y);
    return newY !== undefined ? { ...b, y: newY } : b;
  });
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
  <div onDrop={onDrop} onDragOver={onDragOver} className={`flex-1 flex items-center justify-center p-6 transition-colors duration-500 ${isOver ? 'bg-accent/5' : ''}`} style={{ background: isOver ? undefined : 'var(--color-surface)' }}>
    <div className="w-full max-w-lg animate-fade-in relative z-10">
      <div className={`text-center mb-6 p-10 rounded-3xl border-2 border-dashed transition-all duration-300 empty-canvas-drop-target
        ${isOver ? 'is-over border-accent bg-accent/10 shadow-[0_0_60px_rgba(139,92,246,0.2)]' : 'border-border/40 hover:border-accent/40 hover:bg-accent/5 hover:shadow-[0_0_40px_rgba(139,92,246,0.08)]'}`}>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-all duration-300
          ${isOver ? 'bg-accent/20 scale-110 shadow-[0_0_30px_rgba(139,92,246,0.4)]' : 'bg-accent/10'}`}>
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
