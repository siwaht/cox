import React, { useState, useMemo } from 'react';
import { X, Copy, Check, Sparkles, FileText, Zap, ChevronDown } from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useToastStore } from '@/store/toast-store';
import { generatePrompt, generateConcisePrompt } from '@/utils/prompt-generator';
import type { PromptOptions } from '@/utils/prompt-generator';

interface Props {
  onClose: () => void;
}

type PromptStyle = 'detailed' | 'concise';

export const PromptModal: React.FC<Props> = ({ onClose }) => {
  const { workspace } = useWorkspaceStore();
  const addToast = useToastStore((s) => s.addToast);
  const [copied, setCopied] = useState(false);
  const [style, setStyle] = useState<PromptStyle>('detailed');
  const [includeTheme, setIncludeTheme] = useState(true);
  const [includeStyling, setIncludeStyling] = useState(true);

  const blockCount = workspace.blocks.filter((b) => b.visible).length;

  const prompt = useMemo(() => {
    if (style === 'concise') return generateConcisePrompt(workspace);
    return generatePrompt({
      workspace,
      style,
      framework: 'react',
      includeTheme,
      includeStyling,
    });
  }, [workspace, style, includeTheme, includeStyling]);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('Prompt copied to clipboard', 'success');
  };

  const handleDownload = () => {
    const blob = new Blob([prompt], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workspace.name.toLowerCase().replace(/\s+/g, '-')}-prompt.md`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Prompt downloaded', 'success');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="border border-border/50 rounded-t-3xl sm:rounded-3xl
                      w-full sm:w-[600px] max-h-[85vh] overflow-hidden flex flex-col animate-slide-up" style={{ background: 'color-mix(in srgb, var(--color-surface-raised) 96%, transparent)', backdropFilter: 'blur(24px) saturate(1.3)', WebkitBackdropFilter: 'blur(24px) saturate(1.3)', boxShadow: 'var(--shadow-elevated)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <Sparkles size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-txt-primary">Generate AI Prompt</h2>
          </div>
          <button onClick={onClose} className="p-1 text-txt-muted hover:text-txt-secondary rounded-lg hover:bg-surface-overlay">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Info banner */}
          <div className="bg-accent-soft/30 border border-accent/20 rounded-xl p-3.5">
            <p className="text-xs text-txt-secondary leading-relaxed">
              This generates a prompt describing your frontend layout. Copy it and give it to any AI agent
              (ChatGPT, Claude, Copilot, etc.) to recreate the same frontend.
            </p>
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-2">
            {/* Style toggle */}
            <div className="flex bg-surface-overlay/50 rounded-lg p-0.5 border border-border/30">
              <button
                onClick={() => setStyle('detailed')}
                className={`px-3 py-1.5 text-xs rounded-md transition-all font-medium ${
                  style === 'detailed'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-txt-muted hover:text-txt-primary'
                }`}
              >
                <span className="flex items-center gap-1.5"><FileText size={11} /> Detailed</span>
              </button>
              <button
                onClick={() => setStyle('concise')}
                className={`px-3 py-1.5 text-xs rounded-md transition-all font-medium ${
                  style === 'concise'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-txt-muted hover:text-txt-primary'
                }`}
              >
                <span className="flex items-center gap-1.5"><Zap size={11} /> Concise</span>
              </button>
            </div>

            {style === 'detailed' && (
              <>
                <label className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-txt-secondary cursor-pointer
                                  rounded-lg border border-border/30 hover:border-accent/30 transition-colors">
                  <input type="checkbox" checked={includeTheme} onChange={(e) => setIncludeTheme(e.target.checked)}
                    className="w-3 h-3 rounded accent-accent" />
                  Theme
                </label>
                <label className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-txt-secondary cursor-pointer
                                  rounded-lg border border-border/30 hover:border-accent/30 transition-colors">
                  <input type="checkbox" checked={includeStyling} onChange={(e) => setIncludeStyling(e.target.checked)}
                    className="w-3 h-3 rounded accent-accent" />
                  Styling
                </label>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-2xs text-txt-faint">
            <span>{blockCount} block(s)</span>
            <span>·</span>
            <span>{prompt.length} chars</span>
            <span>·</span>
            <span>~{Math.ceil(prompt.split(/\s+/).length / 0.75)} tokens</span>
          </div>

          {/* Prompt preview */}
          <div className="relative">
            <pre className="w-full p-4 bg-surface rounded-xl text-xs font-mono text-txt-secondary
                           overflow-x-auto max-h-[40vh] overflow-y-auto leading-relaxed
                           border border-border/50 whitespace-pre-wrap break-words">
              {prompt}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg bg-accent hover:bg-accent-hover
                         text-white transition-colors font-medium active:scale-95 shadow-lg shadow-accent/20">
              {copied ? <Check size={13} className="text-white" /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy Prompt'}
            </button>
            <button onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-border
                         hover:border-accent/50 hover:bg-accent-soft text-txt-secondary hover:text-accent transition-all">
              <FileText size={12} /> Download .md
            </button>
          </div>

          {/* Usage tip */}
          <div className="bg-surface rounded-xl p-3 border border-border/30">
            <p className="text-2xs text-txt-muted leading-relaxed">
              <span className="text-txt-secondary font-medium">Tip:</span> Paste this prompt into ChatGPT, Claude, or any AI coding assistant.
              It will generate a complete React + Tailwind frontend matching your layout. For best results, use the "Detailed" mode.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
