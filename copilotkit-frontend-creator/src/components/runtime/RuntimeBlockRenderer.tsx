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
import { TraceViewerBlock } from './blocks/TraceViewerBlock';
import { FeedbackBlock } from './blocks/FeedbackBlock';
import { DatasetBlock } from './blocks/DatasetBlock';
import { AnnotationQueueBlock } from './blocks/AnnotationQueueBlock';
import { ReasoningChainBlock } from './blocks/ReasoningChainBlock';
import { SubAgentTreeBlock } from './blocks/SubAgentTreeBlock';
import { DepthIndicatorBlock } from './blocks/DepthIndicatorBlock';

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
  // LangSmith blocks
  traceViewer: TraceViewerBlock,
  feedback: FeedbackBlock,
  dataset: DatasetBlock,
  annotationQueue: AnnotationQueueBlock,
  // Deep Agent blocks
  reasoningChain: ReasoningChainBlock,
  subAgentTree: SubAgentTreeBlock,
  depthIndicator: DepthIndicatorBlock,
};

export const RuntimeBlockRenderer: React.FC<{ block: BlockConfig }> = ({ block }) => {
  if (!block.visible) return null;
  const Component = BLOCK_COMPONENTS[block.type] || PanelBlock;

  return (
    <div
      style={{ gridColumn: `span ${block.w}`, minHeight: `${block.h * 50}px` }}
      className="rounded-2xl border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),_0_4px_16px_rgba(0,0,0,0.3)] bg-surface-raised overflow-hidden flex flex-col transition-all duration-300 hover:shadow-[0_8px_32px_rgba(139,92,246,0.15)] hover:border-accent/30"
    >
      <BlockErrorBoundary blockLabel={block.label}>
        <Component block={block} />
      </BlockErrorBoundary>
    </div>
  );
};
