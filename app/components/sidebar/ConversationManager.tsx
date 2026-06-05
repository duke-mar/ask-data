'use client';

import { useState } from 'react';
import { MessageSquare, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Conversation } from '@/app/types';
import { formatDate, generateId } from '@/app/lib/utils';

interface ConversationManagerProps {
  conversations: Conversation[];
  activeConvId: string | null;
  onSelectConv: (id: string) => void;
  onCreateConv: () => void;
  onDeleteConv: (id: string) => void;
  onRenameConv: (id: string, title: string) => void;
}

export function ConversationManager({
  conversations,
  activeConvId,
  onSelectConv,
  onCreateConv,
  onDeleteConv,
  onRenameConv,
}: ConversationManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameConv(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4" />
          会话管理
        </h3>
        <Button variant="ghost" size="sm" onClick={onCreateConv} className="h-7 w-7 p-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {conversations.length === 0 && (
        <div className="text-xs text-stone-400 text-center py-3">暂无会话</div>
      )}

      <div className="space-y-1">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`group flex items-center gap-2 px-2.5 py-2 rounded-md text-sm cursor-pointer transition-colors ${
              activeConvId === conv.id
                ? 'bg-orange-50 text-orange-700'
                : 'hover:bg-stone-50 text-stone-700'
            }`}
            onClick={() => onSelectConv(conv.id)}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
            <div className="flex-1 min-w-0">
              {editingId === conv.id ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Input
                    className="h-6 text-xs py-0 px-1"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(conv.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    onBlur={() => handleRename(conv.id)}
                  />
                </div>
              ) : (
                <div className="flex flex-col">
                  <span
                    className="truncate font-medium"
                    title={conv.title}
                    onDoubleClick={() => {
                      setEditingId(conv.id);
                      setEditTitle(conv.title);
                    }}
                  >
                    {conv.title}
                  </span>
                  <span className="text-[10px] text-stone-400">
                    {formatDate(conv.updatedAt)} · {conv.messages.length} 条消息
                  </span>
                </div>
              )}
            </div>
            {activeConvId === conv.id && editingId !== conv.id && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConv(conv.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
