import React from 'react';
import type { BlockConfig } from '@/types/blocks';
import { BlockHeader } from './ChatBlock';
import { useAgentState } from '@/hooks/useAgentState';

export const DashboardBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const { results } = useAgentState();
  const metrics = (block.props.metrics as Array<{ label: string; key: string }>) || [];

  // Auto-detect metrics from first result object
  const autoMetrics = results.length > 0 && typeof results[0] === 'object' && results[0]
    ? Object.entries(results[0] as Record<string, unknown>)
        .filter(([, v]) => typeof v === 'number')
        .map(([k, v]) => ({ label: k, value: v as number }))
    : [];

  const displayMetrics = metrics.length > 0
    ? metrics.map((m) => ({
        label: m.label,
        value: results[0] && typeof results[0] === 'object'
          ? (results[0] as Record<string, unknown>)[m.key]
          : '-',
      }))
    : autoMetrics;

  return (
    <div className="flex flex-col h-full">
      <BlockHeader label={block.label} />
      <div className="flex-1 p-3">
        {displayMetrics.length === 0 ? (
          <div className="text-txt-faint text-xs text-center mt-4">
            Dashboard metrics will appear when data is available
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {displayMetrics.map((m, i) => (
              <div key={i} className="bg-surface rounded-lg p-3 border border-border/50">
                <div className="text-[10px] text-txt-muted mb-1">{m.label}</div>
                <div className="text-lg font-semibold text-txt-primary">{String(m.value)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
