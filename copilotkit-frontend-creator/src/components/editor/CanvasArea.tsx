import React, { useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useWorkspaceStore } from '@/store/workspace-store';
import { SortableBlock } from './SortableBlock';
import { DragPreview } from './DragPreview';
import { TemplatePicker } from './TemplatePicker';
import { Layers, Undo2, Plus, Plug, Eye } from 'lucide-react';

interface Props {
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
}

export const CanvasArea: React.FC<Props> = ({ selectedBlockId, onSelectBlock }) => {
  const { workspace, reorderBlocks, removeBlock, addBlock } = useWorkspaceStore();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [lastRemoved, setLastRemoved] = React.useState<{ type: string; label: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = workspace.blocks.map((b) => b.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newIds = [...ids];
    newIds.splice(oldIndex, 1);
    newIds.splice(newIndex, 0, active.id as string);
    reorderBlocks(newIds);
  };

  const handleRemove = useCallback((id: string) => {
    const block = workspace.blocks.find((b) => b.id === id);
    if (block) {
      setLastRemoved({ type: block.type, label: block.label });
      setTimeout(() => setLastRemoved(null), 5000);
    }
    removeBlock(id);
    if (selectedBlockId === id) onSelectBlock(null);
  }, [removeBlock, selectedBlockId, onSelectBlock]); // workspace.blocks read inline is fine — no stale closure risk since we only read

  const handleUndo = useCallback(() => {
    if (!lastRemoved) return;
    addBlock(lastRemoved.type as any);
    setLastRemoved(null);
  }, [lastRemoved, addBlock]);

  // Auto-select newly added block
  const blockCount = workspace.blocks.length;
  const prevCountRef = React.useRef(blockCount);
  useEffect(() => {
    if (blockCount > prevCountRef.current) {
      const newest = workspace.blocks[workspace.blocks.length - 1];
      if (newest) onSelectBlock(newest.id);
    }
    prevCountRef.current = blockCount;
  }, [blockCount, workspace.blocks, onSelectBlock]);

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

  const activeBlock = activeId ? workspace.blocks.find((b) => b.id === activeId) : null;

  if (workspace.blocks.length === 0) {
    return <EmptyCanvas />;
  }

  return (
    <div className="flex-1 bg-surface overflow-y-auto p-4 sm:p-6 relative canvas-grid">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
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
                onSelect={() => onSelectBlock(block.id)}
                onRemove={() => handleRemove(block.id)}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {activeBlock ? <DragPreview block={activeBlock} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Undo toast */}
      {lastRemoved && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
          <div className="flex items-center gap-3 bg-surface-raised border border-border rounded-xl px-4 py-2.5 shadow-xl">
            <span className="text-xs text-zinc-400">
              Removed <span className="text-zinc-200">{lastRemoved.label}</span>
            </span>
            <button
              onClick={handleUndo}
              className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover font-medium"
            >
              <Undo2 size={12} /> Undo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const EmptyCanvas: React.FC = () => (
  <div className="flex-1 flex items-center justify-center bg-surface p-6">
    <div className="w-full max-w-lg animate-fade-in">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
          <Layers size={28} className="text-accent" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-200 mb-2">
          Build your AI frontend
        </h2>
        <p className="text-sm text-zinc-500 leading-relaxed max-w-sm mx-auto">
          Pick a template to get started, or add blocks one by one from the palette on the left.
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-6 mb-6">
        {[
          { step: '1', label: 'Add blocks', icon: <Plus size={12} /> },
          { step: '2', label: 'Connect agent', icon: <Plug size={12} /> },
          { step: '3', label: 'Preview & publish', icon: <Eye size={12} /> },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-2xs text-zinc-500">
            <div className="w-5 h-5 rounded-full bg-accent/15 flex items-center justify-center text-accent">
              {s.icon}
            </div>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      <TemplatePicker />
    </div>
  </div>
);
