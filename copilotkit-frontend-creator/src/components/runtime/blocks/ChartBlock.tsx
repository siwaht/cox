import React from 'react';
import type { BlockConfig } from '@/types/blocks';
import { BlockHeader } from './ChatBlock';
import { useAgentState } from '@/hooks/useAgentState';

export const ChartBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const { results } = useAgentState();

  // Simple bar chart renderer using CSS
  const data = results
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .slice(0, 10);

  if (data.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <BlockHeader label={block.label} />
        <div className="flex-1 p-3 text-txt-faint text-xs text-center mt-4">
          Chart data will render here when available
        </div>
      </div>
    );
  }

  const keys = Object.keys(data[0]);
  const labelKey = keys[0];
  const valueKey = keys.find((k) => typeof data[0][k] === 'number') || keys[1];
  const maxVal = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);

  return (
    <div className="flex flex-col h-full">
      <BlockHeader label={block.label} />
      <div className="flex-1 p-3 flex items-end gap-1">
        {data.map((d, i) => {
          const val = Number(d[valueKey]) || 0;
          const pct = (val / maxVal) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-[9px] text-txt-muted">{val}</div>
              <div
                className="w-full bg-accent/60 rounded-t transition-all"
                style={{ height: `${Math.max(4, pct)}%` }}
              />
              <div className="text-[8px] text-txt-faint truncate w-full text-center">
                {String(d[labelKey] ?? '')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
