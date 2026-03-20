import React, { useEffect, useState } from 'react';
import { useToastStore, type Toast } from '@/store/toast-store';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ICONS = {
  success: <CheckCircle size={14} className="text-success shrink-0" />,
  error: <AlertCircle size={14} className="text-danger shrink-0" />,
  info: <Info size={14} className="text-accent shrink-0" />,
};

const BG = {
  success: 'border-success/20 bg-success-soft',
  error: 'border-danger/20 bg-danger-soft',
  info: 'border-accent/20 bg-accent-soft',
};

const ToastItem: React.FC<{ toast: Toast; onRemove: () => void }> = ({ toast, onRemove }) => {
  const [exiting, setExiting] = useState(false);

  const handleRemove = () => {
    setExiting(true);
    setTimeout(onRemove, 150);
  };

  // Auto-dismiss with exit animation
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const exitTimer = setTimeout(() => setExiting(true), toast.duration - 150);
      return () => clearTimeout(exitTimer);
    }
  }, [toast.duration]);

  return (
    <div
      className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-2xl transition-all duration-150 ${BG[toast.type]} ${
        exiting ? 'opacity-0 translate-x-4 scale-95' : 'animate-slide-up'
      }`}
      style={{ backdropFilter: 'blur(16px) saturate(1.2)', WebkitBackdropFilter: 'blur(16px) saturate(1.2)' }}
      role="alert"
    >
      {ICONS[toast.type]}
      <span className="text-xs text-txt-primary flex-1">{toast.message}</span>
      <button
        onClick={handleRemove}
        className="p-0.5 text-txt-muted hover:text-txt-secondary transition-colors"
        aria-label="Dismiss notification"
      >
        <X size={12} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm" role="status" aria-live="polite">
      {toasts.slice(-5).map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
      ))}
    </div>
  );
};
