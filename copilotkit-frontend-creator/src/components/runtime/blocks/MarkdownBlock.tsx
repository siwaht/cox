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
          <div className="text-xs text-txt-secondary whitespace-pre-wrap leading-relaxed opacity-60">
            <p className="font-medium mb-2">## Q4 Sales Analysis</p>
            <p className="mb-2">West region leads with <span className="font-semibold">$4.2M</span> revenue and <span className="font-semibold">23.5%</span> QoQ growth.</p>
            <p className="mb-1">Key findings:</p>
            <p>• West region grew 23% QoQ</p>
            <p>• East region grew 18% QoQ</p>
            <p>• Central stayed flat at +2%</p>
            <p className="text-[10px] text-txt-ghost text-center mt-3">Markdown content renders here</p>
          </div>
        )}
      </div>
    </div>
  );
};
