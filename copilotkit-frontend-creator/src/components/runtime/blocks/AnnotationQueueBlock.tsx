import React from 'react';
import type { BlockConfig } from '@/types/blocks';
import { BlockHeader } from './ChatBlock';

export const AnnotationQueueBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  return (
    <div className="flex flex-col h-full">
      <BlockHeader label={block.label} />
      <div className="flex-1 p-3 space-y-2">
        {Boolean(block.props.showPriority) && (
          <div className="flex items-center gap-2 text-[10px] text-txt-ghost">
            <span className="w-2 h-2 rounded-full bg-warning" />
            <span>Priority queue</span>
          </div>
        )}
        <div className="bg-surface rounded-lg p-3 text-xs text-txt-faint text-center">
          Annotation queue items will appear here for human review.
        </div>
      </div>
    </div>
  );
};
