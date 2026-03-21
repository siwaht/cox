import React, { useEffect, useRef } from 'react';
import { useCopilotChat } from '@copilotkit/react-core';
import { useAgentState } from '@/hooks/useAgentState';

/**
 * Bridges CopilotKit chat events into the local agent state store.
 *
 * Watches `visibleMessages` from useCopilotChat and syncs tool calls,
 * status, and messages into useAgentState so blocks like ToolActivityBlock,
 * LogsBlock, and StatusBlock render real data from the deep agent.
 *
 * Must be rendered inside a CopilotKit provider (placed in CopilotKitBridge).
 */
export const CopilotAgentEventsSync: React.FC = () => {
  const { visibleMessages, isLoading } = useCopilotChat();
  const {
    setStatus,
    addToolCall,
    updateToolCall,
    addLog,
    setLastMessage,
  } = useAgentState();
  const seenIds = useRef(new Set<string>());

  // Sync loading state → agent status
  useEffect(() => {
    setStatus(isLoading ? 'running' : 'idle');
  }, [isLoading, setStatus]);

  // Extract tool calls and results from CopilotKit messages
  useEffect(() => {
    if (!visibleMessages) return;

    for (const msg of visibleMessages as any[]) {
      const msgId: string = msg.id || '';

      // Assistant text messages → last message for StatusBlock
      if (msg.role === 'assistant' && msg.content) {
        const content =
          typeof msg.content === 'string'
            ? msg.content
            : msg.content?.text || '';
        if (content) setLastMessage(content);
      }

      // Action execution messages (tool calls in progress)
      if (msg.isActionExecution || msg.role === 'function') {
        const name: string = msg.name || msg.toolName || 'unknown_tool';
        const key = `exec-${name}-${msgId}`;

        if (!seenIds.current.has(key)) {
          seenIds.current.add(key);
          addToolCall({
            name,
            args: msg.arguments || msg.args || undefined,
            status: 'running',
          });
          addLog('info', `Tool call: ${name}`);
        }

        // If the message already carries a result, mark complete
        if (msg.result !== undefined || msg.status === 'complete') {
          updateToolCall(name, { result: msg.result, status: 'success' });
        }
      }

      // Action result messages
      if (msg.isActionExecutionResult || msg.isResult) {
        const name: string = msg.actionName || msg.name || 'unknown_tool';
        const key = `result-${name}-${msgId}`;

        if (!seenIds.current.has(key)) {
          seenIds.current.add(key);
          updateToolCall(name, { result: msg.result, status: 'success' });
          addLog('info', `Tool result: ${name}`);
        }
      }
    }
  }, [visibleMessages, addToolCall, updateToolCall, addLog, setLastMessage]);

  return null;
};