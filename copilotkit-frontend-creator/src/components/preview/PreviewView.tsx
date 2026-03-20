import React, { useState } from 'react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useConnectionStore } from '@/store/connection-store';
import { RuntimeBlockRenderer } from '@/components/runtime/RuntimeBlockRenderer';
import { CopilotKitBridge } from '@/components/runtime/CopilotKitBridge';
import { FallbackWorkspace } from './FallbackWorkspace';
import { DiagnosticsPanel } from '@/components/diagnostics/DiagnosticsPanel';
import { LoadingSkeleton } from '@/components/runtime/LoadingSkeleton';
import { getCompatibleBlocks } from '@/adapters/runtime-adapter';
import { useMockPreview } from '@/hooks/useMockPreview';
import { DEFAULT_THEME } from '@/types/workspace';
import type { ThemeConfig } from '@/types/workspace';
import { AlertTriangle, Wifi, Loader2, Monitor, Tablet, Smartphone, Eye } from 'lucide-react';

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

  // Inject mock data when previewing without a connection
  useMockPreview();

  const activeConn = connections.find((c) => c.id === activeConnectionId);
  const visibleBlocks = workspace.blocks.filter((b) => b.visible).sort((a, b) => a.y - b.y || a.x - b.x);
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
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-surface-raised border-b border-border text-xs">
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
              <span className="text-txt-faint ml-1">— connect an agent for real responses</span>
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
        <CopilotKitBridge>{previewContent}</CopilotKitBridge>
      ) : (
        previewContent
      )}
    </div>
  );
};

import type { BlockConfig } from '@/types/blocks';

/**
 * Groups blocks into visual rows that mirror the editor canvas.
 * Blocks are first sorted by y then x. Within each y-group, blocks are
 * packed left-to-right into 12-column rows; when a block doesn't fit it
 * starts a new visual row. This ensures the preview matches the editor
 * even when blocks with the same y-value overflow past 12 columns.
 */
function buildVisualRows(blocks: BlockConfig[]): BlockConfig[][] {
  if (blocks.length === 0) return [];

  // 1. Group by y, sort groups by y, sort blocks within group by x
  const sorted = [...blocks].sort((a, b) => a.y - b.y || a.x - b.x);
  const yGroups = new Map<number, BlockConfig[]>();
  for (const b of sorted) {
    const arr = yGroups.get(b.y);
    if (arr) arr.push(b);
    else yGroups.set(b.y, [b]);
  }

  const rows: BlockConfig[][] = [];
  const yKeys = Array.from(yGroups.keys()).sort((a, b) => a - b);

  for (const y of yKeys) {
    const group = yGroups.get(y)!;
    // Pack into 12-col rows
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
  <div className="flex bg-surface rounded-md p-0.5 gap-0.5">
    {([
      { key: 'desktop' as const, icon: Monitor, label: 'Desktop' },
      { key: 'tablet' as const, icon: Tablet, label: 'Tablet' },
      { key: 'mobile' as const, icon: Smartphone, label: 'Mobile' },
    ]).map(({ key, icon: Icon, label }) => (
      <button
        key={key}
        onClick={() => setViewport(key)}
        title={label}
        className={`p-1.5 rounded transition-all ${
          viewport === key ? 'bg-accent text-white' : 'text-txt-muted hover:text-txt-secondary'
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
