import { create } from 'zustand';

// ─── Agent Chat State ───
// Manages chat messages and streaming state.
// In production, this integrates with CopilotKit's useCopilotChat.
// For standalone mode, it provides a local simulation layer.

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface AgentChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  sendMessage: (content: string) => void;
  addAssistantMessage: (content: string) => void;
  setStreaming: (streaming: boolean) => void;
  clearMessages: () => void;
}

export const useAgentChat = create<AgentChatState>((set, get) => ({
  messages: [],
  isStreaming: false,

  sendMessage: (content) => {
    const userMsg: ChatMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, userMsg], isStreaming: true }));

    // Simulate agent response for demo/preview mode
    // In production, CopilotKit handles this via the runtime
    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: `Received: "${content}". Connect an agent to get real responses.`,
        timestamp: new Date().toISOString(),
      };
      set((s) => ({ messages: [...s.messages, assistantMsg], isStreaming: false }));
    }, 1000);
  },

  addAssistantMessage: (content) => {
    const msg: ChatMessage = {
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, msg] }));
  },

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  clearMessages: () => set({ messages: [] }),
}));
