import React from 'react';
import type { BlockConfig } from '@/types/blocks';
import { BlockHeader } from './ChatBlock';

export const DatasetBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  return (
    <div className="flex flex-col h-full">
      <BlockHeader label={block.label} />
      <div className="flex-1 p-3 space-y-2">
        <div className="flex items-center justify-between text-[10px] text-txt-ghost">
          <span>Dataset Examples</span>
          <span>Max: {String(block.props.maxRows ?? 50)} rows</span>
        </div>
        <div className="bg-surface rounded-lg p-3 text-xs text-txt-faint text-center">
          Connect to LangSmith to browse datasets and examples.
        </div>
      </div>
    </div>
  );
};
