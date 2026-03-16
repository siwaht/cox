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
