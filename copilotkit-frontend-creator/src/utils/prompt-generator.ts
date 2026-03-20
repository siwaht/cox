// ─── Prompt Generator ───
// Converts workspace configuration into a detailed AI prompt that any LLM can use
// to recreate the exact same frontend layout.

import type { BlockConfig, BlockType } from '@/types/blocks';
import type { WorkspaceConfig } from '@/types/workspace';
import { getBlockDefinition } from '@/registry/block-registry';

export interface PromptOptions {
  workspace: WorkspaceConfig;
  style?: 'detailed' | 'concise';
  framework?: 'react' | 'any';
  includeTheme?: boolean;
  includeStyling?: boolean;
}

/** Human-readable descriptions for each block type */
const BLOCK_DESCRIPTIONS: Record<BlockType, string> = {
  chat: 'an interactive chat panel where users can send messages and receive streaming AI responses, with message avatars and timestamps',
  results: 'a results display panel that shows structured agent output in card, JSON, or text format',
  toolActivity: 'a live activity feed showing real-time tool calls made by the AI agent, including arguments and return values',
  approvals: 'a human-in-the-loop approval panel where users can approve or reject agent actions before they execute',
  logs: 'a scrollable execution log panel showing info, warning, and error messages with auto-scroll',
  form: 'a dynamic input form for submitting parameters to the agent',
  table: 'a data table with sortable columns, filtering, and pagination for displaying structured data',
  chart: 'a data visualization chart (bar, line, or pie) for rendering numeric data from the agent',
  dashboard: 'a KPI dashboard panel with metric cards showing key performance indicators',
  status: 'a compact status indicator showing the agent\'s current state and a progress bar',
  cards: 'a card grid layout displaying structured items as individual cards',
  panel: 'a generic container panel with a title header for grouping content',
  markdown: 'a markdown renderer that displays rich text content from the agent',
  custom: 'a custom block with user-defined content',
  traceViewer: 'a LangSmith trace timeline viewer showing each step of agent execution with latency and token usage',
  feedback: 'a feedback collector with thumbs up/down buttons and optional comment field for rating agent responses',
  dataset: 'a LangSmith dataset browser showing example rows with pagination',
  annotationQueue: 'a LangSmith annotation queue for human review workflows with priority indicators',
  reasoningChain: 'a reasoning chain visualizer showing the agent\'s multi-step thinking process with confidence scores',
  subAgentTree: 'a tree view showing sub-agent hierarchy, delegation flow, and individual agent status',
  depthIndicator: 'a compact depth/progress gauge showing how deep the agent is in its reasoning process',
};

function describeGridPosition(block: BlockConfig): string {
  const widthPercent = Math.round((block.w / 12) * 100);
  let widthDesc: string;
  if (block.w === 12) widthDesc = 'full width';
  else if (block.w >= 8) widthDesc = 'wide (roughly three-quarters width)';
  else if (block.w === 6) widthDesc = 'half width';
  else if (block.w === 4) widthDesc = 'one-third width';
  else if (block.w === 3) widthDesc = 'one-quarter width';
  else widthDesc = `${widthPercent}% width (${block.w}/12 columns)`;

  const heightDesc = block.h <= 1 ? 'compact height' :
    block.h <= 2 ? 'short height' :
    block.h <= 3 ? 'medium height' :
    block.h <= 4 ? 'tall' : 'very tall';

  return `${widthDesc}, ${heightDesc}`;
}

function describeBlockProps(block: BlockConfig): string {
  const parts: string[] = [];
  const p = block.props;

  if (p.showTimestamps) parts.push('show timestamps on messages');
  if (p.showAvatars) parts.push('show user/AI avatars');
  if (p.format) parts.push(`display format: ${p.format}`);
  if (p.showArgs) parts.push('show tool call arguments');
  if (p.showResults) parts.push('show tool call results');
  if (p.level) parts.push(`log level: ${p.level}`);
  if (p.autoScroll) parts.push('auto-scroll to latest');
  if (p.columns && Array.isArray(p.columns) && (p.columns as unknown[]).length > 0) parts.push(`columns: ${(p.columns as string[]).join(', ')}`);
  if (p.pagination) parts.push('with pagination');
  if (p.chartType) parts.push(`chart type: ${p.chartType}`);
  if (p.title) parts.push(`titled "${p.title}"`);
  if (p.content) parts.push('with pre-filled markdown content');
  if (p.showLatency) parts.push('show latency metrics');
  if (p.showTokens) parts.push('show token usage');
  if (p.expandByDefault) parts.push('expanded by default');
  if (p.feedbackType) parts.push(`feedback style: ${p.feedbackType}`);
  if (p.allowComment) parts.push('with comment field');
  if (p.showExamples) parts.push('show dataset examples');
  if (p.maxRows) parts.push(`max ${p.maxRows} rows`);
  if (p.showPriority) parts.push('show priority levels');
  if (p.allowBulkActions) parts.push('with bulk actions');
  if (p.showConfidence) parts.push('show confidence scores');
  if (p.collapsible) parts.push('collapsible steps');
  if (p.showStatus) parts.push('show agent status');
  if (p.animated) parts.push('with animations');
  if (p.maxDepth) parts.push(`max depth: ${p.maxDepth}`);
  if (p.showLabel) parts.push('with label');

  return parts.length > 0 ? ` (${parts.join('; ')})` : '';
}

function describeTheme(workspace: WorkspaceConfig): string {
  const base = workspace.theme === 'dark' ? 'dark theme' : 'light theme';
  const custom = workspace.customTheme;
  if (!custom) return base;

  const parts = [base];
  if (custom.accentColor && custom.accentColor !== '#6366f1') parts.push(`accent color: ${custom.accentColor}`);
  if (custom.bgColor && custom.bgColor !== '#0c0c0e') parts.push(`background: ${custom.bgColor}`);
  if (custom.surfaceColor && custom.surfaceColor !== '#18181b') parts.push(`surface/card color: ${custom.surfaceColor}`);
  if (custom.borderRadius && custom.borderRadius !== 'lg') parts.push(`border radius: ${custom.borderRadius}`);
  if (custom.fontFamily && custom.fontFamily !== 'system') parts.push(`font: ${custom.fontFamily}`);

  return parts.join(', ');
}

function describeLayout(blocks: BlockConfig[]): string {
  const visible = blocks.filter(b => b.visible);
  if (visible.length === 0) return 'empty layout';

  // Detect layout patterns
  const fullWidthBlocks = visible.filter(b => b.w === 12);
  const halfBlocks = visible.filter(b => b.w === 6);
  const thirdBlocks = visible.filter(b => b.w === 4);
  const quarterBlocks = visible.filter(b => b.w === 3);

  const patterns: string[] = [];
  if (fullWidthBlocks.length > 0) patterns.push(`${fullWidthBlocks.length} full-width section(s)`);
  if (halfBlocks.length >= 2) patterns.push(`${halfBlocks.length} half-width blocks forming side-by-side pairs`);
  if (thirdBlocks.length >= 2) patterns.push(`${thirdBlocks.length} third-width blocks`);
  if (quarterBlocks.length > 0) patterns.push(`${quarterBlocks.length} quarter-width compact block(s)`);

  return patterns.join(', ');
}

export function generatePrompt(options: PromptOptions): string {
  const {
    workspace,
    style = 'detailed',
    framework = 'react',
    includeTheme = true,
    includeStyling = true,
  } = options;

  const visible = workspace.blocks.filter(b => b.visible);

  if (visible.length === 0) {
    return 'No blocks have been added to the workspace yet. Add some blocks in the editor first.';
  }

  const lines: string[] = [];

  // Header
  lines.push(`Build a frontend application called "${workspace.name}".`);
  lines.push('');

  // Overview
  lines.push('## Overview');
  lines.push(`This is an AI agent frontend dashboard with ${visible.length} UI component(s) arranged in a responsive 12-column grid layout.`);
  lines.push(`Layout pattern: ${describeLayout(visible)}.`);
  if (includeTheme) {
    lines.push(`Theme: ${describeTheme(workspace)}.`);
  }
  lines.push('');

  // Tech stack
  if (framework === 'react') {
    lines.push('## Tech Stack');
    lines.push('- React with TypeScript');
    lines.push('- Tailwind CSS for styling');
    lines.push('- CopilotKit (`@copilotkit/react-core` and `@copilotkit/react-ui`) for AI agent integration');
    lines.push('- Vite as the build tool');
    lines.push('');
  }

  // Layout structure
  lines.push('## Page Layout');
  lines.push('The page should have:');
  lines.push('1. A top header bar with the app title on the left and a green "Connected" status indicator on the right.');
  lines.push('2. A main content area with a 12-column CSS grid (max-width ~1200px, centered, with gap between items).');
  lines.push(`3. ${visible.length} block(s) arranged in the grid as described below.`);
  lines.push('');

  // Block details
  lines.push('## UI Blocks (in order, top to bottom)');
  lines.push('');

  visible.forEach((block, index) => {
    const def = getBlockDefinition(block.type);
    const desc = BLOCK_DESCRIPTIONS[block.type] || def?.description || block.type;
    const propsDesc = describeBlockProps(block);
    const sizeDesc = describeGridPosition(block);

    lines.push(`### ${index + 1}. ${block.label || def?.label || block.type}`);
    lines.push(`- **Type**: ${block.type}`);
    lines.push(`- **Description**: ${desc}${propsDesc}`);
    lines.push(`- **Size**: ${sizeDesc}`);

    if (style === 'detailed' && def) {
      const caps = def.requiredCapabilities;
      if (caps.length > 0) {
        lines.push(`- **Requires**: The AI agent backend must support: ${caps.join(', ')}`);
      }
    }
    lines.push('');
  });

  // Styling guidance
  if (includeStyling) {
    lines.push('## Styling Guidelines');
    if (workspace.theme === 'dark') {
      lines.push('- Dark theme: dark background (e.g., zinc-950/gray-950), light text (zinc-200)');
      lines.push('- Card/surface backgrounds slightly lighter than page background (e.g., zinc-900)');
      lines.push('- Subtle borders (zinc-800) between sections');
    } else {
      lines.push('- Light theme: white/light gray background, dark text');
      lines.push('- Card backgrounds white with light gray borders');
    }
    if (workspace.customTheme?.accentColor) {
      lines.push(`- Accent color: ${workspace.customTheme.accentColor} for interactive elements, buttons, and highlights`);
    } else {
      lines.push('- Accent color: indigo (#6366f1) for interactive elements');
    }
    lines.push('- Each block should be a rounded card with a small header label and content area');
    lines.push('- Use clean, modern spacing with consistent padding');
    lines.push('- Responsive: blocks should stack on mobile');
    lines.push('');
  }

  // Integration notes
  lines.push('## CopilotKit Integration');
  lines.push('- Wrap the entire app in `<CopilotKit runtimeUrl="http://localhost:8000/copilotkit">` pointing to the agent backend.');
  lines.push('- Import `CopilotKit` from `@copilotkit/react-core` and `CopilotChat` from `@copilotkit/react-ui`.');
  lines.push('- Import CopilotKit styles: `import "@copilotkit/react-ui/styles.css"`.');
  lines.push('- The chat block should use `<CopilotChat />` for real-time streaming with the agent.');
  lines.push('- Use `useCopilotReadable` to expose frontend state to the agent.');
  lines.push('- Use `useCopilotAction` to let the agent trigger UI updates (results, table data, chart data, etc.).');
  lines.push('- Tool activity, results, and status blocks should subscribe to CopilotKit\'s action state.');
  lines.push('- All blocks must handle loading, empty, and error states gracefully.');
  lines.push('- Use `useCopilotChat` hook for programmatic chat control if needed.');
  lines.push('');

  // Accessibility notes
  lines.push('## Accessibility');
  lines.push('- All interactive elements must have visible focus indicators.');
  lines.push('- Use semantic HTML elements (main, nav, section, article) for layout.');
  lines.push('- Buttons and links must have accessible labels (aria-label where text is not visible).');
  lines.push('- Color contrast must meet WCAG AA standards (4.5:1 for normal text).');
  lines.push('- Status changes should use aria-live regions for screen reader announcements.');
  lines.push('');

  // Concise summary
  if (style === 'concise') {
    lines.push('Keep the implementation minimal and focused. Use placeholder/mock data where the agent connection is not available.');
  }

  return lines.join('\n');
}

export function generateConcisePrompt(workspace: WorkspaceConfig): string {
  const visible = workspace.blocks.filter(b => b.visible);
  if (visible.length === 0) return 'No blocks configured.';

  const blockList = visible.map((b, i) => {
    const def = getBlockDefinition(b.type);
    const size = b.w === 12 ? 'full-width' : b.w >= 8 ? 'wide' : b.w === 6 ? 'half' : b.w === 4 ? 'third' : 'quarter';
    return `${i + 1}. ${b.label || def?.label || b.type} (${size})`;
  }).join('\n');

  return `Create a ${workspace.theme}-themed AI agent frontend called "${workspace.name}" using React + Tailwind + CopilotKit.

Layout: 12-column grid with these blocks:
${blockList}

Each block is a rounded card. The page has a header bar with the title and a connection status indicator. Use CopilotKit for agent integration. Make it responsive.`;
}
