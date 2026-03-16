import React from 'react';
import type { BlockConfig } from '@/types/blocks';
import { BlockHeader } from './ChatBlock';
import { useAgentState } from '@/hooks/useAgentState';

export const TableBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const { results } = useAgentState();
  const data = results.filter((r) => typeof r === 'object' && r !== null && !Array.isArray(r));

  if (data.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <BlockHeader label={block.label} />
        <div className="flex-1 p-3 text-txt-faint text-xs text-center mt-4">
          Structured data from the agent will render as a table
        </div>
      </div>
    );
  }

  const columns = Object.keys(data[0] as Record<string, unknown>);

  return (
    <div className="flex flex-col h-full">
      <BlockHeader label={block.label} />
      <div className="flex-1 overflow-auto p-2">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th key={col} className="text-left px-2 py-1.5 text-txt-muted font-medium">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-border/30 hover:bg-surface-overlay/50">
                {columns.map((col) => (
                  <td key={col} className="px-2 py-1.5 text-txt-secondary">
                    {String((row as Record<string, unknown>)[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
