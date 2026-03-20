import React, { useState } from 'react';
import type { BlockConfig } from '@/types/blocks';
import { BlockHeader } from './ChatBlock';

export const FeedbackBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [comment, setComment] = useState('');

  return (
    <div className="flex flex-col h-full">
      <BlockHeader label={block.label} />
      <div className="flex-1 p-3 space-y-3">
        <p className="text-[10px] text-txt-muted">Rate the agent's response quality:</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRating('up')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
              rating === 'up' ? 'bg-success text-white' : 'bg-surface text-txt-muted hover:text-txt-secondary'
            }`}
          >
            👍 Good
          </button>
          <button
            onClick={() => setRating('down')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
              rating === 'down' ? 'bg-danger text-white' : 'bg-surface text-txt-muted hover:text-txt-secondary'
            }`}
          >
            👎 Bad
          </button>
        </div>
        {Boolean(block.props.allowComment) && (
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-txt-secondary placeholder-txt-ghost resize-none"
            rows={2}
          />
        )}
        {!rating && (
          <p className="text-[10px] text-txt-ghost">Feedback is sent to LangSmith for evaluation</p>
        )}
      </div>
    </div>
  );
};
