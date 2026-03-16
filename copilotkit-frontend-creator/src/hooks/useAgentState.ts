import { create } from 'zustand';

// ─── Agent Runtime State ───
// Tracks all agent state: tool calls, approvals, logs, results, status.
// In production, this is populated by CopilotKit runtime events.

export interface ToolCall {
  name: string;
  args?: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'running' | 'success' | 'error';
  duration?: string;
}

export interface Approval {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  data?: unknown;
}

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
}

interface AgentState {
  status: 'idle' | 'running' | 'success' | 'error' | 'waiting';
  progress: number | null;
  results: unknown[];
  toolCalls: ToolCall[];
  approvals: Approval[];
  logs: LogEntry[];
  lastMessage: string;

  setStatus: (status: AgentState['status']) => void;
  setProgress: (progress: number | null) => void;
  addResult: (result: unknown) => void;
  addToolCall: (tc: ToolCall) => void;
  updateToolCall: (name: string, patch: Partial<ToolCall>) => void;
  addApproval: (approval: Approval) => void;
  respondToApproval: (id: string, approved: boolean) => void;
  addLog: (level: LogEntry['level'], message: string) => void;
  setLastMessage: (msg: string) => void;
  reset: () => void;
}

export const useAgentState = create<AgentState>((set) => ({
  status: 'idle',
  progress: null,
  results: [],
  toolCalls: [],
  approvals: [],
  logs: [],
  lastMessage: '',

  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  addResult: (result) => set((s) => ({ results: [...s.results, result] })),

  addToolCall: (tc) => set((s) => ({ toolCalls: [...s.toolCalls, tc] })),
  updateToolCall: (name, patch) =>
    set((s) => ({
      toolCalls: s.toolCalls.map((tc) =>
        tc.name === name ? { ...tc, ...patch } : tc
      ),
    })),

  addApproval: (approval) => set((s) => ({ approvals: [...s.approvals, approval] })),
  respondToApproval: (id, approved) =>
    set((s) => ({
      approvals: s.approvals.map((a) =>
        a.id === id ? { ...a, status: approved ? 'approved' : 'rejected' } : a
      ),
    })),

  addLog: (level, message) =>
    set((s) => ({
      logs: [...s.logs, { level, message, timestamp: new Date().toLocaleTimeString() }],
    })),

  setLastMessage: (msg) => set({ lastMessage: msg }),
  reset: () =>
    set({
      status: 'idle',
      progress: null,
      results: [],
      toolCalls: [],
      approvals: [],
      logs: [],
      lastMessage: '',
    }),
}));
