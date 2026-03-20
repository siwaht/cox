import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    label: 'Selection',
    shortcuts: [
      { keys: ['Click'], action: 'Select block' },
      { keys: ['Ctrl', 'Click'], action: 'Multi-select blocks' },
      { keys: ['Ctrl', 'A'], action: 'Select all blocks' },
      { keys: ['Escape'], action: 'Clear selection' },
    ],
  },
  {
    label: 'Editing',
    shortcuts: [
      { keys: ['Delete'], action: 'Remove selected block(s)' },
      { keys: ['Ctrl', 'D'], action: 'Duplicate selected block(s)' },
      { keys: ['Ctrl', 'Z'], action: 'Undo' },
      { keys: ['Ctrl', 'Shift', 'Z'], action: 'Redo' },
      { keys: ['Double-click'], action: 'Rename block label' },
    ],
  },
  {
    label: 'Navigation',
    shortcuts: [
      { keys: ['?'], action: 'Toggle this shortcut sheet' },
    ],
  },
];

export const KeyboardShortcuts: React.FC<Props> = ({ onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    role="dialog"
    aria-modal="true"
    aria-label="Keyboard shortcuts"
  >
    <div className="bg-surface-raised border border-border rounded-2xl w-96 overflow-hidden animate-scale-in shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Keyboard size={14} className="text-accent" />
          <span className="text-xs font-semibold text-txt-secondary">Keyboard Shortcuts</span>
        </div>
        <button onClick={onClose} className="p-1 text-txt-muted hover:text-txt-secondary rounded-lg hover:bg-surface-overlay" aria-label="Close">
          <X size={14} />
        </button>
      </div>
      <div className="p-3 space-y-3 max-h-[60vh] overflow-y-auto">
        {SHORTCUT_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="text-[10px] text-txt-faint uppercase tracking-wider font-semibold mb-1.5 px-1">{group.label}</div>
            <div className="space-y-0.5">
              {group.shortcuts.map((s) => (
                <div key={s.action} className="flex items-center justify-between py-1.5 px-1 rounded-lg hover:bg-surface-overlay/50 transition-colors">
                  <span className="text-xs text-txt-secondary">{s.action}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((k) => (
                      <kbd key={k} className="px-1.5 py-0.5 text-2xs font-mono bg-surface border border-border rounded text-txt-secondary min-w-[20px] text-center">
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
