'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Clock, Square, AlertCircle } from 'lucide-react';
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

export function ChatInput({
  disabled,
  canSend,
  disabledReason,
  onSend,
  onCancel,
  processingStep,
  elapsed,
  placeholder,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [tip, setTip] = useState<string | null>(null);
  const tipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTipTimer = useCallback(() => {
    if (tipTimerRef.current) {
      clearTimeout(tipTimerRef.current);
      tipTimerRef.current = null;
    }
  }, []);

  const showTip = useCallback(
    (message: string) => {
      clearTipTimer();
      setTip(message);
      tipTimerRef.current = setTimeout(() => {
        setTip(null);
        tipTimerRef.current = null;
      }, 4000);
    },
    [clearTipTimer]
  );

  useEffect(() => {
    return () => clearTipTimer();
  }, [clearTipTimer]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();

    // AI 正在处理中
    if (disabled) {
      showTip(disabledReason || 'AI 正在处理中，请稍候');
      return;
    }

    // 前置条件不满足（未配置数据库/表/LLM 等）
    if (!canSend) {
      showTip(disabledReason || '当前无法发送，请检查配置');
      return;
    }

    // 输入为空
    if (!trimmed) {
      showTip('请输入内容后再发送');
      return;
    }

    onSend(trimmed);
    setInput('');
    setTip(null);
    clearTipTimer();
  }, [input, disabled, canSend, disabledReason, onSend, showTip, clearTipTimer]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="border-t border-stone-200 bg-white p-4">
      {/* 处理中状态提示 */}
      {processingStep && (
        <div className="flex items-center gap-2 text-sm text-stone-500 mb-3 animate-pulse">
          <Clock className="h-4 w-4 animate-spin text-orange-500" />
          <span>{processingStep}</span>
          {elapsed !== undefined && elapsed > 0 && (
            <span className="text-orange-600 font-mono">已耗时 {elapsed} 秒</span>
          )}
        </div>
      )}

      {/* 禁用原因提示条 */}
      {tip && (
        <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-md px-3 py-2 mb-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{tip}</span>
        </div>
      )}

      <div className="flex gap-2 items-end">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder || '请输入你的数据问题...'}
          className="min-h-[60px] resize-none"
          onKeyDown={handleKeyDown}
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
            className="h-[60px] px-4 bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
