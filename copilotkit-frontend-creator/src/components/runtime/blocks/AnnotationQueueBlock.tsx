import React from 'react';
import type { BlockConfig } from '@/types/blocks';
import { BlockHeader } from './ChatBlock';
import { ClipboardList, AlertCircle, CheckCircle2 } from 'lucide-react';

const SAMPLE_ITEMS = [
  { label: 'Review: "Summarize earnings call"', priority: 'high', status: 'pending' },
  { label: 'Review: "Extract key metrics"', priority: 'medium', status: 'pending' },
  { label: 'Review: "Compare Q3 vs Q4"', priority: 'low', status: 'done' },
];

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
        <div className="opacity-60 space-y-1.5">
          {SAMPLE_ITEMS.map((item, i) => (
            <div key={i} className="bg-surface rounded-lg p-2.5 border border-border/50 flex items-center gap-2">
              {item.status === 'done' ? (
                <CheckCircle2 size={12} className="text-success shrink-0" />
              ) : (
                <ClipboardList size={12} className="text-warning shrink-0" />
              )}
              <span className="text-[10px] text-txt-secondary flex-1 truncate">{item.label}</span>
              {item.priority === 'high' && <AlertCircle size={10} className="text-danger shrink-0" />}
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                item.status === 'done' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
              }`}>
                {item.status}
              </span>
            </div>
          ))}
          <p className="text-[10px] text-txt-ghost text-center mt-1">Items for human review appear here</p>
        </div>
      </div>
    </div>
  );
};
