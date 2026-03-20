import React, { useState } from 'react';
import type { BlockConfig } from '@/types/blocks';
import { BlockHeader } from './ChatBlock';
import { useAgentChat } from '@/hooks/useAgentChat';

export const FormBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const fields = (block.props.fields as Array<{ name: string; type: string; label: string }>) || [];
  const [values, setValues] = useState<Record<string, string>>({});
  const { sendMessage } = useAgentChat();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendMessage(JSON.stringify(values));
  };

  if (fields.length === 0) {
    // Show sample form so users can see what this block does
    return (
      <div className="flex flex-col h-full">
        <BlockHeader label={block.label} />
        <div className="flex-1 p-3 space-y-2 opacity-60">
          <div>
            <label className="text-[10px] text-txt-muted block mb-1">Name</label>
            <div className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-txt-ghost">
              John Doe
            </div>
          </div>
          <div>
            <label className="text-[10px] text-txt-muted block mb-1">Query</label>
            <div className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-txt-ghost">
              Analyze Q4 sales data
            </div>
          </div>
          <button disabled className="px-3 py-1.5 text-xs bg-accent/50 text-white/70 rounded-lg cursor-default">
            Submit
          </button>
          <p className="text-[10px] text-txt-ghost text-center mt-1">Configure fields in the inspector</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <BlockHeader label={block.label} />
      <form onSubmit={handleSubmit} className="flex-1 p-3 space-y-2">
        {fields.map((f) => (
          <div key={f.name}>
            <label className="text-[10px] text-txt-muted block mb-1">{f.label || f.name}</label>
            <input
              type={f.type || 'text'}
              value={values[f.name] || ''}
              onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
              className="w-full bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-txt-secondary focus:outline-none focus:border-accent"
            />
          </div>
        ))}
        <button type="submit" className="px-3 py-1.5 text-xs bg-accent text-white rounded-lg hover:bg-accent-hover">
          Submit
        </button>
      </form>
    </div>
  );
};
