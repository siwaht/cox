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
  Activity, FileInput, Table, BarChart3, LayoutDashboard,
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
            <button onClick={onClose} className="p-1 text-txt-muted hover:text-accent rounded">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-txt-faint" />
          <input
            type="text"
            placeholder="Filter blocks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 text-xs bg-surface border border-border rounded-lg
                       text-txt-primary placeholder:text-txt-faint focus:outline-none focus:border-accent/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <p className="text-xs text-txt-faint text-center py-6">No blocks match your search.</p>
        ) : viewMode === 'list' ? (
          <div className="space-y-1">
            {filtered.map((def) => {
              const Icon = ICON_MAP[def.icon] || Plus;
              return (
                <button
                  key={def.type}
                  onClick={() => addBlock(def.type as BlockType)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent-soft
                             text-left transition-colors group"
                >
                  <div className="w-7 h-7 rounded-md bg-accent/10 flex items-center justify-center shrink-0
                                  group-hover:bg-accent/20 transition-colors">
                    <Icon size={13} className="text-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-txt-primary truncate">{def.label}</div>
                    <div className="text-2xs text-txt-muted truncate">{def.description}</div>
                  </div>
                  <Plus size={12} className="text-txt-faint group-hover:text-accent transition-colors shrink-0" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {filtered.map((def) => {
              const Icon = ICON_MAP[def.icon] || Plus;
              return (
                <button
                  key={def.type}
                  onClick={() => addBlock(def.type as BlockType)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border
                             hover:border-accent/50 hover:bg-accent-soft transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center
                                  group-hover:bg-accent/20 transition-colors">
                    <Icon size={15} className="text-accent" />
                  </div>
                  <span className="text-2xs font-medium text-txt-primary text-center leading-tight">{def.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
