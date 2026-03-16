import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type { BlockConfig, BlockType } from '@/types/blocks';
import type { WorkspaceConfig } from '@/types/workspace';
import { getBlockDefinition } from '@/registry/block-registry';
import type { WorkspaceTemplate } from '@/config/workspace-templates';

interface WorkspaceStore {
  workspace: WorkspaceConfig;
  mode: 'editor' | 'preview' | 'published';

  // Block operations
  addBlock: (type: BlockType) => void;
  removeBlock: (id: string) => void;
  duplicateBlock: (id: string) => void;
  updateBlock: (id: string, patch: Partial<BlockConfig>) => void;
  moveBlock: (id: string, x: number, y: number) => void;
  resizeBlock: (id: string, w: number, h: number) => void;
  reorderBlocks: (ids: string[]) => void;

  // Workspace operations
  setMode: (mode: 'editor' | 'preview' | 'published') => void;
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

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      workspace: { ...defaultWorkspace },
      mode: 'editor',
      savedWorkspaces: [],

      addBlock: (type) => {
        const def = getBlockDefinition(type);
        if (!def) return;
        const block: BlockConfig = {
          id: uuid(),
          type,
          label: def.label,
          x: 0,
          y: 0,
          w: def.defaultW,
          h: def.defaultH,
          props: { ...def.defaultProps },
          visible: true,
        };
        set((s) => ({
          workspace: {
            ...s.workspace,
            blocks: [...s.workspace.blocks, block],
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      removeBlock: (id) =>
        set((s) => ({
          workspace: {
            ...s.workspace,
            blocks: s.workspace.blocks.filter((b) => b.id !== id),
            updatedAt: new Date().toISOString(),
          },
        })),

      duplicateBlock: (id) => {
        const s = get();
        const block = s.workspace.blocks.find((b) => b.id === id);
        if (!block) return;
        const clone: BlockConfig = {
          ...block,
          id: uuid(),
          label: `${block.label} (copy)`,
          props: { ...block.props },
        };
        const idx = s.workspace.blocks.indexOf(block);
        const blocks = [...s.workspace.blocks];
        blocks.splice(idx + 1, 0, clone);
        set({
          workspace: { ...s.workspace, blocks, updatedAt: new Date().toISOString() },
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

      moveBlock: (id, x, y) =>
        set((s) => ({
          workspace: {
            ...s.workspace,
            blocks: s.workspace.blocks.map((b) =>
              b.id === id ? { ...b, x, y } : b
            ),
            updatedAt: new Date().toISOString(),
          },
        })),

      resizeBlock: (id, w, h) =>
        set((s) => ({
          workspace: {
            ...s.workspace,
            blocks: s.workspace.blocks.map((b) =>
              b.id === id ? { ...b, w, h } : b
            ),
            updatedAt: new Date().toISOString(),
          },
        })),

      reorderBlocks: (ids) =>
        set((s) => {
          const map = new Map(s.workspace.blocks.map((b) => [b.id, b]));
          const reordered = ids.map((id) => map.get(id)!).filter(Boolean);
          return {
            workspace: {
              ...s.workspace,
              blocks: reordered,
              updatedAt: new Date().toISOString(),
            },
          };
        }),

      setMode: (mode) => set({ mode }),

      setActiveConnection: (connectionId) =>
        set((s) => ({
          workspace: {
            ...s.workspace,
            activeConnectionId: connectionId,
            updatedAt: new Date().toISOString(),
          },
        })),

      updateWorkspace: (patch) =>
        set((s) => ({
          workspace: {
            ...s.workspace,
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        })),

      resetWorkspace: () =>
        set({
          workspace: { ...defaultWorkspace, id: uuid(), createdAt: new Date().toISOString() },
          mode: 'editor',
        }),

      loadWorkspace: (config) => set({ workspace: config }),

      applyTemplate: (template) => {
        const blocks: BlockConfig[] = template.blocks.map((b) => {
          const def = getBlockDefinition(b.type);
          return {
            id: uuid(),
            type: b.type,
            label: def?.label || b.type,
            x: 0,
            y: 0,
            w: b.w,
            h: b.h,
            props: def ? { ...def.defaultProps } : {},
            visible: true,
          };
        });
        set((s) => ({
          workspace: {
            ...s.workspace,
            blocks,
            template: template.id,
            updatedAt: new Date().toISOString(),
          },
          mode: 'editor',
        }));
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
        if (saved) set({ workspace: { ...saved.config } });
      },

      deleteSavedWorkspace: (id) =>
        set((s) => ({
          savedWorkspaces: s.savedWorkspaces.filter((w) => w.id !== id),
        })),
    }),
    { name: 'copilotkit-workspace' }
  )
);
