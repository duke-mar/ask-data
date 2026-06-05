export interface DbConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  description?: string;
  createdAt: number;
}

export interface LlmConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
}

export interface TableSchema {
  name: string;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: string;
  key: string;
  default: string | null;
  extra: string;
  comment: string;
}

export interface QueryResult {
  columns: string[];
  data: Record<string, unknown>[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'text' | 'sql' | 'chart' | 'analysis' | 'error';
  sql?: string;
  queryResult?: QueryResult;
  chartOption?: Record<string, unknown>;
  analysis?: string;
  isStreaming?: boolean;
  createdAt: number;
}

export interface TimelineStep {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'success' | 'error';
  content?: string;
  detail?: string;
  timestamp?: number;
}

export interface Conversation {
  id: string;
  title: string;
  dbId: string;
  selectedTables: string[];
  tableNotes: Record<string, string>;
  messages: ChatMessage[];
  timeline: TimelineStep[];
  createdAt: number;
  updatedAt: number;
}
