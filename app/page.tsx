'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { PanelLeftClose, PanelLeftOpen, CheckCircle, AlertCircle, Loader2, Circle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DbConfigPanel } from './components/sidebar/DbConfigPanel';
import { TableSelector } from './components/sidebar/TableSelector';
import { TimelineSidebar } from './components/sidebar/TimelineSidebar';
import { ConversationManager } from './components/sidebar/ConversationManager';
import { ChatPanel } from './components/chat/ChatPanel';
import { useDbConnection } from './hooks/useDbConnection';
import { useChat } from './hooks/useChat';
import { useTimeline } from './hooks/useTimeline';
import { storage } from './lib/storage';
import { LlmConfig, Conversation } from './types';
import { generateId } from './lib/utils';

function formatQueryResultTable(columns: string[], data: Record<string, unknown>[]): string {
  if (columns.length === 0 || data.length === 0) return '*暂无数据*';
  const header = '| ' + columns.join(' | ') + ' |';
  const divider = '| ' + columns.map(() => '---').join(' | ') + ' |';
  const rows = data.map((row) => '| ' + columns.map((col) => String(row[col] ?? '')).join(' | ') + ' |');
  return [header, divider, ...rows].join('\n');
}

type LlmHealthStatus = 'unknown' | 'checking' | 'healthy' | 'unhealthy';

export default function Home() {
  const [llmConfig, setLlmConfig] = useState<LlmConfig | null>(null);
  const [llmHealth, setLlmHealth] = useState<LlmHealthStatus>('unknown');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const dbConn = useDbConnection();
  const chat = useChat();
  const timeline = useTimeline();
  const analysisMsgIdRef = useRef<string | null>(null);

  // Load conversations and llm config on mount
  useEffect(() => {
    const savedConvs = storage.getConversations();
    setConversations(savedConvs);
    if (savedConvs.length > 0) {
      setActiveConvId(savedConvs[0].id);
      chat.setMessages(savedConvs[0].messages);
    }

    const savedLlm = storage.getLlmConfig();
    if (savedLlm) {
      setLlmConfig(savedLlm);
      checkLlmHealth(savedLlm);
    }
  }, []);

  // Real-time streaming analysis update
  useEffect(() => {
    if (analysisMsgIdRef.current && chat.analysisContent) {
      chat.updateMessage(analysisMsgIdRef.current, {
        content: chat.analysisContent,
      });
    }
  }, [chat.analysisContent, chat.updateMessage]);

  const checkLlmHealth = useCallback(async (config: LlmConfig) => {
    setLlmHealth('checking');
    try {
      const res = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1,
        }),
      });
      if (res.ok) {
        setLlmHealth('healthy');
      } else {
        const text = await res.text();
        console.error('LLM health check failed:', res.status, text);
        setLlmHealth('unhealthy');
      }
    } catch (err: unknown) {
      console.error('LLM health check error:', err);
      setLlmHealth('unhealthy');
    }
  }, []);

  const handleUpdateLlm = useCallback(
    (config: LlmConfig) => {
      setLlmConfig(config);
      storage.setLlmConfig(config);
      checkLlmHealth(config);
    },
    [checkLlmHealth]
  );

  // Get next conversation number for default naming
  const getNextConvNumber = useCallback(() => {
    const nums = conversations
      .map((c) => {
        const match = c.title.match(/^会话 (\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);
    return nums.length > 0 ? Math.max(...nums) + 1 : 1;
  }, [conversations]);

  // Create a new conversation with first question as title
  const createConversation = useCallback(
    (firstQuestion?: string): string => {
      const newConv: Conversation = {
        id: generateId(),
        title: firstQuestion || `会话 ${getNextConvNumber()}`,
        dbId: dbConn.activeDbId || '',
        selectedTables: [...dbConn.selectedTables],
        tableNotes: { ...dbConn.tableNotes },
        messages: [],
        timeline: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const updated = [newConv, ...conversations];
      setConversations(updated);
      storage.setConversations(updated);
      setActiveConvId(newConv.id);
      return newConv.id;
    },
    [conversations, dbConn.activeDbId, dbConn.selectedTables, dbConn.tableNotes, getNextConvNumber]
  );

  const handleSelectConv = useCallback(
    (id: string) => {
      setActiveConvId(id);
      const conv = conversations.find((c) => c.id === id);
      if (conv) {
        chat.setMessages(conv.messages);
        timeline.setSteps(conv.timeline);
      }
    },
    [conversations, chat, timeline]
  );

  const handleDeleteConv = useCallback(
    (id: string) => {
      const updated = conversations.filter((c) => c.id !== id);
      setConversations(updated);
      storage.setConversations(updated);
      if (activeConvId === id) {
        if (updated.length > 0) {
          setActiveConvId(updated[0].id);
          chat.setMessages(updated[0].messages);
          timeline.setSteps(updated[0].timeline);
        } else {
          setActiveConvId(null);
          chat.setMessages([]);
          timeline.clearSteps();
        }
      }
    },
    [conversations, activeConvId, chat, timeline]
  );

  const handleRenameConv = useCallback(
    (id: string, title: string) => {
      const updated = conversations.map((c) =>
        c.id === id ? { ...c, title, updatedAt: Date.now() } : c
      );
      setConversations(updated);
      storage.setConversations(updated);
    },
    [conversations]
  );

  // Save messages and timeline to active conversation after each update
  useEffect(() => {
    if (!activeConvId) return;
    const updated = conversations.map((c) =>
      c.id === activeConvId
        ? { ...c, messages: chat.messages, timeline: timeline.steps, updatedAt: Date.now() }
        : c
    );
    setConversations(updated);
    storage.setConversations(updated);
  }, [chat.messages, timeline.steps, activeConvId]);

  const handleCancel = useCallback(() => {
    chat.cancel();
    timeline.addStep('用户操作', '用户取消了当前请求');
    chat.addMessage({
      role: 'assistant',
      content: '用户已取消当前请求',
      type: 'error',
    });
  }, [chat, timeline]);

  const handleSend = useCallback(
    async (question: string) => {
      if (!dbConn.activeDb || dbConn.selectedTables.length === 0) {
        chat.addMessage({
          role: 'assistant',
          content: '请先选择数据库和至少一个数据表',
          type: 'error',
        });
        return;
      }

      if (!llmConfig) {
        chat.addMessage({
          role: 'assistant',
          content: '请先配置大模型 API',
          type: 'error',
        });
        return;
      }

      if (llmHealth !== 'healthy') {
        chat.addMessage({
          role: 'assistant',
          content:
            llmHealth === 'unhealthy'
              ? '大模型 API 连接异常，请检查配置是否正确'
              : '大模型 API 正在检查中，请稍后再试',
          type: 'error',
        });
        return;
      }

      // Auto-create conversation on first message if none exists
      let currentConvId = activeConvId;
      if (!currentConvId || conversations.length === 0) {
        currentConvId = createConversation();
      }

      chat.addMessage({ role: 'user', content: question });

      // Update conversation title on first message (if title is default "会话 N" or empty)
      const currentConv = conversations.find((c) => c.id === currentConvId);
      if (currentConv && currentConv.messages.length === 0) {
        handleRenameConv(currentConvId, question);
      }

      timeline.clearSteps();

      const stepIds: Record<string, string> = {};

      const onTimelineUpdate = (title: string, detail: string) => {
        if (!stepIds[title]) {
          stepIds[title] = timeline.addStep(title, detail);
        } else {
          timeline.updateStep(stepIds[title], { detail });
        }
        if (detail.includes('失败') || detail.includes('错误')) {
          timeline.failStep(stepIds[title], detail);
        } else if (detail.includes('成功') || detail.includes('完成')) {
          timeline.completeStep(stepIds[title], detail);
        }
      };

      try {
        const result = await chat.processQuestion(
          question,
          dbConn.activeDb,
          dbConn.schemas,
          dbConn.tableNotes,
          llmConfig,
          onTimelineUpdate,
          dbConn.selectedTables
        );

        if (!result) return;

        // Add SQL message
        chat.addMessage({
          role: 'assistant',
          content: result.sql,
          type: 'sql',
          sql: result.sql,
        });

        // Add query result table
        const { columns, data } = result.queryResult;
        const tableMd = formatQueryResultTable(columns, data);
        chat.addMessage({
          role: 'assistant',
          content: `查询结果（共 ${data.length} 条）：\n\n${tableMd}`,
          type: 'text',
        });

        // Add chart only if needed
        if (result.chartOption) {
          chat.addMessage({
            role: 'assistant',
            content: '',
            type: 'chart',
            chartOption: result.chartOption,
          });
        }

        // Add analysis only if needed
        if (result.analysis !== null) {
          const analysisMsg = chat.addMessage({
            role: 'assistant',
            content: result.analysis || '',
            type: 'analysis',
            isStreaming: true,
          });
          analysisMsgIdRef.current = analysisMsg.id;

          setTimeout(() => {
            chat.updateMessage(analysisMsg.id, { isStreaming: false });
            analysisMsgIdRef.current = null;
          }, 300);

          timeline.completeStep(stepIds['数据分析'], '分析结论生成完成');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('aborted') || msg.includes('AbortError')) {
          return;
        }
        chat.addMessage({
          role: 'assistant',
          content: msg,
          type: 'error',
        });
      }
    },
    [
      dbConn.activeDb,
      dbConn.selectedTables,
      dbConn.schemas,
      dbConn.tableNotes,
      llmConfig,
      llmHealth,
      chat,
      timeline,
      activeConvId,
      conversations,
      createConversation,
      handleRenameConv,
    ]
  );

  const canSend = !!dbConn.activeDb && dbConn.selectedTables.length > 0 && !!llmConfig && llmHealth === 'healthy';

  const getLlmStatusIcon = () => {
    switch (llmHealth) {
      case 'healthy':
        return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
      case 'unhealthy':
        return <AlertCircle className="h-3.5 w-3.5 text-rose-500" />;
      case 'checking':
        return <Loader2 className="h-3.5 w-3.5 text-orange-500 animate-spin" />;
      default:
        return <Circle className="h-3.5 w-3.5 text-stone-300" />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Nav */}
      <header className="h-14 border-b border-stone-200 bg-white flex items-center px-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold text-sm">
            AD
          </div>
          <span className="font-semibold text-stone-800">AskData</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {llmConfig ? (
            <div className="flex items-center gap-1.5 text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded-full">
              {getLlmStatusIcon()}
              <span>{llmConfig.model}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-stone-400 bg-stone-100 px-2 py-1 rounded-full">
              {getLlmStatusIcon()}
              <span>未配置大模型</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Db Config + Table Selector */}
        {sidebarOpen && (
          <div className="w-72 border-r border-stone-200 bg-white flex flex-col shrink-0">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                <DbConfigPanel
                  configs={dbConn.configs}
                  activeDbId={dbConn.activeDbId}
                  activeDb={dbConn.activeDb}
                  onSelectDb={dbConn.selectDb}
                  onAddConfig={dbConn.addConfig}
                  onRemoveConfig={dbConn.removeConfig}
                  llmConfig={llmConfig}
                  onUpdateLlm={handleUpdateLlm}
                  llmHealth={llmHealth}
                />
                <Separator />
                {dbConn.activeDb && (
                  <TableSelector
                    db={dbConn.activeDb}
                    tables={dbConn.tables}
                    selectedTables={dbConn.selectedTables}
                    schemas={dbConn.schemas}
                    tableNotes={dbConn.tableNotes}
                    loading={dbConn.loading}
                    onSelectTables={dbConn.setSelectedTables}
                    onLoadTables={dbConn.loadTables}
                    onLoadSchemas={dbConn.loadSchemas}
                    onUpdateNote={dbConn.updateTableNote}
                  />
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Toggle Sidebar Button */}
        <button
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-5 h-10 bg-white border border-stone-200 rounded-r-md flex items-center justify-center hover:bg-stone-50 shadow-sm"
          style={{ left: sidebarOpen ? '288px' : '0px' }}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-3.5 w-3.5 text-stone-500" />
          ) : (
            <PanelLeftOpen className="h-3.5 w-3.5 text-stone-500" />
          )}
        </button>

        {/* Conversation Manager - between sidebar and chat */}
        <div className="w-60 border-r border-stone-200 bg-white flex flex-col shrink-0"
        >
          <ConversationManager
            conversations={conversations}
            activeConvId={activeConvId}
            onSelectConv={handleSelectConv}
            onCreateConv={() => {
              createConversation();
              chat.setMessages([]);
              timeline.clearSteps();
            }}
            onDeleteConv={handleDeleteConv}
            onRenameConv={handleRenameConv}
          />
        </div>

        {/* Chat Panel */}
        <div className="flex-1 min-w-0">
          <ChatPanel
            messages={chat.messages}
            processing={chat.processing}
            processStep={chat.processStep}
            elapsed={chat.elapsed}
            onSend={handleSend}
            onCancel={handleCancel}
            disabled={chat.processing}
            canSend={canSend}
            disabledReason={
              chat.processing
                ? 'AI 正在处理中'
                : !dbConn.activeDb
                ? '请先配置数据库连接'
                : dbConn.selectedTables.length === 0
                ? '请先选择数据表'
                : !llmConfig
                ? '请先配置大模型 API'
                : llmHealth !== 'healthy'
                ? '大模型 API 连接异常'
                : undefined
            }
            placeholder={
              chat.processing
                ? 'AI 正在处理中，请稍候...'
                : !dbConn.activeDb
                ? '请先点击左侧数据库连接进行配置'
                : dbConn.selectedTables.length === 0
                ? '请在左侧选择至少一个数据表'
                : !llmConfig
                ? '请先点击左侧「配置大模型 API」'
                : llmHealth !== 'healthy'
                ? '大模型 API 连接异常，请检查配置'
                : '请输入你的数据问题，例如：统计每个品类的销售额...'
            }
          />
        </div>

        {/* Right Timeline Sidebar - Fixed */}
        <TimelineSidebar steps={timeline.steps} />
      </div>
    </div>
  );
}
