import React, { useState } from 'react';
import { useWorkspaceStore } from '@/store/workspace-store';
import type { BlockConfig } from '@/types/blocks';
import { X, ChevronUp, ChevronDown, Copy, Code2, Palette } from 'lucide-react';

interface Props {
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onOpenTheme?: () => void;
}

export const BlockInspector: React.FC<Props> = ({ selectedBlockId, onSelectBlock, onOpenTheme }) => {
  const { workspace, updateBlock, resizeBlock, reorderBlocks, duplicateBlock } = useWorkspaceStore();
  const block = workspace.blocks.find((b) => b.id === selectedBlockId);

  const moveBlock = (id: string, direction: -1 | 1) => {
    const ids = workspace.blocks.map((b) => b.id);
    const idx = ids.indexOf(id);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= ids.length) return;
    const newIds = [...ids];
    [newIds[idx], newIds[newIdx]] = [newIds[newIdx], newIds[idx]];
    reorderBlocks(newIds);
  };

  const copyBlockCode = (b: BlockConfig) => {
    const tag = b.type.charAt(0).toUpperCase() + b.type.slice(1) + 'Block';
    const code = `<${tag} label="${b.label}" w={${b.w}} h={${b.h}} />`;
    navigator.clipboard.writeText(code);
  };

  return (
    <aside className="h-full bg-surface-raised border-l border-border flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider">Properties</h2>
        <div className="flex items-center gap-1">
          {onOpenTheme && (
            <button onClick={onOpenTheme} className="hidden lg:block p-1 text-txt-muted hover:text-accent rounded-lg hover:bg-accent-soft" title="Theme settings">
              <Palette size={14} />
            </button>
          )}
          <button onClick={() => onSelectBlock(null)} className="lg:hidden p-1 text-txt-muted hover:text-txt-primary">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Block selector */}
        <div className="mb-4">
          <label className="text-2xs text-txt-muted block mb-1.5">Select Block</label>
          <select value={selectedBlockId || ''} onChange={(e) => onSelectBlock(e.target.value || null)} className="ck-input text-xs">
            <option value="">— Choose a block —</option>
            {workspace.blocks.map((b) => (
              <option key={b.id} value={b.id}>{b.label} ({b.type})</option>
            ))}
          </select>
        </div>

        {block ? (
          <>
            <BlockProperties block={block} onUpdate={updateBlock} onResize={resizeBlock} />

            {/* Quick actions */}
            <div className="flex gap-1.5 mt-4 pt-4 border-t border-border">
              <button onClick={() => moveBlock(block.id, -1)}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-2xs text-txt-muted
                           hover:text-txt-secondary rounded-lg border border-border hover:border-txt-faint transition-colors"
                title="Move up">
                <ChevronUp size={11} /> Up
              </button>
              <button onClick={() => moveBlock(block.id, 1)}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-2xs text-txt-muted
                           hover:text-txt-secondary rounded-lg border border-border hover:border-txt-faint transition-colors"
                title="Move down">
                <ChevronDown size={11} /> Down
              </button>
              <button onClick={() => duplicateBlock(block.id)}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-2xs text-txt-muted
                           hover:text-txt-secondary rounded-lg border border-border hover:border-txt-faint transition-colors"
                title="Duplicate">
                <Copy size={11} /> Clone
              </button>
              <button onClick={() => copyBlockCode(block)}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-2xs text-txt-muted
                           hover:text-txt-secondary rounded-lg border border-border hover:border-txt-faint transition-colors"
                title="Copy as JSX">
                <Code2 size={11} /> JSX
              </button>
            </div>

            {/* Block order list */}
            <div className="mt-4 pt-4 border-t border-border">
              <label className="text-2xs text-txt-muted block mb-2 font-medium">Block Order</label>
              <div className="space-y-1">
                {workspace.blocks.map((b) => (
                  <div key={b.id}
                    onClick={() => onSelectBlock(b.id)}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer text-2xs transition-colors ${
                      b.id === selectedBlockId ? 'bg-accent-soft text-accent' : 'text-txt-muted hover:bg-surface-overlay hover:text-txt-secondary'
                    }`}>
                    <span className="truncate">{b.label}</span>
                    <span className="text-txt-ghost shrink-0 ml-2">{b.w}/12</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-txt-faint text-xs text-center mt-8 leading-relaxed">
            Select a block on the canvas<br />to edit its properties
          </div>
        )}
      </div>
    </aside>
  );
};

// Column presets: value = number of columns out of 12
const WIDTH_PRESETS = [
  { label: 'Full', w: 12, perRow: '1' },
  { label: '1/2', w: 6, perRow: '2' },
  { label: '1/3', w: 4, perRow: '3' },
  { label: '1/4', w: 3, perRow: '4' },
  { label: '1/5', w: 2, perRow: '5–6' },
] as const;

const HEIGHT_PRESETS = [
  { label: 'XS', h: 1 },
  { label: 'S', h: 2 },
  { label: 'M', h: 3 },
  { label: 'L', h: 5 },
  { label: 'XL', h: 8 },
] as const;

const BlockProperties: React.FC<{
  block: BlockConfig;
  onUpdate: (id: string, patch: Partial<BlockConfig>) => void;
  onResize: (id: string, w: number, h: number) => void;
}> = ({ block, onUpdate, onResize }) => {
  const [showRawJson, setShowRawJson] = useState(false);
  const blocksPerRow = Math.floor(12 / block.w);

  return (
    <div className="space-y-4 animate-fade-in">
      <Field label="Label">
        <input type="text" value={block.label}
          onChange={(e) => onUpdate(block.id, { label: e.target.value })} className="ck-input text-xs" />
      </Field>

      {/* Width — column presets */}
      <Field label={`Width — ${block.w}/12 cols · ${blocksPerRow} per row`}>
        <div className="flex gap-1 mb-2">
          {WIDTH_PRESETS.map((p) => (
            <button key={p.w}
              onClick={() => onResize(block.id, p.w, block.h)}
              className={`flex-1 py-1.5 rounded-lg text-2xs font-medium transition-colors ${
                block.w === p.w
                  ? 'bg-accent text-white'
                  : 'bg-surface-overlay text-txt-muted hover:text-txt-secondary hover:bg-surface'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {/* Fine-tune slider */}
        <input type="range" min={2} max={12} value={block.w}
          onChange={(e) => onResize(block.id, Number(e.target.value), block.h)}
          className="w-full accent-accent h-1.5 cursor-pointer" />
        {/* 12-column visual grid */}
        <div className="flex gap-px mt-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i}
              className={`h-2.5 flex-1 rounded-sm transition-colors ${
                i < block.w ? 'bg-accent/60' : 'bg-surface-overlay'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between text-2xs text-txt-ghost mt-1">
          <span>2 cols</span>
          <span>{blocksPerRow} blocks fit per row</span>
          <span>12 cols</span>
        </div>
      </Field>

      {/* Height — named presets + slider */}
      <Field label={`Height — ${block.h} row${block.h > 1 ? 's' : ''}`}>
        <div className="flex gap-1 mb-2">
          {HEIGHT_PRESETS.map((p) => (
            <button key={p.h}
              onClick={() => onResize(block.id, block.w, p.h)}
              className={`flex-1 py-1.5 rounded-lg text-2xs font-medium transition-colors ${
                block.h === p.h
                  ? 'bg-accent text-white'
                  : 'bg-surface-overlay text-txt-muted hover:text-txt-secondary hover:bg-surface'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <input type="range" min={1} max={8} value={block.h}
          onChange={(e) => onResize(block.id, block.w, Number(e.target.value))}
          className="w-full accent-accent h-1.5 cursor-pointer" />
        {/* Height visual bar */}
        <div className="flex gap-px mt-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}
              className={`h-2.5 flex-1 rounded-sm transition-colors ${
                i < block.h ? 'bg-accent/40' : 'bg-surface-overlay'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between text-2xs text-txt-ghost mt-1">
          <span>1 row</span><span>8 rows</span>
        </div>
      </Field>

      <Field label="Visibility">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <div onClick={() => onUpdate(block.id, { visible: !block.visible })}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
              block.visible ? 'bg-accent' : 'bg-txt-ghost'
            }`}>
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              block.visible ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </div>
          <span className="text-xs text-txt-secondary">{block.visible ? 'Visible' : 'Hidden'}</span>
        </label>
      </Field>

      {/* Friendly block-specific settings */}
      <FriendlyBlockProps block={block} onUpdate={onUpdate} />

      {/* Raw JSON toggle for power users */}
      <div>
        <button
          onClick={() => setShowRawJson(!showRawJson)}
          className="text-2xs text-txt-faint hover:text-txt-secondary transition-colors"
        >
          {showRawJson ? '▾ Hide' : '▸ Show'} advanced (JSON)
        </button>
        {showRawJson && (
          <textarea value={JSON.stringify(block.props, null, 2)}
            onChange={(e) => { try { onUpdate(block.id, { props: JSON.parse(e.target.value) }); } catch { /* invalid */ } }}
            rows={4} className="ck-input text-2xs font-mono resize-none leading-relaxed mt-1.5" />
        )}
      </div>
    </div>
  );
};

// Friendly per-block-type settings
const FriendlyBlockProps: React.FC<{
  block: BlockConfig;
  onUpdate: (id: string, patch: Partial<BlockConfig>) => void;
}> = ({ block, onUpdate }) => {
  const updateProp = (key: string, value: unknown) => {
    onUpdate(block.id, { props: { ...block.props, [key]: value } });
  };

  switch (block.type) {
    case 'chat':
      return (
        <>
          <ToggleField label="Show avatars" checked={!!block.props.showAvatars} onChange={(v) => updateProp('showAvatars', v)} />
          <ToggleField label="Show timestamps" checked={!!block.props.showTimestamps} onChange={(v) => updateProp('showTimestamps', v)} />
        </>
      );
    case 'toolActivity':
      return (
        <>
          <ToggleField label="Show arguments" checked={!!block.props.showArgs} onChange={(v) => updateProp('showArgs', v)} />
          <ToggleField label="Show results" checked={!!block.props.showResults} onChange={(v) => updateProp('showResults', v)} />
        </>
      );
    case 'logs':
      return (
        <>
          <ToggleField label="Auto-scroll" checked={!!block.props.autoScroll} onChange={(v) => updateProp('autoScroll', v)} />
          <Field label="Log level">
            <select value={(block.props.level as string) || 'info'} onChange={(e) => updateProp('level', e.target.value)} className="ck-input text-xs">
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
            </select>
          </Field>
        </>
      );
    case 'table':
      return (
        <ToggleField label="Pagination" checked={!!block.props.pagination} onChange={(v) => updateProp('pagination', v)} />
      );
    case 'chart':
      return (
        <Field label="Chart type">
          <select value={(block.props.chartType as string) || 'bar'} onChange={(e) => updateProp('chartType', e.target.value)} className="ck-input text-xs">
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="pie">Pie</option>
          </select>
        </Field>
      );
    case 'panel':
      return (
        <Field label="Panel title">
          <input type="text" value={(block.props.title as string) || ''} onChange={(e) => updateProp('title', e.target.value)} className="ck-input text-xs" placeholder="Panel" />
        </Field>
      );
    case 'markdown':
      return (
        <Field label="Content">
          <textarea value={(block.props.content as string) || ''} onChange={(e) => updateProp('content', e.target.value)}
            rows={3} className="ck-input text-2xs resize-none leading-relaxed" placeholder="# Heading\n\nYour markdown here..." />
        </Field>
      );
    default:
      return null;
  }
};

const ToggleField: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
  <label className="flex items-center justify-between cursor-pointer group">
    <span className="text-2xs text-txt-muted font-medium">{label}</span>
    <div onClick={() => onChange(!checked)}
      className={`relative w-8 h-4.5 rounded-full transition-colors cursor-pointer ${
        checked ? 'bg-accent' : 'bg-txt-ghost'
      }`}
      style={{ width: '32px', height: '18px' }}>
      <div className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${
        checked ? 'translate-x-[14px]' : 'translate-x-0'
      }`} />
    </div>
  </label>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="text-2xs text-txt-muted block mb-1.5 font-medium">{label}</label>
    {children}
  </div>
);
