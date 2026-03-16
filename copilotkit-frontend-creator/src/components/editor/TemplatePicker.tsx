import React from 'react';
import { WORKSPACE_TEMPLATES } from '@/config/workspace-templates';
import { useWorkspaceStore } from '@/store/workspace-store';
import {
  MessageSquare, LayoutDashboard, Wrench, Plus, Sparkles,
} from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  MessageSquare, LayoutDashboard, Wrench, Plus,
};

export const TemplatePicker: React.FC = () => {
  const applyTemplate = useWorkspaceStore((s) => s.applyTemplate);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={13} className="text-accent" />
        <span className="text-xs font-semibold text-zinc-400">Quick Start Templates</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {WORKSPACE_TEMPLATES.map((t) => {
          const Icon = ICON_MAP[t.icon] || Plus;
          return (
            <button
              key={t.id}
              onClick={() => applyTemplate(t)}
              className="flex items-start gap-3 p-3 rounded-xl border border-border
                         hover:border-accent/50 hover:bg-accent-soft transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0
                              group-hover:bg-accent/20 transition-colors">
                <Icon size={16} className="text-accent" />
              </div>
              <div className="min-w-0">
                <div className="text-sm text-zinc-200 font-medium">{t.name}</div>
                <div className="text-2xs text-zinc-500 mt-0.5">{t.description}</div>
                {t.blocks.length > 0 && (
                  <div className="text-2xs text-zinc-600 mt-1">
                    {t.blocks.length} blocks
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
