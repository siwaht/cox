import React from 'react';
import type { BlockConfig } from '@/types/blocks';
import { BlockHeader } from './ChatBlock';
import { LayoutDashboard } from 'lucide-react';

export const PanelBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const title = (block.props.title as string) || block.label;

  return (
    <div className="flex flex-col h-full">
      <BlockHeader label={title} />
      <div className="flex-1 p-3">
        <div className="space-y-2.5 opacity-60">
          <div className="flex items-center gap-2 mb-3">
            <LayoutDashboard size={14} className="text-accent" />
            <span className="text-xs text-txt-secondary font-medium">Agent Output</span>
          </div>
          <div className="h-2 bg-surface rounded w-3/4" />
          <div className="h-2 bg-surface rounded w-full" />
          <div className="h-2 bg-surface rounded w-5/6" />
          <div className="h-2 bg-surface rounded w-2/3" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="bg-surface rounded-lg p-2.5">
              <div className="h-1.5 bg-surface-overlay rounded w-1/2 mb-1.5" />
              <div className="h-3 bg-accent/20 rounded w-3/4" />
            </div>
            <div className="bg-surface rounded-lg p-2.5">
              <div className="h-1.5 bg-surface-overlay rounded w-1/2 mb-1.5" />
              <div className="h-3 bg-success/20 rounded w-2/3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
