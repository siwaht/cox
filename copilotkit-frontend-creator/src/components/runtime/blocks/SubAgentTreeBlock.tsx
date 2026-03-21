import React from 'react';
import type { BlockConfig } from '@/types/blocks';
import { BlockHeader } from './ChatBlock';
import { useAgentState } from '@/hooks/useAgentState';
import { useCopilotLive } from '@/components/runtime/CopilotKitBridge';

interface AgentNode {
  name: string;
  status: string;
  children: AgentNode[];
}

const PLACEHOLDER_AGENTS: AgentNode[] = [
  {
    name: 'Coordinator',
    status: 'active',
    children: [
      { name: 'Research Agent', status: 'working', children: [] },
      {
        name: 'Analysis Agent',
        status: 'idle',
        children: [{ name: 'Data Processor', status: 'idle', children: [] }],
      },
    ],
  },
];

export const SubAgentTreeBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const isLive = useCopilotLive();
  const { toolCalls, status } = useAgentState();

  // When live, build a simple agent tree from tool call activity.
  // Deep agents that spawn sub-agents will show tool calls from each.
  // We group tool calls as "sub-agents" under a root coordinator.
  const liveAgents: AgentNode[] = [];

  if (isLive && toolCalls.length > 0) {
    const children: AgentNode[] = toolCalls.map((tc) => ({
      name: tc.name,
      status:
        tc.status === 'running'
          ? 'working'
          : tc.status === 'success'
            ? 'complete'
            : tc.status === 'error'
              ? 'error'
              : 'idle',
      children: [],
    }));

    liveAgents.push({
      name: 'Agent',
      status: status === 'running' ? 'active' : status === 'idle' ? 'idle' : status,
      children,
    });
  }

  const agents = liveAgents.length > 0 ? liveAgents : PLACEHOLDER_AGENTS;
  const isPlaceholder = liveAgents.length === 0;

  const statusColor = (s: string) =>
    s === 'active'
      ? 'bg-success'
      : s === 'working'
        ? 'bg-accent'
        : s === 'complete'
          ? 'bg-success/60'
          : s === 'error'
            ? 'bg-danger'
            : 'bg-txt-faint';

  const renderAgent = (agent: AgentNode, depth = 0): React.ReactNode => (
    <div key={`${agent.name}-${depth}`} style={{ marginLeft: depth * 16 }} className="py-0.5">
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
      <div className={`flex-1 p-3 ${isPlaceholder ? 'opacity-60' : ''}`}>
        {agents.map((a) => renderAgent(a))}
        {isPlaceholder && (
          <p className="text-[10px] text-txt-ghost text-center mt-2">
            Sub-agent activity appears here when the agent runs
          </p>
        )}
      </div>
    </div>
  );
};