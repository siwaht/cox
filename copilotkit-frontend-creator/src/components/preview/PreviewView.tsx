import React, { useState } from 'react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useConnectionStore } from '@/store/connection-store';
import { RuntimeBlockRenderer } from '@/components/runtime/RuntimeBlockRenderer';
import { CopilotKitBridge } from '@/components/runtime/CopilotKitBridge';
import { TamboBridge } from '@/components/runtime/TamboBridge';
import { FallbackWorkspace } from './FallbackWorkspace';
import { DiagnosticsPanel } from '@/components/diagnostics/DiagnosticsPanel';
import { LoadingSkeleton } from '@/components/runtime/LoadingSkeleton';
import { getCompatibleBlocks } from '@/adapters/runtime-adapter';
import { useMockPreview } from '@/hooks/useMockPreview';
import { DEFAULT_THEME } from '@/types/workspace';
import type { ThemeConfig } from '@/types/workspace';
import { AlertTriangle, Wifi, Loader2, Monitor, Tablet, Smartphone, Eye, Plug } from 'lucide-react';
import { AgentHub } from '@/components/connections/AgentHub';

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

const VIEWPORT_WIDTHS: Record<ViewportSize, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

export const PreviewView: React.FC = () => {
  const { workspace } = useWorkspaceStore();
  const { activeConnectionId, connections, validationResult, connectionStatus } = useConnectionStore();
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [showAgentHub, setShowAgentHub] = useState(false);

  // Inject mock data when previewing without a connection
  useMockPreview();

  const activeConn = connections.find((c) => c.id === activeConnectionId);
  const visibleBlocks = workspace.blocks.filter((b) => b.visible);
  const theme = workspace.customTheme || DEFAULT_THEME;
  const themeStyle = buildThemeStyle(theme);

  // Show skeleton while validating
  if (connectionStatus === 'validating') {
    return (
      <div className="h-full flex flex-col" style={themeStyle}>
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-surface-raised border-b border-border text-xs text-warning">
          <Loader2 size={12} className="animate-spin" />
          <span>Connecting to agent...</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          <div className="max-w-6xl mx-auto grid grid-cols-6 sm:grid-cols-12 gap-2.5 auto-rows-min">
            {(visibleBlocks.length > 0 ? visibleBlocks : [{ w: 8 }, { w: 4 }, { w: 4 }, { w: 12 }]).map((b, i) => (
              <div key={i} style={{ gridColumn: `span ${b.w}` }}
                className="rounded-xl border border-border bg-surface-raised overflow-hidden">
                <LoadingSkeleton rows={2} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isConnected = activeConn && connectionStatus === 'connected';
  const capabilities = validationResult?.capabilities || ['chat'];
  const blockTypes = visibleBlocks.map((b) => b.type);
  const { unsupported } = isConnected ? getCompatibleBlocks(capabilities, blockTypes) : { unsupported: [] };
  const hasErrors = validationResult?.errors && validationResult.errors.length > 0;

  const previewContent = (
    <>
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-surface-raised border-b border-border/40 text-xs">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Wifi size={12} className="text-success" />
              <span className="text-txt-secondary">
                <span className="text-txt-primary font-medium">{activeConn.name}</span>
                <span className="text-txt-faint ml-1.5">({activeConn.frontend} + {activeConn.runtime})</span>
              </span>
            </>
          ) : (
            <>
              <Eye size={12} className="text-accent" />
              <span className="text-accent font-medium">Preview with sample data</span>
              <button
                onClick={() => setShowAgentHub(true)}
                className="ml-2 flex items-center gap-1 px-2.5 py-1 text-2xs bg-accent/10 text-accent
                           rounded-lg hover:bg-accent/20 transition-colors font-medium"
              >
                <Plug size={10} /> Connect Agent
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Responsive toggle */}
          <ViewportToggle viewport={viewport} setViewport={setViewport} />

          {unsupported.length > 0 && (
            <div className="flex items-center gap-1.5 text-warning ml-2">
              <AlertTriangle size={12} />
              <span>{unsupported.length} block(s) unsupported</span>
            </div>
          )}
        </div>
      </div>

      {hasErrors && isConnected && (
        <div className="px-4 py-2.5 bg-danger-soft border-b border-danger/20 max-h-32 overflow-y-auto">
          <DiagnosticsPanel errors={validationResult!.errors} warnings={validationResult!.warnings} compact />
        </div>
      )}

      {/* Viewport wrapper */}
      <div className="flex-1 overflow-y-auto flex justify-center">
        <div
          className={`w-full transition-all duration-300 ${viewport !== 'desktop' ? 'border-x border-border' : ''}`}
          style={{ maxWidth: VIEWPORT_WIDTHS[viewport] }}
        >
          {visibleBlocks.length > 0 ? (
            <BlockGrid blocks={visibleBlocks} />
          ) : (
            <FallbackWorkspace />
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="h-full flex flex-col" style={themeStyle}>
      {isConnected ? (
        activeConn.frontend === 'tambo' ? (
          <TamboBridge>{previewContent}</TamboBridge>
        ) : (
          <CopilotKitBridge>{previewContent}</CopilotKitBridge>
        )
      ) : (
        previewContent
      )}
      {showAgentHub && <AgentHub onClose={() => setShowAgentHub(false)} />}
    </div>
  );
};

import type { BlockConfig } from '@/types/blocks';

/**
 * Groups blocks into visual rows that mirror the editor canvas.
 *
 * The editor's computeVisualRows groups by y, sorts by x within each group,
 * then renders each group as a CSS grid row (repeat(12, 1fr)).  When blocks
 * in the same y-group exceed 12 columns, CSS grid wraps them to a new line
 * in DOM order.
 *
 * We replicate that exact behaviour here:
 *  1. Preserve the original array index as a stable tiebreaker (the editor
 *     renders blocks in array order when y and x are equal).
 *  2. Group by y, sort within each group by x then by original index.
 *  3. Pack each group into 12-column visual rows so overflow blocks start
 *     a new row — matching the CSS grid wrapping the editor relies on.
 */
function buildVisualRows(blocks: BlockConfig[]): BlockConfig[][] {
  if (blocks.length === 0) return [];

  // Tag each block with its original array position
  const tagged = blocks.map((b, i) => ({ block: b, idx: i }));

  // Sort by y, then x, then original index (stable tiebreaker)
  tagged.sort((a, b) => a.block.y - b.block.y || a.block.x - b.block.x || a.idx - b.idx);

  // Group by y
  const yGroups = new Map<number, BlockConfig[]>();
  for (const { block } of tagged) {
    const arr = yGroups.get(block.y);
    if (arr) arr.push(block);
    else yGroups.set(block.y, [block]);
  }

  const rows: BlockConfig[][] = [];
  const yKeys = Array.from(yGroups.keys()).sort((a, b) => a - b);

  for (const y of yKeys) {
    const group = yGroups.get(y)!;
    // Pack into 12-col visual rows (mirrors CSS grid wrapping)
    let currentRow: BlockConfig[] = [];
    let usedCols = 0;
    for (const block of group) {
      if (usedCols + block.w > 12 && currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [];
        usedCols = 0;
      }
      currentRow.push(block);
      usedCols += block.w;
    }
    if (currentRow.length > 0) rows.push(currentRow);
  }

  return rows;
}

const BlockGrid: React.FC<{ blocks: BlockConfig[] }> = ({ blocks }) => {
  const rows = buildVisualRows(blocks);

  return (
    <div className="p-3 sm:p-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-2.5">
        {rows.map((rowBlocks, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-6 sm:grid-cols-12 gap-2.5 auto-rows-min">
            {rowBlocks.map((block) => (
              <RuntimeBlockRenderer key={block.id} block={block} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const ViewportToggle: React.FC<{
  viewport: ViewportSize;
  setViewport: (v: ViewportSize) => void;
}> = ({ viewport, setViewport }) => (
  <div className="flex bg-surface rounded-lg p-0.5 gap-0.5 border border-border/40">
    {([
      { key: 'desktop' as const, icon: Monitor, label: 'Desktop' },
      { key: 'tablet' as const, icon: Tablet, label: 'Tablet' },
      { key: 'mobile' as const, icon: Smartphone, label: 'Mobile' },
    ]).map(({ key, icon: Icon, label }) => (
      <button
        key={key}
        onClick={() => setViewport(key)}
        title={label}
        className={`p-1.5 rounded-md transition-all ${
          viewport === key ? 'bg-accent text-white shadow-sm shadow-accent/20' : 'text-txt-muted hover:text-txt-secondary'
        }`}
      >
        <Icon size={12} />
      </button>
    ))}
  </div>
);

function buildThemeStyle(theme: ThemeConfig): React.CSSProperties {
  return {
    '--theme-accent': theme.accentColor,
    '--theme-bg': theme.bgColor,
    '--theme-surface': theme.surfaceColor,
  } as React.CSSProperties;
}
