'use client';

import { User, Bot, Database, BarChart3, FileText, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChatMessage as ChatMessageType } from '@/app/types';
import { EChartRenderer } from '../chart/EChartRenderer';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-orange-100 text-orange-600' : 'bg-stone-100 text-stone-600'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
        {message.type === 'chart' && message.chartOption ? (
          <Card className="p-4 inline-block w-full max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium text-stone-700">数据可视化</span>
            </div>
            <EChartRenderer option={message.chartOption} />
          </Card>
        ) : message.type === 'analysis' ? (
          <Card className="p-4 inline-block w-full max-w-2xl text-left">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium text-stone-700">数据分析结论</span>
            </div>
            <div className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
              {message.content}
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 ml-0.5 bg-orange-500 animate-pulse align-middle" />
              )}
            </div>
          </Card>
        ) : message.type === 'sql' ? (
          <Card className="p-4 inline-block w-full max-w-2xl text-left">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-stone-500" />
              <span className="text-sm font-medium text-stone-700">SQL 查询</span>
            </div>
            <pre className="text-xs font-mono bg-stone-100 p-3 rounded-md overflow-x-auto text-stone-700">
              <code>{message.sql || message.content}</code>
            </pre>
          </Card>
        ) : message.type === 'error' ? (
          <Card className="p-4 inline-block w-full max-w-2xl text-left border-rose-200 bg-rose-50">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              <span className="text-sm font-medium text-rose-700">错误</span>
            </div>
            <div className="text-sm text-rose-700">{message.content}</div>
          </Card>
        ) : (
          <Card className={`p-3 inline-block max-w-2xl text-left ${isUser ? 'bg-orange-50' : ''}`}>
            <div className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
              {message.content}
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 ml-0.5 bg-orange-500 animate-pulse align-middle" />
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
