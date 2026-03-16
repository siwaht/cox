import React from 'react';
import type { BlockConfig } from '@/types/blocks';
import { BlockHeader } from './ChatBlock';
import { useAgentState } from '@/hooks/useAgentState';

export const CardsBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const { results } = useAgentState();
  const items = results.filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null);

  return (
    <div className="flex flex-col h-full">
      <BlockHeader label={block.label} />
      <div className="flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <div className="text-txt-faint text-xs text-center mt-4">Cards will render here</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {items.map((item, i) => {
              const keys = Object.keys(item);
              return (
                <div key={i} className="bg-surface rounded-lg p-3 border border-border/50">
                  {keys.slice(0, 4).map((k) => (
                    <div key={k} className="mb-1">
                      <span className="text-[10px] text-txt-faint">{k}: </span>
                      <span className="text-[10px] text-txt-secondary">{String(item[k])}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
