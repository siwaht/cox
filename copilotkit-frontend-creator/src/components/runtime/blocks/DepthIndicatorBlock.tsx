import React from 'react';
import type { BlockConfig } from '@/types/blocks';

export const DepthIndicatorBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const currentDepth = (block.props.currentDepth as number) ?? 0;
  const maxDepth = (block.props.maxDepth as number) ?? 5;
  const progress = (currentDepth / maxDepth) * 100;

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
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-[10px] text-txt-ghost shrink-0">{currentDepth}/{maxDepth}</span>
    </div>
  );
};
