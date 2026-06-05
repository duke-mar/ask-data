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

export function extractSQL(content: string): string {
  const match = content.match(/```(?:sql)?\s*([\s\S]*?)```/i);
  return match ? match[1].trim() : content.trim();
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

export function isUnsafeSQL(sql: string): { safe: boolean; reason?: string } {
  const lower = sql.toLowerCase();

  // Check for dangerous keywords
  for (const kw of DANGEROUS_KEYWORDS) {
    const regex = new RegExp(`\\b${kw}\\b`);
    if (regex.test(lower)) {
      return { safe: false, reason: `检测到危险操作：${kw.toUpperCase()}。本产品仅支持 SELECT 查询。` };
    }
  }

  // Must start with SELECT or WITH
  const trimmed = lower.trim();
  if (!trimmed.startsWith('select') && !trimmed.startsWith('with') && !trimmed.startsWith('show')) {
    return { safe: false, reason: '仅支持 SELECT 查询语句。' };
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
