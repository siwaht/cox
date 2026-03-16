import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['Delete'], action: 'Remove selected block' },
  { keys: ['Escape'], action: 'Deselect block' },
  { keys: ['Ctrl', 'Z'], action: 'Undo last removal' },
  { keys: ['Double-click'], action: 'Rename block label' },
  { keys: ['?'], action: 'Toggle this shortcut sheet' },
];

export const KeyboardShortcuts: React.FC<Props> = ({ onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
  >
    <div className="bg-surface-raised border border-border rounded-2xl w-80 overflow-hidden animate-scale-in">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Keyboard size={14} className="text-accent" />
          <span className="text-xs font-semibold text-zinc-300">Keyboard Shortcuts</span>
        </div>
        <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-surface-overlay">
          <X size={14} />
        </button>
      </div>
      <div className="p-3 space-y-1.5">
        {SHORTCUTS.map((s) => (
          <div key={s.action} className="flex items-center justify-between py-1.5">
            <span className="text-xs text-zinc-400">{s.action}</span>
            <div className="flex items-center gap-1">
              {s.keys.map((k) => (
                <kbd key={k} className="px-1.5 py-0.5 text-2xs font-mono bg-surface border border-border rounded text-zinc-400">
                  {k}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
