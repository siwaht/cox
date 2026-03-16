import React from 'react';
import type { DiagnosticError } from '@/types/connections';
import { AlertTriangle, XCircle, ArrowRight } from 'lucide-react';

interface Props {
  errors: DiagnosticError[];
  warnings: DiagnosticError[];
  compact?: boolean;
}

export const DiagnosticsPanel: React.FC<Props> = ({ errors, warnings, compact }) => {
  const items = [
    ...errors.map((e) => ({ ...e, kind: 'error' as const })),
    ...warnings.map((w) => ({ ...w, kind: 'warning' as const })),
  ];
  if (items.length === 0) return null;

  return (
    <div className={`space-y-2 ${compact ? '' : 'mt-3'}`}>
      {!compact && (
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          {errors.length > 0 ? `${errors.length} issue(s) found` : `${warnings.length} warning(s)`}
        </h3>
      )}
      {items.map((item, i) => (
        <DiagnosticCard key={`${item.code}-${i}`} item={item} compact={compact} />
      ))}
    </div>
  );
};

const DiagnosticCard: React.FC<{
  item: DiagnosticError & { kind: 'error' | 'warning' };
  compact?: boolean;
}> = ({ item, compact }) => {
  const isBlocking = item.kind === 'error' && item.severity === 'blocking';
  const isWarning = item.kind === 'warning' || item.severity === 'warning';

  const border = isBlocking ? 'border-danger/30' : 'border-warning/30';
  const bg = isBlocking ? 'bg-danger-soft' : 'bg-warning-soft';
  const Icon = isBlocking ? XCircle : AlertTriangle;
  const iconColor = isBlocking ? 'text-danger' : 'text-warning';

  if (compact) {
    return (
      <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border ${border} ${bg}`}>
        <Icon size={13} className={`${iconColor} shrink-0 mt-0.5`} />
        <div className="min-w-0 space-y-1">
          <div className="text-xs text-zinc-300 leading-snug">{item.whatFailed}</div>
          <div className="flex items-start gap-1.5 text-xs text-accent">
            <ArrowRight size={11} className="shrink-0 mt-0.5" />
            <span className="leading-snug">{item.nextAction}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${border} ${bg} p-4 animate-fade-in`}>
      <div className="flex items-start gap-2.5 mb-3">
        <Icon size={15} className={`${iconColor} shrink-0 mt-0.5`} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-mono text-zinc-500">{item.code}</span>
            <span className={`text-2xs px-1.5 py-0.5 rounded font-medium ${
              isBlocking ? 'bg-danger/20 text-danger' : 'bg-warning/20 text-warning'
            }`}>
              {item.severity}
            </span>
          </div>
          <div className="text-sm text-zinc-200 leading-snug">{item.whatFailed}</div>
        </div>
      </div>

      <div className="ml-6 space-y-2 text-xs">
        <InfoRow label="Why" value={item.likelyReason} />
        <InfoRow label="Fix" value={item.nextAction} highlight />
        <InfoRow label="Where" value={item.fixLocation} />
      </div>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className="flex gap-2">
    <span className="text-zinc-600 shrink-0 w-12 font-medium">{label}</span>
    <span className={highlight ? 'text-accent' : 'text-zinc-400'}>{value}</span>
  </div>
);
