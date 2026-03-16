import React, { useRef, useEffect } from 'react';
import type { BlockConfig } from '@/types/blocks';
import { BlockHeader } from './ChatBlock';
import { useAgentState } from '@/hooks/useAgentState';

export const LogsBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const { logs } = useAgentState();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (block.props.autoScroll) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [logs, block.props.autoScroll]);

  const levelColors: Record<string, string> = {
    info: 'text-txt-secondary',
    warn: 'text-warning',
    error: 'text-danger',
    debug: 'text-txt-faint',
  };

  return (
    <div className="flex flex-col h-full">
      <BlockHeader label={block.label} />
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 font-mono">
        {logs.length === 0 ? (
          <div className="text-txt-faint text-xs text-center mt-4">
            Execution logs will stream here
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex gap-2 text-[10px] leading-relaxed">
              <span className="text-txt-ghost shrink-0">{log.timestamp}</span>
              <span className={`shrink-0 w-10 ${levelColors[log.level] || 'text-txt-muted'}`}>
                [{log.level}]
              </span>
              <span className="text-txt-secondary">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
