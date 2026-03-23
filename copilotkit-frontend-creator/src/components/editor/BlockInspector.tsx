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
  const { workspace, updateBlock, resizeBlock, duplicateBlock, selectedBlockIds, removeSelected, duplicateSelected } = useWorkspaceStore();
  const block = workspace.blocks.find((b) => b.id === selectedBlockId);
  const multiCount = selectedBlockIds.size;

  const moveBlockOrder = (id: string, direction: -1 | 1) => {
    const block = workspace.blocks.find((b) => b.id === id);
    if (!block) return;
    // Move the block up or down by one row on the grid
    const newY = Math.max(0, block.y + direction);
    useWorkspaceStore.getState().moveBlock(id, block.x, newY);
  };

  const copyBlockCode = (b: BlockConfig) => {
    const tag = b.type.charAt(0).toUpperCase() + b.type.slice(1) + 'Block';
    const code = `<${tag} label="${b.label}" w={${b.w}} h={${b.h}} />`;
    navigator.clipboard.writeText(code);
  };

  return (
    <aside className="h-full border-l border-white/5 flex flex-col relative z-10" style={{ background: 'linear-gradient(180deg, var(--color-surface-raised) 0%, color-mix(in srgb, var(--color-surface-raised) 80%, transparent) 100%)', backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)' }} role="complementary" aria-label="Block properties">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/40">
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
        {/* Multi-select batch actions */}
        {multiCount > 1 && (
          <div className="mb-4 p-3 rounded-xl bg-accent/5 border border-accent/20 animate-fade-in">
            <div className="text-xs text-accent font-medium mb-2">{multiCount} blocks selected</div>
            <div className="flex gap-1.5">
              <button onClick={duplicateSelected}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-2xs text-accent
                           rounded-lg border border-accent/30 hover:bg-accent/10 transition-colors">
                <Copy size={11} /> Duplicate All
              </button>
              <button onClick={removeSelected}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-2xs text-danger
                           rounded-lg border border-danger/30 hover:bg-danger-soft transition-colors">
                <X size={11} /> Remove All
              </button>
            </div>
          </div>
        )}

        {/* Block selector */}
        <div className="mb-4">
          <label className="text-2xs text-txt-muted block mb-1.5">Select Block</label>
          <select value={selectedBlockId || ''} onChange={(e) => onSelectBlock(e.target.value || null)} className="ck-input text-xs" aria-label="Select a block">
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
              <button onClick={() => moveBlockOrder(block.id, -1)}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-2xs text-txt-muted
                           hover:text-txt-secondary rounded-lg border border-border hover:border-txt-faint transition-colors"
                title="Move up">
                <ChevronUp size={11} /> Up
              </button>
              <button onClick={() => moveBlockOrder(block.id, 1)}
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
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer text-2xs transition-all ${
                      b.id === selectedBlockId ? 'bg-accent/10 text-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-inset ring-accent/20' : 'text-txt-muted hover:bg-accent/5 hover:text-txt-secondary hover:shadow-[0_2px_8px_rgba(139,92,246,0.05)]'
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

      {/* Position */}
      <Field label={`Position — col ${block.x + 1}, row ${block.y + 1}`}>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[9px] text-txt-ghost block mb-0.5">Column (0–{12 - block.w})</label>
            <input type="number" min={0} max={12 - block.w} value={block.x}
              onChange={(e) => {
                const v = Math.max(0, Math.min(12 - block.w, Number(e.target.value)));
                useWorkspaceStore.getState().moveBlock(block.id, v, block.y);
              }}
              className="ck-input text-xs" />
          </div>
          <div className="flex-1">
            <label className="text-[9px] text-txt-ghost block mb-0.5">Row (0+)</label>
            <input type="number" min={0} value={block.y}
              onChange={(e) => {
                const v = Math.max(0, Number(e.target.value));
                useWorkspaceStore.getState().moveBlock(block.id, block.x, v);
              }}
              className="ck-input text-xs" />
          </div>
        </div>
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

      <Field label="Collapsed">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <div onClick={() => onUpdate(block.id, { collapsed: !block.collapsed })}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
              block.collapsed ? 'bg-accent' : 'bg-txt-ghost'
            }`}>
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              block.collapsed ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </div>
          <span className="text-xs text-txt-secondary">{block.collapsed ? 'Collapsed' : 'Expanded'}</span>
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
