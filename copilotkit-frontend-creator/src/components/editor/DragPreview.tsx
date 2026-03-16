import React from 'react';
import type { BlockConfig } from '@/types/blocks';
import { getBlockDefinition } from '@/registry/block-registry';
import {
  MessageSquare, LayoutList, Wrench, ShieldCheck, ScrollText,
  Activity, FileInput, Table, BarChart3, LayoutDashboard,
  Layers, PanelTop, FileText, GripVertical,
} from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  MessageSquare, LayoutList, Wrench, ShieldCheck, ScrollText,
  Activity, FileInput, Table, BarChart3, LayoutDashboard,
  Layers, PanelTop, FileText,
};

export const DragPreview: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const def = getBlockDefinition(block.type);
  const Icon = def ? ICON_MAP[def.icon] || FileText : FileText;

  return (
    <div className="rounded-xl border-2 border-accent bg-surface-raised shadow-2xl shadow-accent/10
                    opacity-90 pointer-events-none w-64">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/40">
        <GripVertical size={14} className="text-accent" />
        <Icon size={14} className="text-accent" />
        <span className="text-xs font-medium text-txt-primary">{block.label}</span>
      </div>
      <div className="px-3 py-3 text-center">
        <div className="text-2xs text-txt-muted">{def?.description}</div>
      </div>
    </div>
  );
};
