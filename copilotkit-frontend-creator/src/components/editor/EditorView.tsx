import React, { useState } from 'react';
import { BlockPalette } from './BlockPalette';
import { CanvasArea } from './CanvasArea';
import { BlockInspector } from './BlockInspector';
import { ThemePanel } from './ThemePanel';
import { PanelLeft, Settings2, Palette } from 'lucide-react';

export const EditorView: React.FC = () => {
  const [showPalette, setShowPalette] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  return (
    <div className="flex h-full relative">
      {/* Mobile toggle buttons */}
      <div className="absolute top-3 left-3 z-20 flex gap-1.5 lg:hidden">
        <button
          onClick={() => { setShowPalette(!showPalette); setShowInspector(false); setShowTheme(false); }}
          className={`p-2 rounded-lg border transition-all ${
            showPalette ? 'bg-accent text-white border-accent' : 'bg-surface-raised text-txt-secondary border-border'
          }`}
          aria-label="Toggle block palette"
        >
          <PanelLeft size={16} />
        </button>
        <button
          onClick={() => { setShowInspector(!showInspector); setShowPalette(false); setShowTheme(false); }}
          className={`p-2 rounded-lg border transition-all ${
            showInspector ? 'bg-accent text-white border-accent' : 'bg-surface-raised text-txt-secondary border-border'
          }`}
          aria-label="Toggle inspector"
        >
          <Settings2 size={16} />
        </button>
        <button
          onClick={() => { setShowTheme(!showTheme); setShowPalette(false); setShowInspector(false); }}
          className={`p-2 rounded-lg border transition-all ${
            showTheme ? 'bg-accent text-white border-accent' : 'bg-surface-raised text-txt-secondary border-border'
          }`}
          aria-label="Toggle theme panel"
        >
          <Palette size={16} />
        </button>
      </div>

      {/* Left: Block palette — always visible on lg+, overlay on mobile */}
      <div className={`
        lg:relative lg:block lg:w-60 lg:shrink-0
        ${showPalette ? 'fixed inset-y-0 left-0 z-30 w-72 animate-fade-in' : 'hidden'}
      `}>
        <BlockPalette onClose={() => setShowPalette(false)} />
      </div>

      {/* Backdrop for mobile overlays */}
      {(showPalette || showInspector || showTheme) && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => { setShowPalette(false); setShowInspector(false); setShowTheme(false); }}
        />
      )}

      {/* Center: Canvas */}
      <CanvasArea selectedBlockId={selectedBlockId} onSelectBlock={setSelectedBlockId} />

      {/* Right: Inspector — always visible on lg+ when theme is closed, overlay on mobile */}
      <div className={`
        ${showTheme ? 'hidden' : `lg:relative lg:block lg:w-64 lg:shrink-0 ${showInspector ? 'fixed inset-y-0 right-0 z-30 w-72 animate-fade-in' : 'hidden'}`}
      `}>
        <BlockInspector
          selectedBlockId={selectedBlockId}
          onSelectBlock={setSelectedBlockId}
          onOpenTheme={() => { setShowTheme(true); setShowInspector(false); }}
        />
      </div>

      {/* Right: Theme panel — replaces inspector on desktop, overlay on mobile */}
      <div className={`
        ${showTheme ? 'lg:relative lg:block lg:w-64 lg:shrink-0 fixed inset-y-0 right-0 z-30 w-72 animate-fade-in lg:animate-none' : 'hidden'}
      `}>
        <ThemePanel onClose={() => setShowTheme(false)} />
      </div>
    </div>
  );
};
