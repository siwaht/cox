import React from 'react';
import type { BlockConfig } from '@/types/blocks';
import { BlockHeader } from './ChatBlock';
import { useAgentState } from '@/hooks/useAgentState';

export const TraceViewerBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const { logs, toolCalls } = useAgentState();

  return (
    <div className="flex flex-col h-full">
      <BlockHeader label={block.label} />
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1.5">
        {logs.length === 0 && toolCalls.length === 0 ? (
          <div className="text-txt-faint text-center mt-4">
            LangSmith execution traces will appear here
          </div>
        ) : (
          <>
            {toolCalls.map((tc, i) => (
              <div key={`tc-${i}`} className="flex items-center gap-2 text-[10px]">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <span className="text-txt-secondary">{tc.name}</span>
                {Boolean(block.props.showLatency) && (
                  <span className="ml-auto text-txt-ghost">--ms</span>
                )}
              </div>
            ))}
            {logs.map((log, i) => (
              <div key={`log-${i}`} className="flex items-center gap-2 text-[10px]">
                <span className="w-2 h-2 rounded-full bg-zinc-600 shrink-0" />
                <span className="text-txt-muted">{log.message}</span>
              </div>
            ))}
          </>
        )}
        {Boolean(block.props.showTokens) && (
          <div className="text-txt-ghost text-right text-[10px] pt-1 border-t border-border">
            tokens: --
          </div>
        )}
      </div>
    </div>
  );
};
