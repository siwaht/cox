import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useConnectionStore } from '@/store/connection-store';
import { useAgentState } from '@/hooks/useAgentState';
import { BlockErrorBoundary } from './BlockErrorBoundary';

// Context to let child components know they're inside a live Tambo provider
const TamboLiveContext = createContext(false);
export const useTamboLive = () => useContext(TamboLiveContext);

interface TamboMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown>; result?: unknown }>;
}

interface TamboThread {
  id: string;
  messages: TamboMessage[];
}

// Tambo context for child components to interact with the agent
interface TamboContextValue {
  thread: TamboThread | null;
  sendMessage: (content: string) => Promise<void>;
  isStreaming: boolean;
}

const TamboContext = createContext<TamboContextValue>({
  thread: null,
  sendMessage: async () => {},
  isStreaming: false,
});

export const useTamboContext = () => useContext(TamboContext);

interface Props {
  children: React.ReactNode;
}

/**
 * TamboBridge connects to a Tambo-compatible agent backend.
 * Tambo uses a REST/streaming API pattern:
 *   POST /api/threads       → create thread
 *   POST /api/threads/:id/messages → send message
 *   GET  /api/threads/:id/stream   → SSE stream
 *
 * This bridge manages the thread lifecycle and syncs events
 * to the shared AgentState store so all blocks work identically
 * whether using CopilotKit or Tambo.
 */
export const TamboBridge: React.FC<Props> = ({ children }) => {
  const { activeConnectionId, connections, connectionStatus } = useConnectionStore();
  const activeConn = connections.find((c) => c.id === activeConnectionId);
  const agentState = useAgentState();
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [thread, setThread] = useState<TamboThread | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const isLive = !!activeConn && connectionStatus === 'connected' && activeConn.frontend === 'tambo';

  useEffect(() => {
    if (activeConn && activeConn.frontend === 'tambo') {
      console.log('[TamboBridge] status=%s, live=%s, url=%s', connectionStatus, isLive, activeConn.baseUrl);
    }
    setBridgeError(null);
  }, [connectionStatus, isLive, activeConn]);

  // Create a thread on mount when connected
  useEffect(() => {
    if (!isLive || !activeConn) return;
    const base = activeConn.baseUrl.replace(/\/+$/, '');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (activeConn.auth.tokenValue) {
      headers['Authorization'] = `Bearer ${activeConn.auth.tokenValue}`;
    }

    fetch(`${base}/api/threads`, { method: 'POST', headers, body: JSON.stringify({}) })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to create thread: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setThread({ id: data.id || data.thread_id, messages: [] });
        agentState.addLog('info', 'Tambo thread created');
      })
      .catch((err) => {
        setBridgeError(err.message);
        agentState.addLog('error', `Tambo thread creation failed: ${err.message}`);
      });

    return () => {
      abortRef.current?.abort();
    };
  }, [isLive, activeConn]);

  const sendMessage = useCallback(async (content: string) => {
    if (!activeConn || !thread) return;
    const base = activeConn.baseUrl.replace(/\/+$/, '');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (activeConn.auth.tokenValue) {
      headers['Authorization'] = `Bearer ${activeConn.auth.tokenValue}`;
    }

    // Add user message to thread
    setThread((prev) => prev ? {
      ...prev,
      messages: [...prev.messages, { role: 'user', content }],
    } : prev);

    agentState.setStatus('running');
    agentState.setLastMessage(content);
    setIsStreaming(true);

    try {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const res = await fetch(`${base}/api/threads/${thread.id}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content, role: 'user' }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`Tambo message failed: ${res.status}`);

      // Try SSE streaming if available, otherwise use JSON response
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream')) {
        await handleSSEStream(res, agentState, setThread);
      } else {
        const data = await res.json();
        const assistantMsg: TamboMessage = {
          role: 'assistant',
          content: data.content || data.message || JSON.stringify(data),
          toolCalls: data.tool_calls,
        };
        setThread((prev) => prev ? {
          ...prev,
          messages: [...prev.messages, assistantMsg],
        } : prev);
        agentState.setLastMessage(assistantMsg.content);

        if (data.tool_calls) {
          for (const tc of data.tool_calls) {
            agentState.addToolCall({
              name: tc.name,
              args: tc.args,
              result: tc.result,
              status: tc.result ? 'success' : 'pending',
            });
          }
        }
      }

      agentState.setStatus('success');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setBridgeError(err.message);
        agentState.setStatus('error');
        agentState.addLog('error', err.message);
      }
    } finally {
      setIsStreaming(false);
    }
  }, [activeConn, thread, agentState]);

  if (!isLive || !activeConn) {
    return <>{children}</>;
  }

  if (bridgeError) {
    return (
      <>
        <div className="px-4 py-2 bg-danger-soft border-b border-danger/20 text-xs text-danger flex items-center gap-2">
          <span className="line-clamp-2">
            Tambo connection error:{' '}
            {bridgeError.length > 200 ? bridgeError.slice(0, 200) + '…' : bridgeError}
          </span>
          <button
            onClick={() => setBridgeError(null)}
            className="text-2xs underline hover:no-underline shrink-0"
          >
            Dismiss
          </button>
        </div>
        {children}
      </>
    );
  }

  return (
    <BlockErrorBoundary blockLabel="Tambo Bridge">
      <TamboLiveContext.Provider value={true}>
        <TamboContext.Provider value={{ thread, sendMessage, isStreaming }}>
          {children}
        </TamboContext.Provider>
      </TamboLiveContext.Provider>
    </BlockErrorBoundary>
  );
};

/** Handle Server-Sent Events stream from Tambo backend */
async function handleSSEStream(
  res: Response,
  agentState: {
    setLastMessage: (msg: string) => void;
    addToolCall: (tc: { name: string; args?: Record<string, unknown>; result?: unknown; status: 'pending' | 'running' | 'success' | 'error' }) => void;
    updateToolCall: (name: string, patch: Partial<{ result: unknown; status: 'pending' | 'running' | 'success' | 'error' }>) => void;
    setStatus: (status: 'idle' | 'running' | 'success' | 'error' | 'waiting') => void;
  },
  setThread: React.Dispatch<React.SetStateAction<TamboThread | null>>,
) {
  const reader = res.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';
  let assistantContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const event = JSON.parse(data);
          if (event.type === 'message' || event.content) {
            assistantContent += event.content || event.delta || '';
            agentState.setLastMessage(assistantContent);
          }
          if (event.type === 'tool_call') {
            agentState.addToolCall({
              name: event.name,
              args: event.args,
              status: 'running',
            });
          }
          if (event.type === 'tool_result') {
            agentState.updateToolCall(event.name, {
              result: event.result,
              status: 'success',
            });
          }
          if (event.type === 'status') {
            agentState.setStatus(event.status || 'running');
          }
        } catch {
          // Non-JSON SSE data, treat as text
          assistantContent += data;
          agentState.setLastMessage(assistantContent);
        }
      }
    }
  }

  if (assistantContent) {
    setThread((prev) => prev ? {
      ...prev,
      messages: [...prev.messages, { role: 'assistant', content: assistantContent }],
    } : prev);
  }
}
