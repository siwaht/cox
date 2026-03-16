import React from 'react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { DEFAULT_THEME } from '@/types/workspace';
import type { ThemeConfig } from '@/types/workspace';
import { Palette, RotateCcw, X } from 'lucide-react';

const ACCENT_PRESETS = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Violet', value: '#8b5cf6' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Orange', value: '#f97316' },
];

const RADIUS_OPTIONS: { label: string; value: ThemeConfig['borderRadius'] }[] = [
  { label: 'None', value: 'none' },
  { label: 'Small', value: 'sm' },
  { label: 'Medium', value: 'md' },
  { label: 'Large', value: 'lg' },
  { label: 'XL', value: 'xl' },
];

const FONT_OPTIONS: { label: string; value: ThemeConfig['fontFamily'] }[] = [
  { label: 'System', value: 'system' },
  { label: 'Inter', value: 'inter' },
  { label: 'Mono', value: 'mono' },
];

interface Props {
  onClose: () => void;
}

export const ThemePanel: React.FC<Props> = ({ onClose }) => {
  const { workspace, updateWorkspace } = useWorkspaceStore();
  const theme = workspace.customTheme || DEFAULT_THEME;

  const update = (patch: Partial<ThemeConfig>) => {
    updateWorkspace({ customTheme: { ...theme, ...patch } });
  };

  const reset = () => {
    updateWorkspace({ customTheme: { ...DEFAULT_THEME } });
  };

  return (
    <div className="h-full bg-surface-raised border-l border-border flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Palette size={14} className="text-accent" />
          <h2 className="text-xs font-semibold text-txt-secondary uppercase tracking-wider">Theme</h2>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={reset} className="p-1.5 text-txt-muted hover:text-accent rounded-lg hover:bg-accent-soft" title="Reset to defaults">
            <RotateCcw size={13} />
          </button>
          <button onClick={onClose} className="p-1.5 text-txt-muted hover:text-txt-primary rounded-lg hover:bg-surface-overlay">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Accent color */}
        <div>
          <label className="text-[10px] text-txt-muted uppercase tracking-wider block mb-2">Accent Color</label>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {ACCENT_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => update({ accentColor: p.value })}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                  theme.accentColor === p.value ? 'border-accent bg-accent-soft' : 'border-border hover:border-txt-faint'
                }`}
              >
                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: p.value }} />
                <span className="text-[9px] text-txt-muted">{p.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.accentColor}
              onChange={(e) => update({ accentColor: e.target.value })}
              className="w-8 h-8 rounded-lg border border-border cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={theme.accentColor}
              onChange={(e) => update({ accentColor: e.target.value })}
              className="ck-input text-xs font-mono flex-1"
              placeholder="#6366f1"
            />
          </div>
        </div>

        {/* Background color */}
        <div>
          <label className="text-[10px] text-txt-muted uppercase tracking-wider block mb-2">Background</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.bgColor}
              onChange={(e) => update({ bgColor: e.target.value })}
              className="w-8 h-8 rounded-lg border border-border cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={theme.bgColor}
              onChange={(e) => update({ bgColor: e.target.value })}
              className="ck-input text-xs font-mono flex-1"
            />
          </div>
        </div>

        {/* Surface color */}
        <div>
          <label className="text-[10px] text-txt-muted uppercase tracking-wider block mb-2">Surface</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.surfaceColor}
              onChange={(e) => update({ surfaceColor: e.target.value })}
              className="w-8 h-8 rounded-lg border border-border cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={theme.surfaceColor}
              onChange={(e) => update({ surfaceColor: e.target.value })}
              className="ck-input text-xs font-mono flex-1"
            />
          </div>
        </div>

        {/* Border radius */}
        <div>
          <label className="text-[10px] text-txt-muted uppercase tracking-wider block mb-2">Border Radius</label>
          <div className="flex gap-1">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r.value}
                onClick={() => update({ borderRadius: r.value })}
                className={`flex-1 px-2 py-1.5 text-[10px] rounded-md border transition-all ${
                  theme.borderRadius === r.value
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-border text-txt-muted hover:border-txt-faint'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font family */}
        <div>
          <label className="text-[10px] text-txt-muted uppercase tracking-wider block mb-2">Font</label>
          <div className="flex gap-1">
            {FONT_OPTIONS.map((f) => (
              <button
                key={f.value}
                onClick={() => update({ fontFamily: f.value })}
                className={`flex-1 px-2 py-1.5 text-[10px] rounded-md border transition-all ${
                  theme.fontFamily === f.value
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-border text-txt-muted hover:border-txt-faint'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live preview swatch */}
        <div>
          <label className="text-[10px] text-txt-muted uppercase tracking-wider block mb-2">Preview</label>
          <div
            className="rounded-xl border border-border overflow-hidden"
            style={{ backgroundColor: theme.bgColor }}
          >
            <div className="px-3 py-2 border-b border-border/50" style={{ backgroundColor: theme.surfaceColor }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accentColor }} />
                <span className="text-[10px] text-txt-secondary">Sample Block</span>
              </div>
            </div>
            <div className="p-3 space-y-2">
              <div className="h-2 rounded-full w-3/4" style={{ backgroundColor: theme.surfaceColor }} />
              <div className="h-2 rounded-full w-1/2" style={{ backgroundColor: theme.surfaceColor }} />
              <button
                className="px-3 py-1 text-[9px] text-white rounded-md mt-1"
                style={{ backgroundColor: theme.accentColor }}
              >
                Action
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
