'use client';

import { useState, useCallback } from 'react';
import { ChatMessage, QueryResult, DbConfig, TableSchema, LlmConfig } from '@/app/types';
import { useStream } from './useStream';
import {
  generateSQLPrompt,
  regenerateSQLPrompt,
  generateChartPrompt,
  generateAnalysisPrompt,
  generateIntentCheckPrompt,
} from '@/app/lib/prompts';
import { formatSchema, formatQueryResult } from '@/app/lib/schema';
import { extractSQL, isUnsafeSQL, isQueryingUnselectedTables, validateUserQuestion } from '@/app/lib/utils';
import { chatCompletion } from '@/app/lib/llm';

export interface ProcessCallbacks {
  onTimelineUpdate: (title: string, detail: string) => void;
  onSQLGenerated: (sql: string) => void;
  onQueryResult: (result: QueryResult) => void;
  onChartOption: (option: Record<string, unknown> | null) => void;
  onAnalysisStart: () => void;
}

function needsVisualization(question: string, rowCount: number): boolean {
  const q = question.toLowerCase();

  // 纯查询关键词 — 不需要图表
  const queryKeywords = ['查询', '查看', '列出', '详情', '前几条', '前\d+条', '第\d+条', '记录', '明细'];
  const isPureQuery = queryKeywords.some((kw) => new RegExp(kw).test(q));

  // 分析类关键词 — 需要图表
  const analysisKeywords = ['统计', '分析', '趋势', '占比', '比例', '对比', '分布', '排名', '增长', '下降', '平均', '总和', '最大', '最小'];
  const isAnalysis = analysisKeywords.some((kw) => q.includes(kw));

  if (isAnalysis) return true;
  if (isPureQuery && rowCount <= 20) return false;
  return rowCount > 10;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [processStep, setProcessStep] = useState<string>('');
  const [elapsed, setElapsed] = useState(0);
  const sqlStream = useStream();
  const analyzeStream = useStream();

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'createdAt'>) => {
    const full: ChatMessage = {
      ...msg,
      id: Math.random().toString(36).substring(2, 15),
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, full]);
    return full;
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  }, []);

  const processQuestion = useCallback(
    async (
      question: string,
      dbConfig: DbConfig,
      schemas: TableSchema[],
      tableNotes: Record<string, string>,
      llmConfig: LlmConfig,
      callbacks: ProcessCallbacks,
      selectedTables: string[] = []
    ): Promise<void> => {
      const { onTimelineUpdate, onSQLGenerated, onQueryResult, onChartOption, onAnalysisStart } = callbacks;

      setProcessing(true);
      setProcessStep('正在分析需求...');
      setElapsed(0);
      const timer = setInterval(() => setElapsed((e) => e + 1), 1000);

      try {
        // ====== Step 0: Intent Recognition ======
        setProcessStep('正在识别意图...');
        onTimelineUpdate('意图识别', '分析用户指令是否有效');

        // Fast local check first
        const localCheck = validateUserQuestion(question);
        if (!localCheck.valid) {
          onTimelineUpdate('意图识别', `失败：无效指令，${localCheck.reason}`);
          throw new Error(localCheck.reason);
        }

        // AI-based intent check (optional fallback for edge cases)
        try {
          const intentPrompt = generateIntentCheckPrompt(question);
          const intentResult = await chatCompletion(llmConfig, [
            { role: 'user', content: intentPrompt }
          ]);
          const validMatch = intentResult.match(/valid:\s*(true|false)/i);
          if (validMatch && validMatch[1].toLowerCase() === 'false') {
            const reasonMatch = intentResult.match(/reason:\s*(.+)/i);
            const reason = reasonMatch ? reasonMatch[1].trim() : '请输入有效的数据查询指令';
            onTimelineUpdate('意图识别', `失败：无效指令，${reason}`);
            throw new Error(reason);
          }
        } catch {
          // If AI intent check fails, rely on local check (already passed)
        }

        onTimelineUpdate('意图识别', '完成：指令有效，开始处理');

        const schemaText = formatSchema(schemas, tableNotes);

        // Step 1: Generate SQL
        setProcessStep('正在生成 SQL...');
        onTimelineUpdate('生成 SQL', '请求大模型生成查询语句');

        const sqlPrompt = generateSQLPrompt(question, schemaText);
        const sqlContent = await sqlStream.stream('/api/llm/generate-sql', {
          apiUrl: llmConfig.apiUrl,
          apiKey: llmConfig.apiKey,
          model: llmConfig.model,
          messages: [{ role: 'user', content: sqlPrompt }],
        });

        let sql = extractSQL(sqlContent);
        onTimelineUpdate('生成 SQL', `完成：生成SQL完成: ${sql.substring(0, 200)}...`);

        // ★★★ 阶段输出：SQL 生成完成，立即输出到前端
        onSQLGenerated(sql);

        // ====== Security Check 1: SQL Safety ======
        onTimelineUpdate('安全检查', '进行中：正在检查 SQL 安全性...');
        const safetyCheck = isUnsafeSQL(sql);
        if (!safetyCheck.safe) {
          onTimelineUpdate('安全检查', `失败：${safetyCheck.reason}`);
          throw new Error(safetyCheck.reason);
        }

        // ====== Security Check 2: Table Access Control ======
        if (selectedTables.length > 0) {
          const tableCheck = isQueryingUnselectedTables(sql, selectedTables);
          if (!tableCheck.allowed) {
            onTimelineUpdate('安全检查', `失败：${tableCheck.reason}`);
            throw new Error(tableCheck.reason);
          }
        }

        onTimelineUpdate('安全检查', '完成：安全检查通过');

        // Step 2: Execute SQL with retry
        setProcessStep('正在执行查询...');
        onTimelineUpdate('执行查询', '进行中：正在执行 SQL 查询...');
        let queryResult: QueryResult | null = null;
        let lastError = '';

        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const res = await fetch('/api/db/query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                host: dbConfig.host,
                port: dbConfig.port,
                user: dbConfig.user,
                password: dbConfig.password,
                database: dbConfig.database,
                sql,
              }),
            });
            const data = await res.json();
            if (data.success) {
              queryResult = { columns: data.columns, data: data.data };
              onTimelineUpdate('执行查询', `完成：查询成功，返回 ${data.data.length} 行数据`);
              break;
            } else {
              lastError = data.error;
              onTimelineUpdate('执行查询', `失败：第${attempt + 1}次尝试失败，${lastError}`);
              if (attempt < 2) {
                setProcessStep(`查询失败，正在修正 SQL（第${attempt + 2}次尝试）...`);
                const fixPrompt = regenerateSQLPrompt(question, schemaText, sql, lastError);
                const fixedContent = await sqlStream.stream('/api/llm/generate-sql', {
                  apiUrl: llmConfig.apiUrl,
                  apiKey: llmConfig.apiKey,
                  model: llmConfig.model,
                  messages: [{ role: 'user', content: fixPrompt }],
                });
                sql = extractSQL(fixedContent);

                // Re-check safety after fix
                const fixSafety = isUnsafeSQL(sql);
                if (!fixSafety.safe) {
                  onTimelineUpdate('安全检查', `失败：修正后的 SQL 未通过安全检查，${fixSafety.reason}`);
                  throw new Error(fixSafety.reason);
                }
              }
            }
          } catch (err: unknown) {
            lastError = err instanceof Error ? err.message : String(err);
            onTimelineUpdate('执行查询', `失败：第${attempt + 1}次尝试异常，${lastError}`);
          }
        }

        if (!queryResult) {
          throw new Error(`查询执行失败，已重试3次。最后一次错误: ${lastError}`);
        }

        // ★★★ 阶段输出：查询执行完成，立即输出结果表格到前端
        onQueryResult(queryResult);

        // 判断是否需要图表和分析
        const shouldVisualize = needsVisualization(question, queryResult.data.length);

        let chartOption: Record<string, unknown> | null = null;

        if (shouldVisualize) {
          // Step 3: Generate Chart
          setProcessStep('正在生成图表...');
          onTimelineUpdate('生成图表', '请求大模型生成 ECharts 配置');

          const chartPrompt = generateChartPrompt(
            question,
            schemaText,
            formatQueryResult(queryResult.columns, queryResult.data)
          );
          const chartRes = await fetch('/api/llm/generate-chart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiUrl: llmConfig.apiUrl,
              apiKey: llmConfig.apiKey,
              model: llmConfig.model,
              messages: [{ role: 'user', content: chartPrompt }],
            }),
          });
          const chartData = await chartRes.json();
          chartOption = chartData.success ? chartData.option : null;
          onTimelineUpdate('生成图表', chartData.success ? '完成：图表配置生成成功' : `失败：图表生成失败: ${chartData.error}`);

          // ★★★ 阶段输出：图表生成完成，立即输出到前端
          onChartOption(chartOption);

          // Step 4: Generate Analysis
          setProcessStep('正在分析数据...');
          onTimelineUpdate('数据分析', '请求大模型生成分析结论');

          // ★★★ 阶段输出：分析开始，创建流式消息占位
          onAnalysisStart();

          const analyzePrompt = generateAnalysisPrompt(
            question,
            schemaText,
            formatQueryResult(queryResult.columns, queryResult.data)
          );
          await analyzeStream.stream('/api/llm/analyze', {
            apiUrl: llmConfig.apiUrl,
            apiKey: llmConfig.apiKey,
            model: llmConfig.model,
            messages: [{ role: 'user', content: analyzePrompt }],
          });
          onTimelineUpdate('数据分析', '完成：分析结论生成完成');
        } else {
          // 不需要图表和分析
          onChartOption(null);
        }
      } finally {
        clearInterval(timer);
        setProcessing(false);
        setProcessStep('');
        setElapsed(0);
      }
    },
    [sqlStream, analyzeStream]
  );

  const cancel = useCallback(() => {
    sqlStream.reset();
    analyzeStream.reset();
    setProcessing(false);
    setProcessStep('');
    setElapsed(0);
  }, [sqlStream, analyzeStream]);

  return {
    messages,
    setMessages,
    processing,
    processStep,
    elapsed,
    addMessage,
    updateMessage,
    processQuestion,
    cancel,
    sqlContent: sqlStream.content,
    analysisContent: analyzeStream.content,
  };
}
