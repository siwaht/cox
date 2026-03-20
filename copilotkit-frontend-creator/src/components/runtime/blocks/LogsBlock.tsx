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
          <div className="opacity-60">
            {[
              { ts: '10:00:00', level: 'info', msg: 'Agent initialized — connected to runtime' },
              { ts: '10:00:01', level: 'info', msg: 'Processing user query: "Analyze Q4 sales data"' },
              { ts: '10:00:02', level: 'debug', msg: 'Tool call: query_database started' },
              { ts: '10:00:03', level: 'info', msg: 'Database query returned 3 rows in 1.2s' },
              { ts: '10:00:04', level: 'warn', msg: 'Rate limit approaching: 45/50 requests' },
            ].map((log, i) => (
              <div key={i} className="flex gap-2 text-[10px] leading-relaxed">
                <span className="text-txt-ghost shrink-0">{log.ts}</span>
                <span className={`shrink-0 w-10 ${
                  log.level === 'warn' ? 'text-warning' : log.level === 'debug' ? 'text-txt-faint' : 'text-txt-secondary'
                }`}>[{log.level}]</span>
                <span className="text-txt-secondary">{log.msg}</span>
              </div>
            ))}
            <p className="text-[10px] text-txt-ghost text-center mt-2">Execution logs stream here</p>
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
