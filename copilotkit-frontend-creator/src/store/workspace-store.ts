import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type { BlockConfig, BlockType } from '@/types/blocks';
import type { WorkspaceConfig } from '@/types/workspace';
import { getBlockDefinition } from '@/registry/block-registry';
import type { WorkspaceTemplate } from '@/config/workspace-templates';

const MAX_UNDO_HISTORY = 50;
const MAX_BLOCKS = 24;

interface HistoryEntry {
  blocks: BlockConfig[];
  timestamp: number;
}

interface WorkspaceStore {
  workspace: WorkspaceConfig;
  mode: 'editor' | 'preview' | 'published' | 'codegen';

  // Undo/Redo history
  _undoStack: HistoryEntry[];
  _redoStack: HistoryEntry[];
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Multi-select
  selectedBlockIds: Set<string>;
  selectBlock: (id: string, additive?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  removeSelected: () => void;
  duplicateSelected: () => void;

  // Block operations
  addBlock: (type: BlockType) => void;
  removeBlock: (id: string) => void;
  duplicateBlock: (id: string) => void;
  updateBlock: (id: string, patch: Partial<BlockConfig>) => void;
  moveBlock: (id: string, x: number, y: number) => void;
  resizeBlock: (id: string, w: number, h: number) => void;
  reorderBlocks: (ids: string[]) => void;

  // Workspace operations
  setMode: (mode: 'editor' | 'preview' | 'published' | 'codegen') => void;
  setActiveConnection: (connectionId: string | null) => void;
  updateWorkspace: (patch: Partial<WorkspaceConfig>) => void;
  resetWorkspace: () => void;
  loadWorkspace: (config: WorkspaceConfig) => void;
  applyTemplate: (template: WorkspaceTemplate) => void;

  // Saved workspaces
  savedWorkspaces: Array<{ id: string; name: string; config: WorkspaceConfig }>;
  saveCurrentWorkspace: () => void;
  loadSavedWorkspace: (id: string) => void;
  deleteSavedWorkspace: (id: string) => void;
}

const defaultWorkspace: WorkspaceConfig = {
  id: uuid(),
  name: 'My Agent Frontend',
  template: 'default-agent-workspace',
  blocks: [],
  activeConnectionId: null,
  fallbackMode: 'generic-copilotkit-workspace',
  theme: 'dark',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/** Find the next available grid position for a new block */
function findNextAvailablePosition(blocks: BlockConfig[], w: number, h: number): { x: number; y: number } {
  if (blocks.length === 0) return { x: 0, y: 0 };
  // Build an occupancy grid
  const maxRow = blocks.reduce((max, b) => Math.max(max, b.y + b.h), 0) + h + 1;
  const grid: boolean[][] = Array.from({ length: maxRow }, () => Array(12).fill(false));
  for (const b of blocks) {
    for (let row = b.y; row < b.y + b.h; row++) {
      for (let col = b.x; col < Math.min(b.x + b.w, 12); col++) {
        if (row < maxRow) grid[row][col] = true;
      }
    }
  }
  // Scan for first position that fits
  for (let row = 0; row < maxRow; row++) {
    for (let col = 0; col <= 12 - w; col++) {
      let fits = true;
      for (let r = row; r < row + h && fits; r++) {
        for (let c = col; c < col + w && fits; c++) {
          if (r >= maxRow || grid[r][c]) fits = false;
        }
      }
      if (fits) return { x: col, y: row };
    }
  }
  // Fallback: place below everything
  return { x: 0, y: maxRow };
}

/** Push current blocks onto the undo stack before a mutation */
function pushUndo(state: WorkspaceStore): Partial<WorkspaceStore> {
  const entry: HistoryEntry = {
    blocks: state.workspace.blocks.map((b) => ({ ...b, props: { ...b.props } })),
    timestamp: Date.now(),
  };
  const stack = [...state._undoStack, entry].slice(-MAX_UNDO_HISTORY);
  return { _undoStack: stack, _redoStack: [] };
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      workspace: { ...defaultWorkspace },
      mode: 'editor',
      savedWorkspaces: [],
      _undoStack: [],
      _redoStack: [],
      selectedBlockIds: new Set<string>(),

      // ─── Undo / Redo ───
      canUndo: () => get()._undoStack.length > 0,
      canRedo: () => get()._redoStack.length > 0,

      undo: () => {
        const s = get();
        if (s._undoStack.length === 0) return;
        const prev = s._undoStack[s._undoStack.length - 1];
        const redoEntry: HistoryEntry = {
          blocks: s.workspace.blocks.map((b) => ({ ...b, props: { ...b.props } })),
          timestamp: Date.now(),
        };
        set({
          workspace: { ...s.workspace, blocks: prev.blocks, updatedAt: new Date().toISOString() },
          _undoStack: s._undoStack.slice(0, -1),
          _redoStack: [...s._redoStack, redoEntry],
          selectedBlockIds: new Set(),
        });
      },

      redo: () => {
        const s = get();
        if (s._redoStack.length === 0) return;
        const next = s._redoStack[s._redoStack.length - 1];
        const undoEntry: HistoryEntry = {
          blocks: s.workspace.blocks.map((b) => ({ ...b, props: { ...b.props } })),
          timestamp: Date.now(),
        };
        set({
          workspace: { ...s.workspace, blocks: next.blocks, updatedAt: new Date().toISOString() },
          _undoStack: [...s._undoStack, undoEntry],
          _redoStack: s._redoStack.slice(0, -1),
          selectedBlockIds: new Set(),
        });
      },

      // ─── Multi-select ───
      selectBlock: (id, additive = false) => {
        set((s) => {
          const next = new Set(additive ? s.selectedBlockIds : []);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return { selectedBlockIds: next };
        });
      },

      selectAll: () => {
        set((s) => ({
          selectedBlockIds: new Set(s.workspace.blocks.map((b) => b.id)),
        }));
      },

      clearSelection: () => set({ selectedBlockIds: new Set() }),

      removeSelected: () => {
        const s = get();
        if (s.selectedBlockIds.size === 0) return;
        set({
          ...pushUndo(s),
          workspace: {
            ...s.workspace,
            blocks: s.workspace.blocks.filter((b) => !s.selectedBlockIds.has(b.id)),
            updatedAt: new Date().toISOString(),
          },
          selectedBlockIds: new Set(),
        });
      },

      duplicateSelected: () => {
        const s = get();
        if (s.selectedBlockIds.size === 0) return;
        const blocks = [...s.workspace.blocks];
        const newIds = new Set<string>();
        for (const id of s.selectedBlockIds) {
          const block = blocks.find((b) => b.id === id);
          if (!block || blocks.length >= MAX_BLOCKS) continue;
          const pos = findNextAvailablePosition(blocks, block.w, block.h);
          const clone: BlockConfig = {
            ...block,
            id: uuid(),
            label: `${block.label} (copy)`,
            x: pos.x,
            y: pos.y,
            props: { ...block.props },
          };
          blocks.push(clone);
          newIds.add(clone.id);
        }
        set({
          ...pushUndo(s),
          workspace: { ...s.workspace, blocks, updatedAt: new Date().toISOString() },
          selectedBlockIds: newIds,
        });
      },

      // ─── Block operations ───
      addBlock: (type) => {
        const s = get();
        if (s.workspace.blocks.length >= MAX_BLOCKS) return;
        const def = getBlockDefinition(type);
        if (!def) return;
        // Find the next available position on the grid
        const pos = findNextAvailablePosition(s.workspace.blocks, def.defaultW, def.defaultH);
        const block: BlockConfig = {
          id: uuid(),
          type,
          label: def.label,
          x: pos.x,
          y: pos.y,
          w: def.defaultW,
          h: def.defaultH,
          props: { ...def.defaultProps },
          visible: true,
        };
        set({
          ...pushUndo(s),
          workspace: {
            ...s.workspace,
            blocks: [...s.workspace.blocks, block],
            updatedAt: new Date().toISOString(),
          },
        });
      },

      removeBlock: (id) => {
        const s = get();
        set({
          ...pushUndo(s),
          workspace: {
            ...s.workspace,
            blocks: s.workspace.blocks.filter((b) => b.id !== id),
            updatedAt: new Date().toISOString(),
          },
          selectedBlockIds: (() => {
            const next = new Set(s.selectedBlockIds);
            next.delete(id);
            return next;
          })(),
        });
      },

      duplicateBlock: (id) => {
        const s = get();
        if (s.workspace.blocks.length >= MAX_BLOCKS) return;
        const block = s.workspace.blocks.find((b) => b.id === id);
        if (!block) return;
        const pos = findNextAvailablePosition(s.workspace.blocks, block.w, block.h);
        const clone: BlockConfig = {
          ...block,
          id: uuid(),
          label: `${block.label} (copy)`,
          x: pos.x,
          y: pos.y,
          props: { ...block.props },
        };
        set({
          ...pushUndo(s),
          workspace: { ...s.workspace, blocks: [...s.workspace.blocks, clone], updatedAt: new Date().toISOString() },
        });
      },

      updateBlock: (id, patch) =>
        set((s) => ({
          workspace: {
            ...s.workspace,
            blocks: s.workspace.blocks.map((b) =>
              b.id === id ? { ...b, ...patch } : b
            ),
            updatedAt: new Date().toISOString(),
          },
        })),

      moveBlock: (id, x, y) => {
        const s = get();
        set({
          ...pushUndo(s),
          workspace: {
            ...s.workspace,
            blocks: s.workspace.blocks.map((b) =>
              b.id === id ? { ...b, x, y } : b
            ),
            updatedAt: new Date().toISOString(),
          },
        });
      },

      resizeBlock: (id, w, h) => {
        const s = get();
        set({
          ...pushUndo(s),
          workspace: {
            ...s.workspace,
            blocks: s.workspace.blocks.map((b) =>
              b.id === id ? { ...b, w, h } : b
            ),
            updatedAt: new Date().toISOString(),
          },
        });
      },

      reorderBlocks: (ids) => {
        const s = get();
        const map = new Map(s.workspace.blocks.map((b) => [b.id, b]));
        const reordered = ids.map((id) => map.get(id)!).filter(Boolean);
        set({
          ...pushUndo(s),
          workspace: {
            ...s.workspace,
            blocks: reordered,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      setMode: (mode) => set({ mode }),

      setActiveConnection: (connectionId) =>
        set((s) => ({
          workspace: {
            ...s.workspace,
            activeConnectionId: connectionId,
            updatedAt: new Date().toISOString(),
          },
        })),

      updateWorkspace: (patch) => {
        const s = get();
        set({
          ...pushUndo(s),
          workspace: {
            ...s.workspace,
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      resetWorkspace: () =>
        set({
          workspace: { ...defaultWorkspace, id: uuid(), createdAt: new Date().toISOString() },
          mode: 'editor',
          _undoStack: [],
          _redoStack: [],
          selectedBlockIds: new Set(),
        }),

      loadWorkspace: (config) => set({
        workspace: config,
        _undoStack: [],
        _redoStack: [],
        selectedBlockIds: new Set(),
      }),

      applyTemplate: (template) => {
        const s = get();
        const blocks: BlockConfig[] = [];
        for (const b of template.blocks) {
          const def = getBlockDefinition(b.type);
          const pos = findNextAvailablePosition(blocks, b.w, b.h);
          blocks.push({
            id: uuid(),
            type: b.type,
            label: def?.label || b.type,
            x: pos.x,
            y: pos.y,
            w: b.w,
            h: b.h,
            props: def ? { ...def.defaultProps } : {},
            visible: true,
          });
        }
        set({
          ...pushUndo(s),
          workspace: {
            ...s.workspace,
            blocks,
            template: template.id,
            updatedAt: new Date().toISOString(),
          },
          mode: 'editor',
          selectedBlockIds: new Set(),
        });
      },

      saveCurrentWorkspace: () => {
        const s = get();
        const existing = s.savedWorkspaces.find((w) => w.id === s.workspace.id);
        if (existing) {
          set({
            savedWorkspaces: s.savedWorkspaces.map((w) =>
              w.id === s.workspace.id ? { ...w, name: s.workspace.name, config: { ...s.workspace } } : w
            ),
          });
        } else {
          set({
            savedWorkspaces: [
              ...s.savedWorkspaces,
              { id: s.workspace.id, name: s.workspace.name, config: { ...s.workspace } },
            ],
          });
        }
      },

      loadSavedWorkspace: (id) => {
        const s = get();
        const saved = s.savedWorkspaces.find((w) => w.id === id);
        if (saved) set({
          workspace: { ...saved.config },
          _undoStack: [],
          _redoStack: [],
          selectedBlockIds: new Set(),
        });
      },

      deleteSavedWorkspace: (id) =>
        set((s) => ({
          savedWorkspaces: s.savedWorkspaces.filter((w) => w.id !== id),
        })),
    }),
    {
      name: 'copilotkit-workspace',
      partialize: (state) => ({
        workspace: state.workspace,
        mode: state.mode,
        savedWorkspaces: state.savedWorkspaces,
      }),
    }
  )
);
