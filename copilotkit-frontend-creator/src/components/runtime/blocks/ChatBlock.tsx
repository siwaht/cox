import React, { useState, useRef, useEffect } from 'react';
import type { BlockConfig } from '@/types/blocks';
import { Send, Bot, User } from 'lucide-react';
import { useAgentChat } from '@/hooks/useAgentChat';

export const ChatBlock: React.FC<{ block: BlockConfig }> = ({ block }) => {
  const { messages, isStreaming, sendMessage } = useAgentChat();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      <BlockHeader label={block.label} />
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot size={24} className="text-zinc-700 mx-auto mb-2" />
            <p className="text-xs text-zinc-600">Send a message to start</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-accent/20' : 'bg-surface-overlay'
            }`}>
              {msg.role === 'user' ? <User size={13} className="text-accent" /> : <Bot size={13} className="text-zinc-400" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-accent text-white rounded-br-md'
                : 'bg-surface-overlay text-zinc-300 rounded-bl-md'
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
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="p-2.5 border-t border-border/40">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="ck-input text-sm flex-1"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="px-3.5 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg
                       transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

export const BlockHeader: React.FC<{ label: string }> = ({ label }) => (
  <div className="px-3.5 py-2.5 border-b border-border/40 text-xs font-medium text-zinc-500 uppercase tracking-wider">
    {label}
  </div>
);
