import React, { useState } from 'react';
import type { BlockConfig } from '@/types/blocks';
import { BlockHeader } from './ChatBlock';

export const ReasoningChainBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const [collapsed, setCollapsed] = useState(false);

  const placeholderSteps = [
    { step: 1, text: 'Analyzing input...', confidence: 0.92 },
    { step: 2, text: 'Reasoning about approach...', confidence: 0.87 },
    { step: 3, text: 'Generating response...', confidence: 0.95 },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-2xs font-medium text-txt-muted uppercase tracking-wider">{block.label}</span>
        {Boolean(block.props.collapsible) && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-2xs text-txt-muted hover:text-txt-secondary transition-colors"
          >
            {collapsed ? 'Show' : 'Hide'}
          </button>
        )}
      </div>
      {!collapsed && (
        <div className="flex-1 p-3 space-y-2">
          {placeholderSteps.map((s) => (
            <div key={s.step} className="flex items-center gap-2.5 text-xs">
              <span className="w-5 h-5 rounded-full bg-surface flex items-center justify-center text-[10px] text-txt-muted shrink-0">
                {s.step}
              </span>
              <span className="text-txt-secondary flex-1">{s.text}</span>
              {Boolean(block.props.showConfidence) && (
                <span className="text-[10px] text-txt-ghost">{(s.confidence * 100).toFixed(0)}%</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
