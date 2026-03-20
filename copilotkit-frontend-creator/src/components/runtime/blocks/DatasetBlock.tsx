import React from 'react';
import type { BlockConfig } from '@/types/blocks';
import { BlockHeader } from './ChatBlock';
import { Database } from 'lucide-react';

const SAMPLE_ROWS = [
  { input: 'What is the capital of France?', output: 'Paris', score: '0.98' },
  { input: 'Summarize this article...', output: 'The article discusses...', score: '0.91' },
  { input: 'Translate to Spanish', output: 'Hola mundo', score: '0.95' },
];

export const DatasetBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  return (
    <div className="flex flex-col h-full">
      <BlockHeader label={block.label} />
      <div className="flex-1 p-3 space-y-2">
        <div className="flex items-center justify-between text-[10px] text-txt-ghost">
          <div className="flex items-center gap-1.5">
            <Database size={10} className="text-accent" />
            <span>Dataset Examples</span>
          </div>
          <span>Max: {String(block.props.maxRows ?? 50)} rows</span>
        </div>
        <div className="opacity-60">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-2 py-1.5 text-txt-muted font-medium">Input</th>
                <th className="text-left px-2 py-1.5 text-txt-muted font-medium">Output</th>
                <th className="text-left px-2 py-1.5 text-txt-muted font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_ROWS.map((row, i) => (
                <tr key={i} className="border-b border-border/30">
                  <td className="px-2 py-1.5 text-txt-secondary truncate max-w-[120px]">{row.input}</td>
                  <td className="px-2 py-1.5 text-txt-secondary truncate max-w-[120px]">{row.output}</td>
                  <td className="px-2 py-1.5 text-txt-secondary">{row.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-txt-ghost text-center mt-2">Connect to LangSmith for live data</p>
        </div>
      </div>
    </div>
  );
};
