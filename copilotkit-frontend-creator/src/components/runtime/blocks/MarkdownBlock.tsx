import React from 'react';
import type { BlockConfig } from '@/types/blocks';
import { BlockHeader } from './ChatBlock';
import { useAgentState } from '@/hooks/useAgentState';

export const MarkdownBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const { lastMessage } = useAgentState();
  const content = (block.props.content as string) || lastMessage || '';

  return (
    <div className="flex flex-col h-full">
      <BlockHeader label={block.label} />
      <div className="flex-1 overflow-y-auto p-3">
        {content ? (
          <div className="text-xs text-txt-secondary whitespace-pre-wrap leading-relaxed">
            {content}
          </div>
        ) : (
          <div className="text-txt-faint text-xs text-center mt-4">
            Markdown content will render here
          </div>
        )}
      </div>
    </div>
  );
};
