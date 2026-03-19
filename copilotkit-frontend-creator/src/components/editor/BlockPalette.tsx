import React, { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { BLOCK_REGISTRY } from '@/registry/block-registry';
import { useWorkspaceStore } from '@/store/workspace-store';
import type { BlockType } from '@/types/blocks';
import {
  MessageSquare, LayoutList, Wrench, ShieldCheck, ScrollText,
  Activity, FileInput, Table, BarChart3, LayoutDashboard,
  Layers, PanelTop, FileText, X, Plus, Search, Grid3X3, List,
  GitBranch, ThumbsUp, Database, ClipboardList,
  Brain, Network, Gauge, GripVertical, ChevronDown, ChevronRight,
} from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  MessageSquare, LayoutList, Wrench, ShieldCheck, ScrollText,
  Activity, FileInput, Table, BarChart3, LayoutDashboard,
  Layers, PanelTop, FileText,
  GitBranch, ThumbsUp, Database, ClipboardList,
  Brain, Network, Gauge,
};

// Category definitions
const CATEGORIES = [
  { id: 'core', label: 'Core Blocks', types: ['chat','results','toolActivity','approvals','logs','status','form','table','chart','dashboard','cards','panel','markdown'] },
  { id: 'langsmith', label: 'LangSmith', types: ['traceViewer','feedback','dataset','annotationQueue'] },
  { id: 'deepagent', label: 'Deep Agent', types: ['reasoningChain','subAgentTree','depthIndicator'] },
] as const;

interface Props { onClose?: () => void; }

export const BlockPalette: React.FC<Props> = ({ onClose }) => {
  const addBlock = useWorkspaceStore((s) => s.addBlock);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search.trim()) return BLOCK_REGISTRY;
    const q = search.toLowerCase();
    return BLOCK_REGISTRY.filter(
      (d) => d.label.toLowerCase().includes(q) || d.description.toLowerCase().includes(q)
    );
  }, [search]);

  const toggleCategory = (id: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const isSearching = search.trim().length > 0;

  return (
    <aside className="h-full bg-surface-raised border-r border-border flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider">Blocks</h2>
        <div className="flex items-center gap-1">
          <button onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            className="p-1.5 text-txt-muted hover:text-accent rounded-lg hover:bg-accent-soft transition-colors" title="Toggle view">
            {viewMode === 'list' ? <Grid3X3 size={13} /> : <List size={13} />}
          </button>
          {onClose && (
            <button onClick={onClose} className="lg:hidden p-1 text-txt-muted hover:text-txt-primary"><X size={16} /></button>
          )}
        </div>
      </div>

      <div className="px-2.5 pt-2.5">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-txt-faint" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blocks..." className="ck-input text-xs pl-8 py-1.5" />
        </div>
        <p className="text-[9px] text-txt-ghost mt-1.5 px-1">Drag blocks onto the canvas or click to add</p>
      </div>

      <div className="flex-1 overflow-y-auto pb-2">
        {filtered.length === 0 && (
          <p className="text-2xs text-txt-faint text-center py-8">No blocks match &quot;{search}&quot;</p>
        )}

        {isSearching ? (
          /* Flat list when searching */
          <div className={`p-2.5 ${viewMode === 'grid' ? 'grid grid-cols-2 gap-2 auto-rows-min content-start' : 'space-y-0.5'}`}>
            {filtered.map((def) => (
              <PaletteItem key={def.type} def={def} viewMode={viewMode} onAdd={() => { addBlock(def.type as BlockType); onClose?.(); }} />
            ))}
          </div>
        ) : (
          /* Categorized list */
          CATEGORIES.map((cat) => {
            const items = filtered.filter(d => (cat.types as readonly string[]).includes(d.type));
            if (items.length === 0) return null;
            const isCollapsed = collapsedCategories.has(cat.id);
            return (
              <div key={cat.id}>
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="palette-category-header w-full flex items-center gap-2 px-4 py-2 text-2xs font-semibold text-txt-muted uppercase tracking-wider hover:text-txt-secondary transition-colors bg-surface-raised/80"
                >
                  {isCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                  {cat.label}
                  <span className="text-txt-ghost font-normal ml-auto">{items.length}</span>
                </button>
                {!isCollapsed && (
                  <div className={`px-2.5 pb-1 ${viewMode === 'grid' ? 'grid grid-cols-2 gap-2 auto-rows-min content-start' : 'space-y-0.5'}`}>
                    {items.map((def) => (
                      <PaletteItem key={def.type} def={def} viewMode={viewMode} onAdd={() => { addBlock(def.type as BlockType); onClose?.(); }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};

// Individual palette item — draggable + clickable
const PaletteItem: React.FC<{
  def: (typeof BLOCK_REGISTRY)[number];
  viewMode: 'list' | 'grid';
  onAdd: () => void;
}> = ({ def, viewMode, onAdd }) => {
  const Icon = ICON_MAP[def.icon] || FileText;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${def.type}`,
    data: { fromPalette: true, blockType: def.type },
  });

  if (viewMode === 'grid') {
    return (
      <div
        ref={setNodeRef}
        className={`palette-draggable flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border
                    hover:border-accent/50 hover:bg-accent-soft transition-all group cursor-grab active:cursor-grabbing
                    ${isDragging ? 'opacity-40 scale-95' : ''}`}
        onClick={onAdd}
        {...attributes}
        {...listeners}
      >
        <BlockThumbnail type={def.type} Icon={Icon} />
        <span className="text-[10px] text-txt-secondary text-center leading-tight">{def.label}</span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`palette-draggable flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left
                  hover:bg-accent-soft transition-all group cursor-grab active:cursor-grabbing
                  ${isDragging ? 'opacity-40 scale-95' : ''}`}
      onClick={onAdd}
      {...attributes}
      {...listeners}
    >
      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
        <Icon size={15} className="text-accent" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-txt-primary leading-tight">{def.label}</div>
        <div className="text-2xs text-txt-muted leading-tight mt-0.5 truncate">{def.description}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <GripVertical size={12} className="text-txt-ghost group-hover:text-txt-faint transition-colors" />
      </div>
    </div>
  );
};

const BlockThumbnail: React.FC<{ type: string; Icon: React.FC<{ size?: number; className?: string }> }> = ({ type, Icon }) => {
  const thumbnails: Record<string, React.ReactNode> = {
    chat: (<div className="w-full space-y-1"><div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-accent/40" /><div className="h-2 rounded bg-accent/20 flex-1" /></div><div className="flex gap-1 justify-end"><div className="h-2 rounded bg-txt-ghost w-3/4" /><div className="w-2 h-2 rounded-full bg-txt-faint" /></div></div>),
    status: (<div className="w-full space-y-1.5"><div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-success" /><div className="h-1.5 rounded bg-txt-ghost w-1/2" /></div><div className="h-1.5 rounded-full bg-surface w-full"><div className="h-1.5 rounded-full bg-accent/50 w-3/4" /></div></div>),
    results: (<div className="w-full space-y-1"><div className="h-2 rounded bg-txt-ghost/60 w-full" /><div className="h-2 rounded bg-txt-ghost/40 w-4/5" /><div className="h-2 rounded bg-txt-ghost/30 w-3/5" /></div>),
    table: (<div className="w-full space-y-0.5"><div className="flex gap-0.5"><div className="h-1.5 rounded bg-txt-faint flex-1" /><div className="h-1.5 rounded bg-txt-faint flex-1" /><div className="h-1.5 rounded bg-txt-faint flex-1" /></div><div className="flex gap-0.5"><div className="h-1.5 rounded bg-surface flex-1" /><div className="h-1.5 rounded bg-surface flex-1" /><div className="h-1.5 rounded bg-surface flex-1" /></div></div>),
    chart: (<div className="w-full flex items-end gap-0.5 h-6"><div className="flex-1 bg-accent/30 rounded-t" style={{ height: '60%' }} /><div className="flex-1 bg-accent/50 rounded-t" style={{ height: '100%' }} /><div className="flex-1 bg-accent/40 rounded-t" style={{ height: '40%' }} /><div className="flex-1 bg-accent/60 rounded-t" style={{ height: '80%' }} /></div>),
    dashboard: (<div className="w-full grid grid-cols-2 gap-0.5"><div className="h-3 rounded bg-txt-ghost/50" /><div className="h-3 rounded bg-txt-ghost/50" /><div className="h-3 rounded bg-txt-ghost/50" /><div className="h-3 rounded bg-txt-ghost/50" /></div>),
  };
  return (
    <div className="w-full h-10 rounded-lg bg-surface p-1.5 flex items-center justify-center overflow-hidden">
      {thumbnails[type] || <Icon size={16} className="text-accent/50" />}
    </div>
  );
};
