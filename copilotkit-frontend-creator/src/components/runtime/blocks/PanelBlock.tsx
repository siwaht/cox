import React from 'react';
import type { BlockConfig } from '@/types/blocks';
import { BlockHeader } from './ChatBlock';

export const PanelBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const title = (block.props.title as string) || block.label;

  return (
    <div className="flex flex-col h-full">
      <BlockHeader label={title} />
      <div className="flex-1 p-3 text-zinc-600 text-xs text-center mt-4">
        Generic panel — connect an agent to populate
      </div>
    </div>
  );
};
