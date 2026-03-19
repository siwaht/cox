import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { BlockPalette } from './BlockPalette';
import { CanvasArea } from './CanvasArea';
import { BlockInspector } from './BlockInspector';
import { ThemePanel } from './ThemePanel';
import { DragPreview, PaletteDragPreview } from './DragPreview';
import { useWorkspaceStore } from '@/store/workspace-store';
import { PanelLeft, Settings2, Palette } from 'lucide-react';
import type { BlockType } from '@/types/blocks';

export const EditorView: React.FC = () => {
  const [showPalette, setShowPalette] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activePaletteType, setActivePaletteType] = useState<string | null>(null);
  const [isOverCanvas, setIsOverCanvas] = useState(false);

  const { workspace, reorderBlocks, addBlock } = useWorkspaceStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;

    if (data?.fromPalette) {
      // Dragging from palette
      setActivePaletteType(data.blockType);
      setActiveId(null);
    } else {
      // Reordering on canvas
      setActiveId(active.id as string);
      setActivePaletteType(null);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setIsOverCanvas(over?.id === 'canvas-drop-zone' || workspace.blocks.some(b => b.id === over?.id));
  }, [workspace.blocks]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    // Reset state
    setActiveId(null);
    setActivePaletteType(null);
    setIsOverCanvas(false);

    const data = active.data.current;

    if (data?.fromPalette) {
      // Dropped from palette onto canvas
      if (over) {
        addBlock(data.blockType as BlockType);
        setShowPalette(false); // close mobile palette
      }
      return;
    }

    // Canvas reorder
    if (!over || active.id === over.id) return;
    const ids = workspace.blocks.map((b) => b.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newIds = [...ids];
    newIds.splice(oldIndex, 1);
    newIds.splice(newIndex, 0, active.id as string);
    reorderBlocks(newIds);
  }, [workspace.blocks, reorderBlocks, addBlock]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setActivePaletteType(null);
    setIsOverCanvas(false);
  }, []);

  const activeBlock = activeId ? workspace.blocks.find((b) => b.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
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
            className="fixed inset-0 z-20 bg-black/40 lg:hidden"
            onClick={() => { setShowPalette(false); setShowInspector(false); setShowTheme(false); }}
          />
        )}

        {/* Center: Canvas */}
        <CanvasArea
          selectedBlockId={selectedBlockId}
          onSelectBlock={setSelectedBlockId}
          isOverCanvas={isOverCanvas && !!activePaletteType}
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

      {/* Drag overlay — shows preview while dragging */}
      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
        {activeBlock ? <DragPreview block={activeBlock} /> : null}
        {activePaletteType ? <PaletteDragPreview blockType={activePaletteType} /> : null}
      </DragOverlay>
    </DndContext>
  );
};
