import React, { useState } from 'react';
import { WORKSPACE_TEMPLATES } from '@/config/workspace-templates';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useToastStore } from '@/store/toast-store';
import {
  MessageSquare, LayoutDashboard, Wrench, Plus, Sparkles, Check,
} from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  MessageSquare, LayoutDashboard, Wrench, Plus,
};

export const TemplatePicker: React.FC = () => {
  const applyTemplate = useWorkspaceStore((s) => s.applyTemplate);
  const addToast = useToastStore((s) => s.addToast);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const handleApply = (t: typeof WORKSPACE_TEMPLATES[number]) => {
    applyTemplate(t);
    setAppliedId(t.id);
    addToast(`Applied "${t.name}" template with ${t.blocks.length} blocks`, 'success', 2000);
    setTimeout(() => setAppliedId(null), 1500);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={13} className="text-accent" />
        <span className="text-xs font-semibold text-txt-secondary">Quick Start Templates</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {WORKSPACE_TEMPLATES.map((t) => {
          const Icon = ICON_MAP[t.icon] || Plus;
          const isApplied = appliedId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleApply(t)}
              className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all text-left group active:scale-[0.98] ${
                isApplied
                  ? 'border-success/40 bg-success-soft shadow-lg shadow-success/10'
                  : 'border-border/50 hover:border-accent/40 hover:bg-accent-soft hover:shadow-md'
              }`}
              aria-label={`Apply ${t.name} template`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                isApplied ? 'bg-success/20' : 'bg-accent/10 group-hover:bg-accent/20'
              }`}>
                {isApplied ? <Check size={16} className="text-success" /> : <Icon size={16} className="text-accent" />}
              </div>
              <div className="min-w-0">
                <div className="text-sm text-txt-primary font-medium">{t.name}</div>
                <div className="text-2xs text-txt-muted mt-0.5">{t.description}</div>
                {t.blocks.length > 0 && (
                  <div className="text-2xs text-txt-faint mt-1">
                    {t.blocks.length} blocks · {t.blocks.reduce((sum, b) => sum + b.w, 0)} cols total
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
