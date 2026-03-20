import React from 'react';
import type { BlockConfig } from '@/types/blocks';
import { getBlockDefinition } from '@/registry/block-registry';
import {
  MessageSquare, LayoutList, Wrench, ShieldCheck, ScrollText,
  Activity, FileInput, Table, BarChart3, LayoutDashboard,
  Layers, PanelTop, FileText, GripVertical,
  GitBranch, ThumbsUp, Database, ClipboardList,
  Brain, Network, Gauge, ArrowDown,
} from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  MessageSquare, LayoutList, Wrench, ShieldCheck, ScrollText,
  Activity, FileInput, Table, BarChart3, LayoutDashboard,
  Layers, PanelTop, FileText,
  GitBranch, ThumbsUp, Database, ClipboardList,
  Brain, Network, Gauge,
};

/** Preview shown while dragging an existing block on the canvas */
export const DragPreview: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const def = getBlockDefinition(block.type);
  const Icon = def ? ICON_MAP[def.icon] || FileText : FileText;

  return (
    <div className="drag-preview-card rounded-xl border-2 border-accent bg-surface-raised pointer-events-none w-56">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-accent/20">
        <GripVertical size={12} className="text-accent" />
        <Icon size={14} className="text-accent" />
        <span className="text-xs font-medium text-txt-primary truncate">{block.label}</span>
        <span className="text-[9px] text-accent/60 ml-auto shrink-0 tabular-nums">{block.w}×{block.h}</span>
      </div>
      <div className="px-3 py-2">
        <div className="text-2xs text-txt-muted leading-relaxed">{def?.description}</div>
      </div>
    </div>
  );
};

/** Preview shown while dragging a new block from the palette */
export const PaletteDragPreview: React.FC<{ blockType: string }> = ({ blockType }) => {
  const def = getBlockDefinition(blockType);
  if (!def) return null;
  const Icon = ICON_MAP[def.icon] || FileText;

  return (
    <div className="drag-preview-card rounded-xl border-2 border-accent bg-surface-raised pointer-events-none w-52">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
          <Icon size={16} className="text-accent" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-txt-primary">{def.label}</div>
          <div className="text-[9px] text-txt-muted mt-0.5 truncate">{def.description}</div>
        </div>
      </div>
      <div className="px-3 pb-2">
        <div className="flex items-center gap-1.5 text-[9px] text-accent/70">
          <ArrowDown size={10} className="animate-bounce" />
          Drop to add · {def.defaultW}/12 cols · {def.defaultH} row{def.defaultH > 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
};
