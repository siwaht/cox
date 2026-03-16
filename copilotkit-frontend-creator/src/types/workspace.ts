// ─── Workspace / Project Types ───

import type { BlockConfig } from './blocks';
import type { ConnectionProfile } from './connections';

export interface ThemeConfig {
  accentColor: string;
  bgColor: string;
  surfaceColor: string;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  fontFamily: 'system' | 'inter' | 'mono';
}

export const DEFAULT_THEME: ThemeConfig = {
  accentColor: '#6366f1',
  bgColor: '#0c0c0e',
  surfaceColor: '#18181b',
  borderRadius: 'lg',
  fontFamily: 'system',
};

export interface WorkspaceConfig {
  id: string;
  name: string;
  template: string;
  blocks: BlockConfig[];
  activeConnectionId: string | null;
  fallbackMode: 'generic-copilotkit-workspace' | 'minimal' | 'chat-only';
  theme: 'dark' | 'light';
  customTheme?: ThemeConfig;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectState {
  workspace: WorkspaceConfig;
  connections: ConnectionProfile[];
  /** Current view mode */
  mode: 'editor' | 'preview' | 'published';
}
