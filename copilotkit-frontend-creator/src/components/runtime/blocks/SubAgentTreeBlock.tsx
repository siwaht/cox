import React from 'react';
import type { BlockConfig } from '@/types/blocks';
import { BlockHeader } from './ChatBlock';

interface AgentNode {
  name: string;
  status: string;
  children: AgentNode[];
}

export const SubAgentTreeBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const placeholderAgents: AgentNode[] = [
    {
      name: 'Coordinator', status: 'active', children: [
        { name: 'Research Agent', status: 'working', children: [] },
        { name: 'Analysis Agent', status: 'idle', children: [
          { name: 'Data Processor', status: 'idle', children: [] },
        ] },
      ],
    },
  ];

  const statusColor = (s: string) =>
    s === 'active' ? 'bg-success' : s === 'working' ? 'bg-accent' : 'bg-txt-faint';

  const renderAgent = (agent: AgentNode, depth = 0): React.ReactNode => (
    <div key={agent.name} style={{ marginLeft: depth * 16 }} className="py-0.5">
      <div className="flex items-center gap-2">
        {Boolean(block.props.showStatus) && (
          <span className={`w-2 h-2 rounded-full ${statusColor(agent.status)}`} />
        )}
        <span className="text-xs text-txt-secondary">{agent.name}</span>
        <span className="text-[10px] text-txt-ghost">{agent.status}</span>
      </div>
      {agent.children.map((child) => renderAgent(child, depth + 1))}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <BlockHeader label={block.label} />
      <div className="flex-1 p-3">
        {placeholderAgents.map((a) => renderAgent(a))}
      </div>
    </div>
  );
};
