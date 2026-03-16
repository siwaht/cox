import React from 'react';
import type { BlockConfig, BlockType } from '@/types/blocks';
import { BlockErrorBoundary } from './BlockErrorBoundary';
import { ChatBlock } from './blocks/ChatBlock';
import { ResultsBlock } from './blocks/ResultsBlock';
import { ToolActivityBlock } from './blocks/ToolActivityBlock';
import { ApprovalsBlock } from './blocks/ApprovalsBlock';
import { LogsBlock } from './blocks/LogsBlock';
import { StatusBlock } from './blocks/StatusBlock';
import { FormBlock } from './blocks/FormBlock';
import { TableBlock } from './blocks/TableBlock';
import { ChartBlock } from './blocks/ChartBlock';
import { DashboardBlock } from './blocks/DashboardBlock';
import { CardsBlock } from './blocks/CardsBlock';
import { PanelBlock } from './blocks/PanelBlock';
import { MarkdownBlock } from './blocks/MarkdownBlock';

const BLOCK_COMPONENTS: Record<BlockType, React.FC<{ block: BlockConfig }>> = {
  chat: ChatBlock,
  results: ResultsBlock,
  toolActivity: ToolActivityBlock,
  approvals: ApprovalsBlock,
  logs: LogsBlock,
  status: StatusBlock,
  form: FormBlock,
  table: TableBlock,
  chart: ChartBlock,
  dashboard: DashboardBlock,
  cards: CardsBlock,
  panel: PanelBlock,
  markdown: MarkdownBlock,
  custom: PanelBlock,
};

export const RuntimeBlockRenderer: React.FC<{ block: BlockConfig }> = ({ block }) => {
  if (!block.visible) return null;
  const Component = BLOCK_COMPONENTS[block.type] || PanelBlock;

  return (
    <div
      style={{ gridColumn: `span ${block.w}`, minHeight: `${block.h * 50}px` }}
      className="rounded-xl border border-border bg-surface-raised overflow-hidden flex flex-col"
    >
      <BlockErrorBoundary blockLabel={block.label}>
        <Component block={block} />
      </BlockErrorBoundary>
    </div>
  );
};
