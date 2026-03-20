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
          <div className="opacity-60">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-2 py-1.5 text-txt-muted font-medium">region</th>
                  <th className="text-left px-2 py-1.5 text-txt-muted font-medium">q4_revenue</th>
                  <th className="text-left px-2 py-1.5 text-txt-muted font-medium">growth</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { region: 'West', q4_revenue: '$4.2M', growth: '23.5%' },
                  { region: 'East', q4_revenue: '$3.1M', growth: '17.9%' },
                  { region: 'Central', q4_revenue: '$1.8M', growth: '2.3%' },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-surface-overlay/50">
                    <td className="px-2 py-1.5 text-txt-secondary">{row.region}</td>
                    <td className="px-2 py-1.5 text-txt-secondary">{row.q4_revenue}</td>
                    <td className="px-2 py-1.5 text-txt-secondary">{row.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-txt-ghost text-center mt-2">Structured data renders as a table</p>
          </div>
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
