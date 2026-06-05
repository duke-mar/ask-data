'use client';

import { useState } from 'react';
import { Send, Clock, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  disabled: boolean;
  canSend: boolean;
  disabledReason?: string;
  onSend: (message: string) => void;
  onCancel?: () => void;
  processingStep?: string;
  elapsed?: number;
  placeholder?: string;
}

export function ChatInput({ disabled, canSend, disabledReason, onSend, onCancel, processingStep, elapsed, placeholder }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim() || disabled || !canSend) return;
    onSend(input.trim());
    setInput('');
  };

  const buttonTitle = disabled && disabledReason ? disabledReason : undefined;

  return (
    <div className="border-t border-stone-200 bg-white p-4">
      {processingStep && (
        <div className="flex items-center gap-2 text-sm text-stone-500 mb-3 animate-pulse">
          <Clock className="h-4 w-4 animate-spin text-orange-500" />
          <span>{processingStep}</span>
          {elapsed !== undefined && elapsed > 0 && (
            <span className="text-orange-600 font-mono">已耗时 {elapsed} 秒</span>
          )}
        </div>
      )}
      <div className="flex gap-2 items-end">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder || '请输入你的数据问题...'}
          className="min-h-[60px] resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={disabled}
        />
        {disabled && onCancel ? (
          <Button
            onClick={onCancel}
            variant="destructive"
            className="h-[60px] px-4 bg-rose-600 hover:bg-rose-700"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSend}
            disabled={disabled || !input.trim() || !canSend}
            title={buttonTitle}
            className="h-[60px] px-4 bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
