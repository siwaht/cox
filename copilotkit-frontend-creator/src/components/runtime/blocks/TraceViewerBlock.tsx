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
          <div className="opacity-60 space-y-1.5">
            {[
              { type: 'tool', name: 'query_database', duration: '1.2s' },
              { type: 'tool', name: 'calculate_growth', duration: '0.3s' },
              { type: 'tool', name: 'generate_chart', duration: '0.8s' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <span className="text-txt-secondary">{item.name}</span>
                {Boolean(block.props.showLatency) && (
                  <span className="ml-auto text-txt-ghost">{item.duration}</span>
                )}
              </div>
            ))}
            {[
              'Agent initialized — connected to runtime',
              'Processing user query',
              'Database query returned 3 rows',
            ].map((msg, i) => (
              <div key={`log-${i}`} className="flex items-center gap-2 text-[10px]">
                <span className="w-2 h-2 rounded-full bg-zinc-600 shrink-0" />
                <span className="text-txt-muted">{msg}</span>
              </div>
            ))}
            <p className="text-[10px] text-txt-ghost text-center mt-2">Execution traces appear here</p>
          </div>
        ) : (
          <>
            {toolCalls.map((tc, i) => (
              <div key={`tc-${i}`} className="flex items-center gap-2 text-[10px]">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <span className="text-txt-secondary">{tc.name}</span>
                {Boolean(block.props.showLatency) && (
                  <span className="ml-auto text-txt-ghost">{tc.duration ?? '--'}ms</span>
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
