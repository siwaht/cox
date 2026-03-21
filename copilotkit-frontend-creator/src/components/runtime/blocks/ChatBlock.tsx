import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { BlockConfig } from '@/types/blocks';
import { Send, Bot, User } from 'lucide-react';
import { useAgentChat } from '@/hooks/useAgentChat';
import { useCopilotLive } from '@/components/runtime/CopilotKitBridge';
import { useCopilotChat } from '@copilotkit/react-core';

// ─── Unified message shape for rendering ───
interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Live Chat (inside CopilotKit provider) ───
const LiveChatBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const { visibleMessages, appendMessage, isLoading } = useCopilotChat();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages: DisplayMessage[] = (visibleMessages || [])
    .filter((m: any) => m.role === 'user' || m.role === 'assistant')
    .map((m: any) => ({
      role: m.role as 'user' | 'assistant',
      content:
        typeof m.content === 'string'
          ? m.content
          : m.content?.text || String(m.content || ''),
    }));

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      const { TextMessage, MessageRole } = await import(
        '@copilotkit/runtime-client-gql'
      );
      await appendMessage(
        new TextMessage({ content: text, role: MessageRole.User }),
      );
    } catch (err) {
      console.error('[ChatBlock] Failed to send message:', err);
    } finally {
      setSending(false);
    }
  }, [input, isLoading, sending, appendMessage]);

  return (
    <ChatUI
      block={block}
      messages={messages}
      isStreaming={isLoading || sending}
      input={input}
      setInput={setInput}
      onSend={handleSend}
      scrollRef={scrollRef}
    />
  );
};

// ─── Preview Chat (mock/standalone mode) ───
const PreviewChatBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const { messages, isStreaming, sendMessage } = useAgentChat();
  const [input, setInput] = useState('');

  const displayMessages: DisplayMessage[] = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput('');
  };

  return (
    <ChatUI
      block={block}
      messages={displayMessages}
      isStreaming={isStreaming}
      input={input}
      setInput={setInput}
      onSend={handleSend}
    />
  );
};


// ─── Shared Chat UI ───
const ChatUI: React.FC<{
  block: BlockConfig;
  messages: DisplayMessage[];
  isStreaming: boolean;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}> = ({ block, messages, isStreaming, input, setInput, onSend, scrollRef: externalRef }) => {
  const internalRef = useRef<HTMLDivElement>(null);
  const scrollRef = externalRef || internalRef;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length]);

  return (
    <div className="flex flex-col h-full">
      <BlockHeader label={block.label} />
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-3 opacity-60">
            {[
              { role: 'user' as const, content: 'Analyze the Q4 sales data and find the top performing regions.' },
              { role: 'assistant' as const, content: "I'll analyze the Q4 sales data now. Let me pull the regional breakdown and identify the top performers." },
              { role: 'user' as const, content: 'Also compare it with Q3 numbers.' },
            ].map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-accent/20' : 'bg-surface-overlay'
                }`}>
                  {msg.role === 'user' ? <User size={13} className="text-accent" /> : <Bot size={13} className="text-txt-secondary" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-accent/60 text-white/80 rounded-br-md'
                    : 'bg-surface-overlay text-txt-muted rounded-bl-md'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ring-1 ring-border/30 ${
              msg.role === 'user' ? 'bg-accent/15' : 'bg-surface-overlay'
            }`}>
              {msg.role === 'user' ? <User size={13} className="text-accent" /> : <Bot size={13} className="text-txt-secondary" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-accent text-white rounded-br-md shadow-lg shadow-accent/15'
                : 'bg-surface-overlay text-txt-secondary rounded-bl-md'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-surface-overlay flex items-center justify-center">
              <Bot size={13} className="text-accent animate-pulse" />
            </div>
            <div className="bg-surface-overlay rounded-2xl rounded-bl-md px-3.5 py-2.5">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-txt-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-txt-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-txt-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="p-3 border-t border-border/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSend()}
            placeholder="Type a message..."
            className="ck-input text-sm flex-1"
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || isStreaming}
            className="px-3.5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl
                       transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0
                       shadow-lg shadow-accent/20 hover:shadow-accent/30 active:scale-[0.97]"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Export: switches between live and preview ───
export const ChatBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const isLive = useCopilotLive();
  return isLive ? <LiveChatBlock block={block} /> : <PreviewChatBlock block={block} />;
};

export const BlockHeader: React.FC<{ label: string }> = ({ label }) => (
  <div
    className="px-3.5 py-2.5 border-b border-border/30 text-xs font-medium text-txt-muted uppercase tracking-wider"
    style={{ background: 'linear-gradient(180deg, var(--color-surface-overlay), transparent)' }}
  >
    {label}
  </div>
);