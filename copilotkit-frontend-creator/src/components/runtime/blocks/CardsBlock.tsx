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
          <div className="grid grid-cols-2 gap-2 opacity-60">
            {[
              { region: 'West', revenue: '$4.2M', growth: '+23.5%', status: 'Top' },
              { region: 'East', revenue: '$3.1M', growth: '+17.9%', status: 'Growing' },
              { region: 'Central', revenue: '$1.8M', growth: '+2.3%', status: 'Flat' },
            ].map((item, i) => (
              <div key={i} className="bg-surface rounded-lg p-3 border border-border/50">
                {Object.entries(item).map(([k, v]) => (
                  <div key={k} className="mb-1">
                    <span className="text-[10px] text-txt-faint">{k}: </span>
                    <span className="text-[10px] text-txt-secondary">{v}</span>
                  </div>
                ))}
              </div>
            ))}
            <p className="col-span-2 text-[10px] text-txt-ghost text-center">Cards render from agent data</p>
          </div>
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
