import type { BlockType } from '@/types/blocks';

export interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  blocks: Array<{ type: BlockType; w: number; h: number }>;
}

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  {
    id: 'chat-agent',
    name: 'Chat Agent',
    description: 'Simple conversational agent with status and logs',
    icon: 'MessageSquare',
    blocks: [
      { type: 'chat', w: 8, h: 5 },
      { type: 'status', w: 4, h: 1 },
      { type: 'results', w: 4, h: 2 },
      { type: 'logs', w: 12, h: 2 },
    ],
  },
  {
    id: 'dashboard-agent',
    name: 'Dashboard Agent',
    description: 'Data-rich agent with charts, tables, and KPIs',
    icon: 'LayoutDashboard',
    blocks: [
      { type: 'dashboard', w: 12, h: 2 },
      { type: 'chart', w: 6, h: 3 },
      { type: 'table', w: 6, h: 3 },
      { type: 'chat', w: 8, h: 4 },
      { type: 'status', w: 4, h: 1 },
      { type: 'logs', w: 12, h: 2 },
    ],
  },
  {
    id: 'tool-agent',
    name: 'Tool Agent',
    description: 'Agent with tool activity, approvals, and results',
    icon: 'Wrench',
    blocks: [
      { type: 'chat', w: 6, h: 4 },
      { type: 'toolActivity', w: 6, h: 3 },
      { type: 'approvals', w: 6, h: 2 },
      { type: 'results', w: 6, h: 3 },
      { type: 'logs', w: 12, h: 2 },
    ],
  },
  {
    id: 'blank',
    name: 'Blank Canvas',
    description: 'Start from scratch — add blocks as you go',
    icon: 'Plus',
    blocks: [],
  },
];
