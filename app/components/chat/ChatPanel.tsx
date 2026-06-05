'use client';

import { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ExportButton } from '../export/ExportButton';
import { ChatMessage as ChatMessageType } from '@/app/types';

interface ChatPanelProps {
  messages: ChatMessageType[];
  processing: boolean;
  processStep: string;
  elapsed: number;
  onSend: (message: string) => void;
  onCancel?: () => void;
  disabled: boolean;
  canSend: boolean;
  disabledReason?: string;
  placeholder?: string;
}

export function ChatPanel({ messages, processing, processStep, elapsed, onSend, onCancel, disabled, canSend, disabledReason, placeholder }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, processing, processStep]);

  // Find the last complete result group and its corresponding user question
  const lastResultIndex = [...messages].reverse().findIndex(m => m.type === 'analysis');
  const lastCompleteResult = lastResultIndex >= 0 ? messages[messages.length - 1 - lastResultIndex] : null;
  const correspondingUserMsg = lastCompleteResult
    ? messages.slice(0, messages.indexOf(lastCompleteResult)).reverse().find(m => m.role === 'user')
    : null;

  return (
    <div className="flex flex-col h-full bg-stone-50/50">
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-6 max-w-4xl mx-auto">
          {messages.length === 0 && !processing && (
            <div className="text-center py-20 text-stone-400">
              <div className="text-4xl mb-4">💬</div>
              <p className="text-lg font-medium text-stone-600 mb-2">开始你的数据探索</p>
              <p className="text-sm">选择数据库和表，然后输入你的问题</p>
            </div>
          )}
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {lastCompleteResult && (
            <div className="flex justify-end pt-2">
              <ExportButton
                question={correspondingUserMsg?.content || ''}
                sql={messages.find(m => m.type === 'sql')?.sql}
                chartOption={messages.find(m => m.type === 'chart')?.chartOption}
                analysis={lastCompleteResult.content}
              />
            </div>
          )}
        </div>
      </ScrollArea>
      <ChatInput
        disabled={disabled}
        canSend={canSend}
        disabledReason={disabledReason}
        onSend={onSend}
        onCancel={onCancel}
        processingStep={processing ? processStep : undefined}
        elapsed={processing ? elapsed : undefined}
        placeholder={placeholder}
      />
    </div>
  );
}
