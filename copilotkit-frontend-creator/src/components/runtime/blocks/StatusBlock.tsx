import React from 'react';
import type { BlockConfig } from '@/types/blocks';
import { BlockHeader } from './ChatBlock';
import { useAgentState } from '@/hooks/useAgentState';

export const StatusBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const { status, progress } = useAgentState();

  const statusColors: Record<string, string> = {
    idle: 'bg-txt-faint',
    running: 'bg-accent',
    success: 'bg-success',
    error: 'bg-danger',
    waiting: 'bg-warning',
  };

  return (
    <div className="flex flex-col h-full">
      <BlockHeader label={block.label} />
      <div className="flex-1 p-3 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2.5 h-2.5 rounded-full ${statusColors[status] || 'bg-txt-faint'} ${
            status === 'running' ? 'animate-pulse' : ''
          }`} />
          <span className="text-sm text-txt-secondary capitalize">{status}</span>
        </div>
        {progress !== null && (
          <div className="w-full bg-surface rounded-full h-1.5">
            <div
              className="bg-accent h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
