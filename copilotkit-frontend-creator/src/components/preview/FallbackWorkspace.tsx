import React from 'react';
import { RuntimeBlockRenderer } from '@/components/runtime/RuntimeBlockRenderer';
import type { BlockConfig } from '@/types/blocks';

const FALLBACK_BLOCKS: BlockConfig[] = [
  { id: 'fb-chat', type: 'chat', label: 'Chat', x: 0, y: 0, w: 8, h: 5, props: { showTimestamps: true, showAvatars: true }, visible: true },
  { id: 'fb-status', type: 'status', label: 'Status', x: 8, y: 0, w: 4, h: 1, props: {}, visible: true },
  { id: 'fb-results', type: 'results', label: 'Results', x: 8, y: 1, w: 4, h: 2, props: { format: 'auto' }, visible: true },
  { id: 'fb-tools', type: 'toolActivity', label: 'Tool Activity', x: 8, y: 3, w: 4, h: 2, props: { showArgs: true, showResults: true }, visible: true },
  { id: 'fb-logs', type: 'logs', label: 'Logs', x: 0, y: 5, w: 12, h: 2, props: { level: 'info', autoScroll: true }, visible: true },
];

export const FallbackWorkspace: React.FC = () => (
  <div className="flex-1 overflow-y-auto p-3 sm:p-6">
    <div className="max-w-6xl mx-auto">
      <p className="text-xs text-txt-faint text-center mb-4">
        Default workspace — add blocks in the editor or connect an agent
      </p>
      <div className="grid grid-cols-6 sm:grid-cols-12 gap-2.5 auto-rows-min">
        {FALLBACK_BLOCKS.map((block) => (
          <RuntimeBlockRenderer key={block.id} block={block} />
        ))}
      </div>
    </div>
  </div>
);
