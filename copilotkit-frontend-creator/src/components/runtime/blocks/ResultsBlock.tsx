import React from 'react';
import type { BlockConfig } from '@/types/blocks';
import { BlockHeader } from './ChatBlock';
import { useAgentState } from '@/hooks/useAgentState';

export const ResultsBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const { results } = useAgentState();

  return (
    <div className="flex flex-col h-full">
      <BlockHeader label={block.label} />
      <div className="flex-1 overflow-y-auto p-3">
        {results.length === 0 ? (
          <div className="text-txt-faint text-xs text-center mt-4">
            Agent results will appear here
          </div>
        ) : (
          <div className="space-y-2">
            {results.map((result, i) => (
              <div key={i} className="bg-surface rounded-lg p-3 border border-border/50">
                {typeof result === 'string' ? (
                  <div className="text-xs text-txt-secondary whitespace-pre-wrap">{result}</div>
                ) : (
                  <pre className="text-[10px] text-txt-secondary font-mono overflow-x-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
