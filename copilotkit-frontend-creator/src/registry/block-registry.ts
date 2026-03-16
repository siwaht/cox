import type { BlockDefinition } from '@/types/blocks';

// ─── CopilotKit Blocks ───
// These blocks use CopilotKit's React SDK for chat, tool calls, and streaming.

const COPILOTKIT_BLOCKS: BlockDefinition[] = [
  {
    type: 'chat',
    label: 'Chat',
    description: 'Interactive chat panel with streaming support',
    icon: 'MessageSquare',
    defaultW: 6,
    defaultH: 4,
    defaultProps: { showTimestamps: true, showAvatars: true },
    requiredCapabilities: ['chat', 'streaming'],
    frontend: 'copilotkit',
  },
  {
    type: 'results',
    label: 'Results',
    description: 'Displays structured agent results: cards, JSON, text',
    icon: 'LayoutList',
    defaultW: 6,
    defaultH: 3,
    defaultProps: { format: 'auto' },
    requiredCapabilities: ['structuredOutput'],
    frontend: 'copilotkit',
  },
  {
    type: 'toolActivity',
    label: 'Tool Activity',
    description: 'Live feed of tool calls and their results',
    icon: 'Wrench',
    defaultW: 4,
    defaultH: 3,
    defaultProps: { showArgs: true, showResults: true },
    requiredCapabilities: ['toolCalls', 'toolResults'],
    frontend: 'copilotkit',
  },
  {
    type: 'approvals',
    label: 'Approvals',
    description: 'Human-in-the-loop approval requests',
    icon: 'ShieldCheck',
    defaultW: 4,
    defaultH: 2,
    defaultProps: {},
    requiredCapabilities: ['approvals'],
    frontend: 'copilotkit',
  },
  {
    type: 'logs',
    label: 'Logs',
    description: 'Execution logs, errors, and debug output',
    icon: 'ScrollText',
    defaultW: 12,
    defaultH: 2,
    defaultProps: { level: 'info', autoScroll: true },
    requiredCapabilities: ['logs'],
    frontend: 'copilotkit',
  },
  {
    type: 'status',
    label: 'Status',
    description: 'Agent status, progress bar, and state indicator',
    icon: 'Activity',
    defaultW: 3,
    defaultH: 1,
    defaultProps: {},
    requiredCapabilities: ['progress'],
    frontend: 'copilotkit',
  },
];

// ─── Tambo Blocks ───
// These blocks use Tambo's generative UI model via MCP transport.

const TAMBO_BLOCKS: BlockDefinition[] = [
  {
    type: 'cards',
    label: 'Cards',
    description: 'Generative card grid rendered by Tambo',
    icon: 'Layers',
    defaultW: 6,
    defaultH: 3,
    defaultProps: {},
    requiredCapabilities: ['structuredOutput'],
    frontend: 'tambo',
  },
  {
    type: 'dashboard',
    label: 'Dashboard',
    description: 'Tambo-driven dashboard with KPI cards and metrics',
    icon: 'LayoutDashboard',
    defaultW: 12,
    defaultH: 2,
    defaultProps: { metrics: [] },
    requiredCapabilities: ['structuredOutput'],
    frontend: 'tambo',
  },
];

// ─── Shared Blocks ───
// These work with both CopilotKit and Tambo frontends.

const SHARED_BLOCKS: BlockDefinition[] = [
  {
    type: 'form',
    label: 'Form',
    description: 'Dynamic input form for agent parameters',
    icon: 'FileInput',
    defaultW: 4,
    defaultH: 3,
    defaultProps: { fields: [] },
    requiredCapabilities: [],
    frontend: 'both',
  },
  {
    type: 'table',
    label: 'Table',
    description: 'Data table with sorting and filtering',
    icon: 'Table',
    defaultW: 6,
    defaultH: 3,
    defaultProps: { columns: [], pagination: true },
    requiredCapabilities: ['structuredOutput'],
    frontend: 'both',
  },
  {
    type: 'chart',
    label: 'Chart',
    description: 'Visualize data as bar, line, or pie charts',
    icon: 'BarChart3',
    defaultW: 6,
    defaultH: 3,
    defaultProps: { chartType: 'bar' },
    requiredCapabilities: ['structuredOutput'],
    frontend: 'both',
  },
  {
    type: 'panel',
    label: 'Panel',
    description: 'Generic container panel with title',
    icon: 'PanelTop',
    defaultW: 6,
    defaultH: 2,
    defaultProps: { title: 'Panel' },
    requiredCapabilities: [],
    frontend: 'both',
  },
  {
    type: 'markdown',
    label: 'Markdown',
    description: 'Render markdown content from agent',
    icon: 'FileText',
    defaultW: 6,
    defaultH: 3,
    defaultProps: { content: '' },
    requiredCapabilities: [],
    frontend: 'both',
  },
];

// ─── Combined R
egistry ───

export const BLOCK_REGISTRY: BlockDefinition[] = [
  ...COPILOTKIT_BLOCKS,
  ...TAMBO_BLOCKS,
  ...SHARED_BLOCKS,
];

export const COPILOTKIT_BLOCK_TYPES = COPILOTKIT_BLOCKS.map((b) => b.type);
export const TAMBO_BLOCK_TYPES = TAMBO_BLOCKS.map((b) => b.type);
export const SHARED_BLOCK_TYPES = SHARED_BLOCKS.map((b) => b.type);

export function getBlockDefinition(type: string): BlockDefinition | undefined {
  return BLOCK_REGISTRY.find((b) => b.type === type);
}

export function getBlocksForFrontend(frontend: 'copilotkit' | 'tambo'): BlockDefinition[] {
  return BLOCK_REGISTRY.filter(
    (b) => b.frontend === frontend || b.frontend === 'both'
  );
}
