import { useEffect, useRef } from 'react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useConnectionStore } from '@/store/connection-store';
import { useAgentChat } from '@/hooks/useAgentChat';
import { useAgentState } from '@/hooks/useAgentState';
import {
  MOCK_MESSAGES,
  MOCK_TOOL_CALLS,
  MOCK_APPROVALS,
  MOCK_LOGS,
  MOCK_RESULTS,
} from '@/config/mock-preview-data';

/**
 * Populates agent state with mock data when in preview mode
 * without an active connection. Cleans up on exit.
 */
export function useMockPreview() {
  const mode = useWorkspaceStore((s) => s.mode);
  const connectionStatus = useConnectionStore((s) => s.connectionStatus);
  const injected = useRef(false);

  const isPreviewWithoutAgent =
    (mode === 'preview' || mode === 'published') && connectionStatus !== 'connected';

  useEffect(() => {
    if (!isPreviewWithoutAgent) {
      if (injected.current) {
        // Clean up mock data when leaving preview or connecting
        useAgentChat.setState({ messages: [], isStreaming: false });
        useAgentState.setState({
          status: 'idle', progress: null, results: [],
          toolCalls: [], approvals: [], logs: [], lastMessage: '',
        });
        injected.current = false;
      }
      return;
    }

    if (injected.current) return;
    injected.current = true;

    // Inject mock data into stores
    useAgentChat.setState({ messages: MOCK_MESSAGES, isStreaming: false });
    useAgentState.setState({
      status: 'running',
      progress: 72,
      results: MOCK_RESULTS,
      toolCalls: MOCK_TOOL_CALLS,
      approvals: MOCK_APPROVALS,
      logs: MOCK_LOGS,
      lastMessage: '## Q4 Sales Analysis\n\nWest region leads with **$4.2M** revenue and **23.5%** QoQ growth.',
    });

    return () => {
      // Clean up on unmount
      if (injected.current) {
        useAgentChat.setState({ messages: [], isStreaming: false });
        useAgentState.setState({
          status: 'idle', progress: null, results: [],
          toolCalls: [], approvals: [], logs: [], lastMessage: '',
        });
        injected.current = false;
      }
    };
  }, [isPreviewWithoutAgent]);
}
