import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useWorkspaceStore } from '@/store/workspace-store';
import type { BlockConfig } from '@/types/blocks';
import { getBlockDefinition } from '@/registry/block-registry';
import {
  GripVertical, X, Eye, EyeOff, ChevronLeft, ChevronRight, Copy,
  MessageSquare, LayoutList, Wrench, ShieldCheck, ScrollText,
  Activity, FileInput, Table, BarChart3, LayoutDashboard,
  Layers, PanelTop, FileText,
} from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  MessageSquare, LayoutList, Wrench, ShieldCheck, ScrollText,
  Activity, FileInput, Table, BarChart3, LayoutDashboard,
  Layers, PanelTop, FileText,
};

interface Props {
  block: BlockConfig;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

export const SortableBlock: React.FC<Props> = ({ block, isSelected, onSelect, onRemove }) => {
  const { updateBlock, resizeBlock, duplicateBlock } = useWorkspaceStore();
  const def = getBlockDefinition(block.type);
  const Icon = def ? ICON_MAP[def.icon] || FileText : FileText;

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(block.label);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [isRenaming]);

  const commitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== block.label) {
      updateBlock(block.id, { label: trimmed });
    } else {
      setRenameValue(block.label);
    }
    setIsRenaming(false);
  };

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${block.w}`,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`
        relative rounded-xl border-2 transition-all group cursor-pointer
        ${isDragging ? 'z-10 drag-overlay' : ''}
        ${isSelected
          ? 'border-accent bg-accent/5 shadow-lg shadow-accent/5'
          : 'border-border/60 bg-surface-raised hover:border-txt-faint'}
        ${!block.visible ? 'opacity-40' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
        <div className="flex items-center gap-2 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded text-txt-faint
                       hover:text-txt-secondary hover:bg-surface-overlay touch-manipulation"
            aria-label="Drag to reorder"
          >
            <GripVertical size={14} />
          </button>
          <Icon size={14} className="text-accent shrink-0" />
          {isRenaming ? (
            <input
              ref={renameRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') { setRenameValue(block.label); setIsRenaming(false); }
              }}
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-medium text-txt-primary bg-transparent border-b border-accent
                         outline-none px-0 py-0 w-24"
            />
          ) : (
            <span
              className="text-xs font-medium text-txt-secondary truncate cursor-text"
              onDoubleClick={(e) => { e.stopPropagation(); setRenameValue(block.label); setIsRenaming(true); }}
              title="Double-click to rename"
            >
              {block.label}
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); resizeBlock(block.id, Math.max(3, block.w - 1), block.h); }}
            className="p-1 text-txt-faint hover:text-txt-secondary rounded hover:bg-surface-overlay"
            title="Narrower"
          >
            <ChevronLeft size={12} />
          </button>
          <span className="text-2xs text-txt-faint w-4 text-center tabular-nums">{block.w}</span>
          <button
            onClick={(e) => { e.stopPropagation(); resizeBlock(block.id, Math.min(12, block.w + 1), block.h); }}
            className="p-1 text-txt-faint hover:text-txt-secondary rounded hover:bg-surface-overlay"
            title="Wider"
          >
            <ChevronRight size={12} />
          </button>

          <div className="w-px h-3 bg-border/50 mx-0.5" />

          <button
            onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }}
            className="p-1 text-txt-faint hover:text-txt-secondary rounded hover:bg-surface-overlay"
            title="Duplicate"
          >
            <Copy size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); updateBlock(block.id, { visible: !block.visible }); }}
            className="p-1 text-txt-faint hover:text-txt-secondary rounded hover:bg-surface-overlay"
            title={block.visible ? 'Hide' : 'Show'}
          >
            {block.visible ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1 text-txt-faint hover:text-danger rounded hover:bg-danger-soft"
            title="Remove"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Preview body */}
      <div className="px-3 py-3 flex flex-col items-center justify-center" style={{ minHeight: `${block.h * 40}px` }}>
        <BlockMiniPreview type={block.type} />
      </div>
    </div>
  );
};

// Visual mini-previews that show what each block looks like
const BlockMiniPreview: React.FC<{ type: string }> = ({ type }) => {
  const previews: Record<string, React.ReactNode> = {
    chat: (
      <div className="w-full max-w-[180px] space-y-1.5 opacity-50">
        <div className="flex gap-1.5 items-start">
          <div className="w-4 h-4 rounded-full bg-accent/30 shrink-0 mt-0.5" />
          <div className="space-y-0.5 flex-1">
            <div className="h-1.5 rounded bg-txt-ghost w-full" />
            <div className="h-1.5 rounded bg-txt-ghost w-3/4" />
          </div>
        </div>
        <div className="flex gap-1.5 items-start justify-end">
          <div className="space-y-0.5 flex-1 flex flex-col items-end">
            <div className="h-1.5 rounded bg-accent/25 w-4/5" />
            <div className="h-1.5 rounded bg-accent/25 w-1/2" />
          </div>
          <div className="w-4 h-4 rounded-full bg-txt-ghost shrink-0 mt-0.5" />
        </div>
        <div className="flex gap-1.5 items-center mt-1">
          <div className="h-5 rounded-lg bg-surface flex-1" />
          <div className="w-5 h-5 rounded-lg bg-accent/20" />
        </div>
      </div>
    ),
    status: (
      <div className="w-full max-w-[140px] space-y-2 opacity-50">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-success" />
          <div className="h-1.5 rounded bg-txt-ghost w-12" />
        </div>
        <div className="h-2 rounded-full bg-surface w-full overflow-hidden">
          <div className="h-full rounded-full bg-accent/40 w-3/4" />
        </div>
      </div>
    ),
    results: (
      <div className="w-full max-w-[160px] space-y-1.5 opacity-50">
        <div className="h-8 rounded-lg bg-surface border border-txt-ghost/50 p-1.5">
          <div className="h-1 rounded bg-txt-ghost w-full mb-1" />
          <div className="h-1 rounded bg-txt-ghost w-2/3" />
        </div>
        <div className="h-8 rounded-lg bg-surface border border-txt-ghost/50 p-1.5">
          <div className="h-1 rounded bg-txt-ghost w-4/5 mb-1" />
          <div className="h-1 rounded bg-txt-ghost w-1/2" />
        </div>
      </div>
    ),
    toolActivity: (
      <div className="w-full max-w-[160px] space-y-1 opacity-50">
        {['bg-success', 'bg-success', 'bg-accent animate-pulse'].map((c, i) => (
          <div key={i} className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-surface">
            <div className={`w-1.5 h-1.5 rounded-full ${c}`} />
            <div className="h-1 rounded bg-txt-ghost flex-1" />
            <div className="h-1 rounded bg-txt-ghost/50 w-4" />
          </div>
        ))}
      </div>
    ),
    approvals: (
      <div className="w-full max-w-[160px] opacity-50">
        <div className="rounded-lg bg-surface border border-warning/20 p-2 space-y-1.5">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-warning/40" /><div className="h-1 rounded bg-txt-ghost w-16" /></div>
          <div className="h-1 rounded bg-txt-ghost/50 w-full" />
          <div className="flex gap-1 mt-1">
            <div className="h-3 rounded bg-success/20 flex-1" />
            <div className="h-3 rounded bg-danger/20 flex-1" />
          </div>
        </div>
      </div>
    ),
    logs: (
      <div className="w-full max-w-[200px] space-y-0.5 font-mono opacity-50">
        {[0.8, 0.6, 0.9, 0.5, 0.7].map((w, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="h-1 rounded bg-txt-ghost/50 w-6 shrink-0" />
            <div className="h-1 rounded bg-txt-ghost" style={{ width: `${w * 100}%` }} />
          </div>
        ))}
      </div>
    ),
    table: (
      <div className="w-full max-w-[180px] opacity-50">
        <div className="flex gap-0.5 mb-0.5">
          {[1, 1, 1].map((_, i) => <div key={i} className="h-2 rounded bg-txt-faint flex-1" />)}
        </div>
        {[0, 1].map((r) => (
          <div key={r} className="flex gap-0.5 mb-0.5">
            {[1, 1, 1].map((_, i) => <div key={i} className="h-2 rounded bg-surface flex-1" />)}
          </div>
        ))}
      </div>
    ),
    chart: (
      <div className="w-full max-w-[140px] flex items-end gap-1 h-10 opacity-50">
        {[50, 80, 35, 65, 90, 45].map((h, i) => (
          <div key={i} className="flex-1 bg-accent/25 rounded-t" style={{ height: `${h}%` }} />
        ))}
      </div>
    ),
    dashboard: (
      <div className="w-full max-w-[180px] grid grid-cols-3 gap-1 opacity-50">
        {['$4.2M', '23%', '47'].map((v, i) => (
          <div key={i} className="rounded-lg bg-surface p-1.5 text-center">
            <div className="text-[7px] text-txt-faint mb-0.5">metric</div>
            <div className="text-[8px] text-txt-secondary font-medium">{v}</div>
          </div>
        ))}
      </div>
    ),
    form: (
      <div className="w-full max-w-[140px] space-y-1.5 opacity-50">
        <div className="h-1 rounded bg-txt-ghost w-8" />
        <div className="h-4 rounded-md bg-surface border border-txt-ghost/50 w-full" />
        <div className="h-1 rounded bg-txt-ghost w-10" />
        <div className="h-4 rounded-md bg-surface border border-txt-ghost/50 w-full" />
        <div className="h-4 rounded-md bg-accent/20 w-12 mt-1" />
      </div>
    ),
    cards: (
      <div className="w-full max-w-[140px] grid grid-cols-2 gap-1 opacity-50">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-8 rounded-lg bg-surface border border-txt-ghost/50 p-1">
            <div className="h-1 rounded bg-txt-ghost w-full mb-0.5" />
            <div className="h-1 rounded bg-txt-ghost/50 w-2/3" />
          </div>
        ))}
      </div>
    ),
    markdown: (
      <div className="w-full max-w-[160px] space-y-1 opacity-50">
        <div className="h-2 rounded bg-txt-ghost w-1/3" />
        <div className="h-1 rounded bg-txt-ghost/50 w-full" />
        <div className="h-1 rounded bg-txt-ghost/50 w-4/5" />
        <div className="h-1 rounded bg-txt-ghost/50 w-full" />
        <div className="h-1 rounded bg-txt-ghost/50 w-2/3" />
      </div>
    ),
    panel: (
      <div className="w-full max-w-[140px] opacity-50">
        <div className="h-12 rounded-lg bg-surface border border-txt-ghost/50 flex items-center justify-center">
          <div className="text-[8px] text-txt-faint">Content area</div>
        </div>
      </div>
    ),
  };

  return previews[type] || (
    <div className="text-2xs text-txt-faint opacity-50">Block content</div>
  );
};
