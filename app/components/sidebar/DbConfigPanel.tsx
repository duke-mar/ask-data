'use client';

import { useState } from 'react';
import { Database, Plus, Trash2, Settings, ChevronDown, ChevronRight, StickyNote, CheckCircle, AlertCircle, Loader2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DbConfig, LlmConfig } from '@/app/types';
import { DbConnectionForm } from './DbConnectionForm';

interface DbConfigPanelProps {
  configs: DbConfig[];
  activeDbId: string | null;
  activeDb: DbConfig | null;
  onSelectDb: (id: string | null) => void;
  onAddConfig: (config: Omit<DbConfig, 'id' | 'createdAt'>) => void;
  onRemoveConfig: (id: string) => void;
  llmConfig: LlmConfig | null;
  onUpdateLlm: (config: LlmConfig) => void;
  llmHealth: 'unknown' | 'checking' | 'healthy' | 'unhealthy';
}

export function DbConfigPanel({
  configs,
  activeDbId,
  activeDb,
  onSelectDb,
  onAddConfig,
  onRemoveConfig,
  llmConfig,
  onUpdateLlm,
  llmHealth,
}: DbConfigPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showLlmForm, setShowLlmForm] = useState(false);
  const [expandedDb, setExpandedDb] = useState<string | null>(null);
  const [llmForm, setLlmForm] = useState({
    apiUrl: llmConfig?.apiUrl || 'https://api.openai.com/v1/chat/completions',
    apiKey: llmConfig?.apiKey || '',
    model: llmConfig?.model || 'gpt-4o',
  });

  const saveLlm = () => {
    onUpdateLlm(llmForm);
    setShowLlmForm(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-1.5">
          <Database className="h-4 w-4" />
          数据库连接
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setShowAddForm(true)} className="h-7 w-7 p-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {configs.length === 0 && (
        <div className="text-xs text-stone-400 text-center py-4">暂无数据库连接</div>
      )}

      <div className="space-y-1.5">
        {configs.map((db) => (
          <div key={db.id} className="rounded-md border border-stone-200 overflow-hidden">
            <button
              className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                activeDbId === db.id ? 'bg-orange-50 text-orange-700' : 'bg-white hover:bg-stone-50'
              }`}
              onClick={() => {
                onSelectDb(activeDbId === db.id ? null : db.id);
                setExpandedDb(expandedDb === db.id ? null : db.id);
              }}
            >
              <span className="font-medium truncate">{db.name}</span>
              <div className="flex items-center gap-1">
                {activeDbId === db.id && (
                  <Badge variant="secondary" className="text-[10px] h-5 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    已选
                  </Badge>
                )}
                {expandedDb === db.id ? (
                  <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
                )}
              </div>
            </button>
            {expandedDb === db.id && (
              <div className="px-3 py-2 bg-stone-50 text-xs text-stone-500 space-y-1 border-t border-stone-100">
                <div className="flex items-center gap-1">
                  <StickyNote className="h-3 w-3" />
                  <span className="font-medium">备注:</span>
                </div>
                <div>{db.description || '无备注'}</div>
                <div className="text-stone-400">{db.host}:{db.port}/{db.database}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs w-full mt-1"
                  onClick={() => onRemoveConfig(db.id)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  删除连接
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-stone-200 space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs h-8"
          onClick={() => setShowLlmForm(true)}
        >
          <Settings className="h-3.5 w-3.5 mr-1.5" />
          {llmConfig ? '修改大模型配置' : '配置大模型 API'}
        </Button>
        {llmConfig && (
          <div className="flex items-center justify-center gap-1.5 text-xs">
            {llmHealth === 'healthy' && (
              <>
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-600">API 连接正常</span>
              </>
            )}
            {llmHealth === 'unhealthy' && (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                <span className="text-rose-600">API 连接失败</span>
              </>
            )}
            {llmHealth === 'checking' && (
              <>
                <Loader2 className="h-3.5 w-3.5 text-orange-500 animate-spin" />
                <span className="text-orange-600">正在检查 API...</span>
              </>
            )}
          </div>
        )}
      </div>

      <DbConnectionForm open={showAddForm} onOpenChange={setShowAddForm} onSubmit={onAddConfig} />

      <Dialog open={showLlmForm} onOpenChange={setShowLlmForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>大模型 API 配置</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label>API 地址</Label>
              <Input
                value={llmForm.apiUrl}
                onChange={(e) => setLlmForm({ ...llmForm, apiUrl: e.target.value })}
                placeholder="https://api.openai.com/v1/chat/completions"
              />
            </div>
            <div className="space-y-1">
              <Label>API Key</Label>
              <Input
                type="password"
                value={llmForm.apiKey}
                onChange={(e) => setLlmForm({ ...llmForm, apiKey: e.target.value })}
                placeholder="sk-..."
              />
            </div>
            <div className="space-y-1">
              <Label>模型名称</Label>
              <Input
                value={llmForm.model}
                onChange={(e) => setLlmForm({ ...llmForm, model: e.target.value })}
                placeholder="gpt-4o"
              />
            </div>
            <Button onClick={saveLlm} className="w-full bg-orange-600 hover:bg-orange-700">
              保存配置
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
