import React from 'react';
import { useToastStore } from '@/store/toast-store';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ICONS = {
  success: <CheckCircle size={14} className="text-success shrink-0" />,
  error: <AlertCircle size={14} className="text-danger shrink-0" />,
  info: <Info size={14} className="text-accent shrink-0" />,
};

const BG = {
  success: 'border-success/30 bg-success-soft',
  error: 'border-danger/30 bg-danger-soft',
  info: 'border-accent/30 bg-accent-soft',
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border shadow-xl animate-slide-up ${BG[t.type]}`}
        >
          {ICONS[t.type]}
          <span className="text-xs text-txt-primary flex-1">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="p-0.5 text-txt-muted hover:text-txt-secondary">
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
};
