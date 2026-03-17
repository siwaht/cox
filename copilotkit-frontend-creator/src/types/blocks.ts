// ─── Block Types ───
// Every UI element in the frontend creator is a "Block".
// Blocks are config-driven: the runtime renderer reads block config to decide what to render.

export type BlockType =
  | 'chat'
  | 'results'
  | 'toolActivity'
  | 'approvals'
  | 'logs'
  | 'form'
  | 'table'
  | 'chart'
  | 'dashboard'
  | 'status'
  | 'cards'
  | 'panel'
  | 'markdown'
  | 'custom'
  // LangSmith-specific blocks
  | 'traceViewer'
  | 'feedback'
  | 'dataset'
  | 'annotationQueue'
  // Deep Agent-specific blocks
  | 'reasoningChain'
  | 'subAgentTree'
  | 'depthIndicator';

export interface BlockConfig {
  id: string;
  type: BlockType;
  label: string;
  /** Grid position and size */
  x: number;
  y: number;
  w: number; // columns (1-12)
  h: number; // rows (min height units)
  /** Block-specific settings */
  props: Record<string, unknown>;
  /** Whether this block is visible */
  visible: boolean;
}

export interface BlockDefinition {
  type: BlockType;
  label: string;
  description: string;
  icon: string; // lucide icon name
  defaultW: number;
  defaultH: number;
  defaultProps: Record<string, unknown>;
  /** Which runtime features this block needs */
  requiredCapabilities: RuntimeCapability[];
  /** Which frontend SDK this block is designed for */
  frontend: 'copilotkit';
}

export type RuntimeCapability =
  | 'chat'
  | 'streaming'
  | 'toolCalls'
  | 'toolResults'
  | 'intermediateState'
  | 'approvals'
  | 'structuredOutput'
  | 'logs'
  | 'subagents'
  | 'progress';
