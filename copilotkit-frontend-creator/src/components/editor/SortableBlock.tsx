import React, { useState, useRef, useEffect } from 'react';
import { useWorkspaceStore } from '@/store/workspace-store';
import type { BlockConfig } from '@/types/blocks';
import { getBlockDefinition } from '@/registry/block-registry';
import {
  GripVertical, X, Eye, EyeOff, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Copy, Minimize2, Maximize2,
  MessageSquare, LayoutList, Wrench, ShieldCheck, ScrollText, Activity,
  FileInput, Table, BarChart3, LayoutDashboard, Layers, PanelTop, FileText,
  GitBranch, ThumbsUp, Database, ClipboardList, Brain, Network, Gauge,
} from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  MessageSquare, LayoutList, Wrench, ShieldCheck, ScrollText, Activity,
  FileInput, Table, BarChart3, LayoutDashboard, Layers, PanelTop, FileText,
  GitBranch, ThumbsUp, Database, ClipboardList, Brain, Network, Gauge,
};

interface Props {
  block: BlockConfig;
  isSelected: boolean;
  isMultiSelected?: boolean;
  isNew?: boolean;
  onSelect: (e?: React.MouseEvent) => void;
  onRemove: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export const SortableBlock: React.FC<Props> = ({ block, isSelected, isNew, onSelect, onRemove, onDragStart, onDragEnd }) => {
  const { updateBlock, resizeBlock, duplicateBlock } = useWorkspaceStore();
  const def = getBlockDefinition(block.type);
  const Icon = def ? ICON_MAP[def.icon] || FileText : FileText;
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(block.label);
  const [isDragging, setIsDragging] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);
  const collapsed = block.collapsed ?? false;

  useEffect(() => {
    if (isRenaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [isRenaming]);

  const commitRename = () => {
    const t = renameValue.trim();
    if (t && t !== block.label) updateBlock(block.id, { label: t });
    else setRenameValue(block.label);
    setIsRenaming(false);
  };

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateBlock(block.id, { collapsed: !collapsed });
  };

  const handleNativeDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/block-id', block.id);
    e.dataTransfer.effectAllowed = 'move';
    // Set a small drag image offset so the cursor stays near the block
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 20, 20);
    }
    setIsDragging(true);
    onDragStart?.();
  };

  const handleNativeDragEnd = () => {
    setIsDragging(false);
    onDragEnd?.();
  };

  // Allow drag events to pass through this block to the row container
  const handleDragOver = (e: React.DragEvent) => {
    // Don't handle if this block is the one being dragged
    if (isDragging) return;
    // Let the event bubble up to the row container
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const gridCol = `span ${block.w}`;
  const minH = collapsed ? 'auto' : `${block.h * 40}px`;

  const cls = [
    'relative rounded-2xl border transition-all group cursor-pointer',
    isDragging ? 'z-10 opacity-40 drag-overlay' : '',
    isNew ? 'animate-block-in' : '',
    isSelected
      ? 'border-accent shadow-[0_8px_32px_rgba(139,92,246,0.2)] ring-1 ring-inset ring-accent/30 z-[5]'
      : 'border-white/5 hover:border-accent/50 hover:shadow-[0_8px_24px_rgba(139,92,246,0.15)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),_0_2px_8px_rgba(0,0,0,0.4)]',
    !block.visible ? 'opacity-40' : '',
  ].filter(Boolean).join(' ');

  const blockStyle: React.CSSProperties = {
    gridColumn: gridCol,
    opacity: isDragging ? 0.4 : 1,
    background: isSelected
      ? 'linear-gradient(180deg, color-mix(in srgb, var(--color-surface-raised) 100%, transparent) 0%, color-mix(in srgb, var(--color-surface) 100%, transparent) 100%)'
      : 'linear-gradient(180deg, var(--color-surface-raised) 0%, color-mix(in srgb, var(--color-surface-raised) 80%, transparent) 100%)',
    backdropFilter: 'blur(24px) saturate(1.2)',
    WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
  };

  return (
    <div
      style={blockStyle}
      onClick={onSelect}
      className={cls}
      draggable
      onDragStart={handleNativeDragStart}
      onDragEnd={handleNativeDragEnd}
      onDragOver={handleDragOver}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/30">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded text-txt-faint hover:text-txt-secondary hover:bg-surface-overlay touch-manipulation"
            aria-label="Drag to reorder"
          >
            <GripVertical size={14} />
          </div>
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
              className="text-xs font-medium text-txt-primary bg-transparent border-b border-accent outline-none px-0 py-0 w-24"
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
          <span className="text-2xs text-txt-ghost tabular-nums shrink-0">{block.w}/12</span>
        </div>
        <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {/* Collapse/Expand toggle */}
          <button
            onClick={toggleCollapse}
            className="p-1 text-txt-faint hover:text-accent rounded hover:bg-accent-soft transition-colors"
            title={collapsed ? 'Expand block' : 'Collapse block'}
            aria-label={collapsed ? 'Expand block' : 'Collapse block'}
          >
            {collapsed ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
          </button>
          <div className="w-px h-3 bg-border/50 mx-0.5" />
          {/* Width controls */}
          <button
            onClick={(e) => { e.stopPropagation(); resizeBlock(block.id, Math.max(2, block.w - 1), block.h); }}
            className="p-1 text-txt-faint hover:text-txt-secondary rounded hover:bg-surface-overlay"
            title="Narrower"
          >
            <ChevronLeft size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); resizeBlock(block.id, Math.min(12, block.w + 1), block.h); }}
            className="p-1 text-txt-faint hover:text-txt-secondary rounded hover:bg-surface-overlay"
            title="Wider"
          >
            <ChevronRight size={12} />
          </button>
          <div className="w-px h-3 bg-border/50 mx-0.5" />
          {/* Height controls (only when not collapsed) */}
          {!collapsed && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); resizeBlock(block.id, block.w, Math.max(1, block.h - 1)); }}
                className="p-1 text-txt-faint hover:text-txt-secondary rounded hover:bg-surface-overlay"
                title="Shorter"
              >
                <ChevronUp size={12} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); resizeBlock(block.id, block.w, Math.min(8, block.h + 1)); }}
                className="p-1 text-txt-faint hover:text-txt-secondary rounded hover:bg-surface-overlay"
                title="Taller"
              >
                <ChevronDown size={12} />
              </button>
              <div className="w-px h-3 bg-border/50 mx-0.5" />
            </>
          )}
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

      {/* Content area - collapsible */}
      {!collapsed && (
        <div
          className="px-3 py-3 flex flex-col items-center justify-center transition-all duration-200"
          style={{ minHeight: minH }}
        >
          <BlockMiniPreview type={block.type} />
        </div>
      )}
    </div>
  );
};

const BlockMiniPreview: React.FC<{ type: string }> = ({ type }) => {
  const bar = [50, 80, 35, 65, 90];
  const p: Record<string, React.ReactNode> = {
    chat: (<div className="w-full max-w-[180px] space-y-1.5 opacity-50"><div className="flex gap-1.5 items-start"><div className="w-4 h-4 rounded-full bg-accent/30 shrink-0" /><div className="space-y-0.5 flex-1"><div className="h-1.5 rounded bg-txt-ghost w-full" /><div className="h-1.5 rounded bg-txt-ghost w-3/4" /></div></div><div className="flex gap-1.5 items-start justify-end"><div className="space-y-0.5 flex-1 flex flex-col items-end"><div className="h-1.5 rounded bg-accent/25 w-4/5" /><div className="h-1.5 rounded bg-accent/25 w-1/2" /></div><div className="w-4 h-4 rounded-full bg-txt-ghost shrink-0" /></div></div>),
    status: (<div className="w-full max-w-[140px] space-y-2 opacity-50"><div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-success" /><div className="h-1.5 rounded bg-txt-ghost w-12" /></div><div className="h-2 rounded-full bg-surface w-full overflow-hidden"><div className="h-full rounded-full bg-accent/40 w-3/4" /></div></div>),
    results: (<div className="w-full max-w-[160px] space-y-1.5 opacity-50"><div className="h-8 rounded-lg bg-surface border border-txt-ghost/50 p-1.5"><div className="h-1 rounded bg-txt-ghost w-full mb-1" /><div className="h-1 rounded bg-txt-ghost w-2/3" /></div></div>),
    toolActivity: (<div className="w-full max-w-[160px] space-y-1 opacity-50">{['bg-success', 'bg-success', 'bg-accent animate-pulse'].map((c, i) => (<div key={i} className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-surface"><div className={'w-1.5 h-1.5 rounded-full ' + c} /><div className="h-1 rounded bg-txt-ghost flex-1" /></div>))}</div>),
    approvals: (<div className="w-full max-w-[160px] opacity-50"><div className="rounded-lg bg-surface border border-warning/20 p-2 space-y-1.5"><div className="h-1 rounded bg-txt-ghost w-16" /><div className="flex gap-1 mt-1"><div className="h-3 rounded bg-success/20 flex-1" /><div className="h-3 rounded bg-danger/20 flex-1" /></div></div></div>),
    logs: (<div className="w-full max-w-[200px] space-y-0.5 font-mono opacity-50">{[80, 60, 90, 50].map((w, i) => (<div key={i} className="flex items-center gap-1"><div className="h-1 rounded bg-txt-ghost/50 w-6 shrink-0" /><div className="h-1 rounded bg-txt-ghost" style={{ width: w + '%' }} /></div>))}</div>),
    table: (<div className="w-full max-w-[180px] opacity-50"><div className="flex gap-0.5 mb-0.5">{[1, 1, 1].map((_, i) => <div key={i} className="h-2 rounded bg-txt-faint flex-1" />)}</div>{[0, 1].map((r) => (<div key={r} className="flex gap-0.5 mb-0.5">{[1, 1, 1].map((_, i) => <div key={i} className="h-2 rounded bg-surface flex-1" />)}</div>))}</div>),
    chart: (<div className="w-full max-w-[140px] flex items-end gap-1 h-10 opacity-50">{bar.map((h, i) => (<div key={i} className="flex-1 bg-accent/25 rounded-t" style={{ height: h + '%' }} />))}</div>),
    dashboard: (<div className="w-full max-w-[180px] grid grid-cols-3 gap-1 opacity-50">{['$4.2M', '23%', '47'].map((v, i) => (<div key={i} className="rounded-lg bg-surface p-1.5 text-center"><div className="text-[7px] text-txt-faint mb-0.5">metric</div><div className="text-[8px] text-txt-secondary font-medium">{v}</div></div>))}</div>),
    form: (<div className="w-full max-w-[140px] space-y-1.5 opacity-50"><div className="h-1 rounded bg-txt-ghost w-8" /><div className="h-4 rounded-md bg-surface border border-txt-ghost/50 w-full" /><div className="h-4 rounded-md bg-accent/20 w-12 mt-1" /></div>),
    cards: (<div className="w-full max-w-[140px] grid grid-cols-2 gap-1 opacity-50">{[0, 1, 2, 3].map((i) => (<div key={i} className="h-8 rounded-lg bg-surface border border-txt-ghost/50 p-1"><div className="h-1 rounded bg-txt-ghost w-full mb-0.5" /><div className="h-1 rounded bg-txt-ghost/50 w-2/3" /></div>))}</div>),
    markdown: (<div className="w-full max-w-[160px] space-y-1 opacity-50"><div className="h-2 rounded bg-txt-ghost w-1/3" /><div className="h-1 rounded bg-txt-ghost/50 w-full" /><div className="h-1 rounded bg-txt-ghost/50 w-4/5" /></div>),
    panel: (<div className="w-full max-w-[140px] opacity-50"><div className="h-12 rounded-lg bg-surface border border-txt-ghost/50 flex items-center justify-center"><div className="text-[8px] text-txt-faint">Content area</div></div></div>),
    traceViewer: (<div className="w-full max-w-[180px] space-y-1 opacity-50">{[100, 80, 60, 70].map((w, i) => (<div key={i} className="flex items-center gap-1" style={{ paddingLeft: i > 0 ? i * 6 : 0 }}><div className="w-1.5 h-1.5 rounded-full bg-accent/40" /><div className="h-1.5 rounded bg-txt-ghost" style={{ width: w + '%' }} /></div>))}</div>),
    feedback: (<div className="w-full max-w-[120px] flex items-center justify-center gap-3 opacity-50"><div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center text-[8px]">+</div><div className="w-6 h-6 rounded-full bg-danger/20 flex items-center justify-center text-[8px]">-</div></div>),
    dataset: (<div className="w-full max-w-[160px] opacity-50"><div className="flex gap-0.5 mb-0.5">{[1, 1, 1].map((_, i) => <div key={i} className="h-1.5 rounded bg-accent/30 flex-1" />)}</div>{[0, 1].map((r) => (<div key={r} className="flex gap-0.5 mb-0.5">{[1, 1, 1].map((_, i) => <div key={i} className="h-1.5 rounded bg-surface flex-1" />)}</div>))}</div>),
    annotationQueue: (<div className="w-full max-w-[140px] space-y-1 opacity-50">{[0, 1, 2].map((i) => (<div key={i} className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-surface"><div className="w-1.5 h-1.5 rounded bg-warning/50" /><div className="h-1 rounded bg-txt-ghost flex-1" /></div>))}</div>),
    reasoningChain: (<div className="w-full max-w-[140px] space-y-1 opacity-50">{[0, 1, 2].map((i) => (<div key={i} className="flex items-center gap-1"><div className="w-3 h-3 rounded-full border border-accent/30" /><div className="h-1 rounded bg-txt-ghost flex-1" /></div>))}</div>),
    subAgentTree: (<div className="w-full max-w-[140px] space-y-0.5 opacity-50"><div className="h-1.5 rounded bg-accent/30 w-1/2 mx-auto" /><div className="flex gap-2 justify-center"><div className="h-1.5 rounded bg-txt-ghost w-1/4" /><div className="h-1.5 rounded bg-txt-ghost w-1/4" /></div></div>),
    depthIndicator: (<div className="w-full max-w-[100px] opacity-50"><div className="h-2 rounded-full bg-surface w-full overflow-hidden"><div className="h-full rounded-full bg-accent/50 w-3/5" /></div><div className="text-[7px] text-txt-faint text-center mt-0.5">3/5</div></div>),
  };
  return p[type] || (<div className="text-2xs text-txt-faint opacity-50">Block content</div>);
};
