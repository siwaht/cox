import React, { useState, useMemo } from 'react';
import { BLOCK_REGISTRY } from '@/registry/block-registry';
import { useWorkspaceStore } from '@/store/workspace-store';
import type { BlockType } from '@/types/blocks';
import {
  MessageSquare, LayoutList, Wrench, ShieldCheck, ScrollText,
  Activity, FileInput, Table, BarChart3, LayoutDashboard,
  Layers, PanelTop, FileText, X, Plus, Search, Grid3X3, List,
} from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  MessageSquare, LayoutList, Wrench, ShieldCheck, ScrollText,
  Activity, FileInput, Table, BarChart3, LayoutDaC:\Users\asif6\Documents\makeshboard,
  Layers, PanelTop, FileText,
};

interface Props {
  onClose?: () => void;
}

export const BlockPalette: React.FC<Props> = ({ onClose }) => {
  const addBlock = useWorkspaceStore((s) => s.addBlock);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const filtered = useMemo(() => {
    if (!search.trim()) return BLOCK_REGISTRY;
    const q = search.toLowerCase();
    return BLOCK_REGISTRY.filter(
      (d) => d.label.toLowerCase().includes(q) || d.description.toLowerCase().includes(q) || d.type.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <aside className="h-full bg-surface-raised border-r border-border flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider">
          Add Blocks
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            className="p-1 text-txt-muted hover:text-accent rounded" title="Toggle view">
            {viewMode === 'list' ? <Grid3X3 size={13} /> : <List size={13} />}
          </button>
          {onClose && (
            <button onClick={onClose} className="lg:hidden p-1 text-txt-muted hover:text-txt-primary">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-2.5 pt-2.5">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-txt-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter blocks..."
            className="ck-input text-xs pl-8 py-1.5"
          />
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto p-2.5 ${viewMode === 'grid' ? 'grid grid-cols-2 gap-2 auto-rows-min content-start' : 'space-y-1'}`}>
        {filtered.length === 0 && (
          <p className="text-2xs text-txt-faint text-center py-4 col-span-2">No blocks match "{search}"</p>
        )}
        {filtered.map((def) => {
          const Icon = ICON_MAP[def.icon] || FileText;
          if (viewMode === 'grid') {
            return (
              <button
                key={def.type}
                onClick={() => { addBlock(def.type as BlockType); onClose?.(); }}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border
                           hover:border-accent/50 hover:bg-accent-soft transition-all group active:scale-[0.97]"
              >
                <BlockThumbnail type={def.type} Icon={Icon} />
                <span className="text-[10px] text-txt-secondary text-center leading-tight">{def.label}</span>
              </button>
            );
          }
          return (
            <button
              key={def.type}
              onClick={() => { addBlock(def.type as BlockType); onClose?.(); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left
                         hover:bg-accent-soft transition-all group active:scale-[0.98]"
            >
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0
                              group-hover:bg-accent/20 transition-colors">
                <Icon size={15} className="text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-txt-primary leading-tight">{def.label}</div>
                <div className="text-2xs text-txt-muted leading-tight mt-0.5 truncate">
                  {def.description}
                </div>
              </div>
              <Plus size={14} className="text-txt-faint group-hover:text-accent shrink-0 transition-colors" />
            </button>
          );
        })}
      </div>
    </aside>
  );
};

// Mini thumbnail previews for grid view
const BlockThumbnail: React.FC<{ type: string; Icon: React.FC<{ size?: number; className?: string }> }> = ({ type, Icon }) => {
  const thumbnails: Record<string, React.ReactNode> = {
    chat: (
      <div className="w-full space-y-1">
        <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-accent/40" /><div className="h-2 rounded bg-accent/20 flex-1" /></div>
        <div className="flex gap-1 justify-end"><div className="h-2 rounded bg-txt-ghost w-3/4" /><div className="w-2 h-2 rounded-full bg-txt-faint" /></div>
        <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-accent/40" /><div className="h-2 rounded bg-accent/20 w-2/3" /></div>
      </div>
    ),
    status: (
      <div className="w-full space-y-1.5">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-success" /><div className="h-1.5 rounded bg-txt-ghost w-1/2" /></div>
        <div className="h-1.5 rounded-full bg-surface w-full"><div className="h-1.5 rounded-full bg-accent/50 w-3/4" /></div>
      </div>
    ),
    results: (
      <div className="w-full space-y-1">
        <div className="h-2 rounded bg-txt-ghost/60 w-full" />
        <div className="h-2 rounded bg-txt-ghost/40 w-4/5" />
        <div className="h-2 rounded bg-txt-ghost/30 w-3/5" />
      </div>
    ),
    toolActivity: (
      <div className="w-full space-y-1">
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-success" /><div className="h-1.5 rounded bg-txt-ghost flex-1" /></div>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-success" /><div className="h-1.5 rounded bg-txt-ghost flex-1" /></div>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /><div className="h-1.5 rounded bg-txt-ghost w-2/3" /></div>
      </div>
    ),
    table: (
      <div className="w-full space-y-0.5">
        <div className="flex gap-0.5"><div className="h-1.5 rounded bg-txt-faint flex-1" /><div className="h-1.5 rounded bg-txt-faint flex-1" /><div className="h-1.5 rounded bg-txt-faint flex-1" /></div>
        <div className="flex gap-0.5"><div className="h-1.5 rounded bg-surface flex-1" /><div className="h-1.5 rounded bg-surface flex-1" /><div className="h-1.5 rounded bg-surface flex-1" /></div>
        <div className="flex gap-0.5"><div className="h-1.5 rounded bg-surface flex-1" /><div className="h-1.5 rounded bg-surface flex-1" /><div className="h-1.5 rounded bg-surface flex-1" /></div>
      </div>
    ),
    chart: (
      <div className="w-full flex items-end gap-0.5 h-6">
        <div className="flex-1 bg-accent/30 rounded-t" style={{ height: '60%' }} />
        <div className="flex-1 bg-accent/50 rounded-t" style={{ height: '100%' }} />
        <div className="flex-1 bg-accent/40 rounded-t" style={{ height: '40%' }} />
        <div className="flex-1 bg-accent/60 rounded-t" style={{ height: '80%' }} />
      </div>
    ),
    dashboard: (
      <div className="w-full grid grid-cols-2 gap-0.5">
        <div className="h-3 rounded bg-txt-ghost/50 flex items-center justify-center"><span className="text-[5px] text-txt-muted">42</span></div>
        <div className="h-3 rounded bg-txt-ghost/50 flex items-center justify-center"><span className="text-[5px] text-txt-muted">18%</span></div>
        <div className="h-3 rounded bg-txt-ghost/50" /><div className="h-3 rounded bg-txt-ghost/50" />
      </div>
    ),
  };

  return (
    <div className="w-full h-10 rounded-lg bg-surface p-1.5 flex items-center justify-center overflow-hidden">
      {thumbnails[type] || <Icon size={16} className="text-accent/50" />}
    </div>
  );
};
