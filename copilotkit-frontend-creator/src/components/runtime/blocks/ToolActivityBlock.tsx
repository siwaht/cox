import React from 'react';
import type { BlockConfig } from '@/types/blocks';
import { BlockHeader } from './ChatBlock';
import { useAgentState } from '@/hooks/useAgentState';
import { Wrench, CheckCircle, Loader2, XCircle } from 'lucide-react';

export const ToolActivityBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const { toolCalls } = useAgentState();

  return (
    <div className="flex flex-col h-full">
      <BlockHeader label={block.label} />
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {toolCalls.length === 0 ? (
          <div className="text-txt-faint text-xs text-center mt-4">
            Tool calls will appear here as the agent works
          </div>
        ) : (
          toolCalls.map((tc, i) => (
            <div key={i} className="bg-surface rounded-lg p-2.5 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <StatusIcon status={tc.status} />
                <span className="text-xs font-medium text-txt-secondary">{tc.name}</span>
                <span className="text-[10px] text-txt-faint">{tc.duration || ''}</span>
              </div>
              {Boolean(block.props.showArgs) && tc.args && (
                <pre className="text-[10px] text-txt-muted font-mono mt-1 overflow-x-auto">
                  {JSON.stringify(tc.args, null, 2)}
                </pre>
              )}
              {Boolean(block.props.showResults) && tc.result != null ? (
                <div className="mt-1.5 pt-1.5 border-t border-border/30">
                  <pre className="text-[10px] text-txt-secondary font-mono overflow-x-auto">
                    {typeof tc.result === 'string' ? tc.result : JSON.stringify(tc.result, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'running':
      return <Loader2 size={12} className="text-accent animate-spin" />;
    case 'success':
      return <CheckCircle size={12} className="text-success" />;
    case 'error':
      return <XCircle size={12} className="text-danger" />;
    default:
      return <Wrench size={12} className="text-txt-muted" />;
  }
};
