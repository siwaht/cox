import React from 'react';
import type { BlockConfig } from '@/types/blocks';
import { useAgentState } from '@/hooks/useAgentState';
import { useCopilotLive } from '@/components/runtime/CopilotKitBridge';

export const DepthIndicatorBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const isLive = useCopilotLive();
  const { progress, toolCalls } = useAgentState();

  // When live, derive depth from tool call count or progress
  const maxDepth = (block.props.maxDepth as number) ?? 5;
  const currentDepth = isLive
    ? (progress != null ? Math.round((progress / 100) * maxDepth) : toolCalls.length)
    : ((block.props.currentDepth as number) ?? 0);

  const clampedDepth = Math.min(currentDepth, maxDepth);
  const pct = (clampedDepth / maxDepth) * 100;

  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 h-full">
      {Boolean(block.props.showLabel) && (
        <span className="text-2xs font-medium text-txt-muted uppercase tracking-wider shrink-0">
          {block.label}
        </span>
      )}
      <div className="flex-1 bg-surface rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-txt-ghost shrink-0">
        {clampedDepth}/{maxDepth}
      </span>
    </div>
  );
};