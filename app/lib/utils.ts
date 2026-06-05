import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 从 LLM 返回内容中提取 SQL 语句
 * 优先匹配 ```sql / ``` 代码块，无代码块时按行扫描包含 SELECT 关键字的行
 */
export function extractSQL(content: string): string {
  // 1. 匹配 ```sql ... ``` 代码块（贪婪匹配，确保取到完整的代码块）
  const sqlBlockMatch = content.match(/```sql\s*([\s\S]*?)\s*```/i);
  if (sqlBlockMatch) return sqlBlockMatch[1].trim();

  // 2. 匹配 ``` ... ``` 代码块（无语言标识）
  const codeBlockMatch = content.match(/```\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  // 3. 兜底：提取内容中第一个包含 SELECT / WITH / SHOW 关键字的行到最后
  //    注意：不能只检查 startsWith，因为 LLM 可能返回 "SQL如下：SELECT ..."
  const lines = content.split('\n');
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const lowerLine = lines[i].toLowerCase();
    if (lowerLine.includes('select') || lowerLine.includes('with') || lowerLine.includes('show')) {
      startIdx = i;
      break;
    }
  }
  if (startIdx !== -1) {
    return lines.slice(startIdx).join('\n').trim();
  }

  // 4. 完全找不到 SQL 特征，返回原始内容去空白
  return content.trim();
}

export function isValidSQL(sql: string): boolean {
  const trimmed = sql.trim().toLowerCase();
  return trimmed.startsWith('select') || trimmed.startsWith('with') || trimmed.startsWith('show');
}

// ========== SQL Security Checks ==========

const DANGEROUS_KEYWORDS = [
  'insert', 'delete', 'update', 'drop', 'truncate', 'alter', 'create',
  'replace', 'grant', 'revoke', 'lock', 'unlock', 'execute', 'call',
  'load_file', 'into outfile', 'into dumpfile',
];

const SYSTEM_TABLES = [
  'information_schema', 'mysql', 'performance_schema', 'sys',
];

/** 移除 SQL 中的注释（单行 -- 和多行块注释） */
function stripSQLComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')   // 多行注释 /* ... */
    .replace(/--.*$/gm, '')               // 单行注释 -- ...
    .trim();
}

export function isUnsafeSQL(sql: string): { safe: boolean; reason?: string } {
  const lower = sql.toLowerCase();

  // Check for dangerous keywords
  for (const kw of DANGEROUS_KEYWORDS) {
    const regex = new RegExp(`\\b${kw}\\b`);
    if (regex.test(lower)) {
      return { safe: false, reason: `检测到危险操作：${kw.toUpperCase()}。本产品仅支持 SELECT 查询。` };
    }
  }

  // Must contain or start with SELECT/WITH/SHOW
  // 先移除注释再检查，避免注释开头的 SQL 被误杀
  // 同时允许 "SQL如下：SELECT ..." 这种前面有说明文字的情况
  const cleanSQL = stripSQLComments(lower);
  const startsWithQuery = cleanSQL.startsWith('select') || cleanSQL.startsWith('with') || cleanSQL.startsWith('show');
  const containsQuery = cleanSQL.includes('select') || cleanSQL.includes('with') || cleanSQL.includes('show');

  if (!startsWithQuery && !containsQuery) {
    // 既不包含也不以 SELECT 开头 → 大概率是 LLM 没生成有效 SQL（返回了解释文字）
    return { safe: false, reason: 'AI 生成的查询语句格式不正确，请重新描述您的问题。' };
  }

  // Check for system table access
  for (const sys of SYSTEM_TABLES) {
    if (lower.includes(sys)) {
      return { safe: false, reason: `禁止查询系统表：${sys}` };
    }
  }

  // Check for comments that might hide malicious code (basic check)
  if (/\/\*.*\*\//.test(sql) && DANGEROUS_KEYWORDS.some((kw) => new RegExp(`\\b${kw}\\b`).test(sql.toLowerCase().replace(/\/\*.*?\*\//g, '')))) {
    return { safe: false, reason: '检测到可疑注释内容。' };
  }

  return { safe: true };
}

export function isQueryingUnselectedTables(sql: string, allowedTables: string[]): { allowed: boolean; reason?: string } {
  const lower = sql.toLowerCase();

  // Extract table names from SQL (basic regex approach)
  // Match patterns like `table_name`, FROM table_name, JOIN table_name
  const tablePatterns = [
    /from\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?/gi,
    /join\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?/gi,
    /into\s+`?([a-zA-Z_][a-zA-Z0-9_]*)`?/gi,
  ];

  const foundTables = new Set<string>();
  for (const pattern of tablePatterns) {
    let match;
    while ((match = pattern.exec(sql)) !== null) {
      foundTables.add(match[1].toLowerCase());
    }
  }

  const allowedLower = allowedTables.map((t) => t.toLowerCase());
  for (const table of foundTables) {
    if (!allowedLower.includes(table)) {
      return { allowed: false, reason: `SQL 中引用了未选择的表：\`${table}\`。请先在左侧选择该表。` };
    }
  }

  return { allowed: true };
}

export function validateUserQuestion(question: string): { valid: boolean; reason?: string } {
  const q = question.trim();

  if (!q) {
    return { valid: false, reason: '请输入您的问题。' };
  }

  // Check if it's a greeting or casual chat
  const greetings = ['你好', '您好', 'hello', 'hi', '在吗', '在不在', '请问', '谢谢', '再见', '拜拜'];
  const isGreeting = greetings.some((g) => q.toLowerCase().includes(g.toLowerCase()));

  // Check length - too short might be invalid
  if (q.length < 3 && isGreeting) {
    return { valid: false, reason: '这是一个问候语 😊 请输入具体的数据查询问题，例如："统计最近7天的订单量"' };
  }

  // Check for data query keywords
  const queryKeywords = [
    '查询', '统计', '分析', '查看', '列出', '前', '条', '数据', '表', '字段',
    '多少', '多少条', '数量', '总和', '平均', '最大', '最小', '排名',
    '趋势', '占比', '比例', '对比', '分布', '增长', '下降',
    'select', 'show', 'count', 'sum', 'avg', 'max', 'min',
    'group', 'order', 'where', 'from', 'join',
  ];

  const hasQueryKeyword = queryKeywords.some((kw) => q.toLowerCase().includes(kw.toLowerCase()));

  if (!hasQueryKeyword && q.length < 10) {
    return { valid: false, reason: '指令过于简短或不完整。请描述您想查询的数据内容，例如："查询用户表中前10条记录"或"统计各品类的销售额占比"' };
  }

  // Check for data modification / dangerous intent (early interception)
  const modificationKeywords = [
    '删除', '删掉', '清空', 'truncate', 'drop', '删表',
    '插入', '新增', '添加', 'insert',
    '修改', '更新', '改动', 'update', '更改', '替换', 'replace',
    '创建表', 'create table', '建表', 'grant', 'revoke',
  ];
  const hasModificationIntent = modificationKeywords.some((kw) =>
    q.toLowerCase().includes(kw.toLowerCase())
  );

  if (hasModificationIntent) {
    // If it also has explicit query keywords, it might be a query about modified data
    // e.g. "查询已删除的订单" -> should pass (contains 查询)
    // e.g. "把删除记录给我看" -> should pass (contains 给我 / 看)
    const queryIndicators = [
      '查询', '查看', '统计', '分析', '列出', '显示', '检索',
      '给我', '找', '搜', '查', '看看', '有哪些', '是什么', '有多少',
      '找出来', '列举', '告诉我', '展示',
    ];
    const isQueryingModifiedData = queryIndicators.some((kw) =>
      q.toLowerCase().includes(kw.toLowerCase())
    );

    if (!isQueryingModifiedData) {
      return {
        valid: false,
        reason: '检测到数据修改操作意图（INSERT / DELETE / UPDATE / DROP / TRUNCATE 等）。本产品仅支持数据查询（SELECT），不支持任何数据修改操作。',
      };
    }
  }

  // Check for harmful instructions (basic prompt injection check)
  const harmfulPatterns = [
    /ignore previous instructions?/i,
    /disregard (all|previous)/i,
    /system prompt/i,
    /you are now/i,
    /act as (a|an) /i,
    /越狱|jailbreak/i,
    /ignore above/i,
  ];

  for (const pattern of harmfulPatterns) {
    if (pattern.test(q)) {
      return { valid: false, reason: '检测到异常指令模式。请输入合法的数据查询问题。' };
    }
  }

  return { valid: true };
}
