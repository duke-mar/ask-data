import { DbConfig, LlmConfig, Conversation } from '@/app/types';

const KEYS = {
  DB_CONFIGS: 'askdata:db_configs',
  LLM_CONFIG: 'askdata:llm_config',
  CONVERSATIONS: 'askdata:conversations',
  ACTIVE_DB: 'askdata:active_db',
} as const;

function safeParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export const storage = {
  getDbConfigs(): DbConfig[] {
    return safeParse(localStorage.getItem(KEYS.DB_CONFIGS), []);
  },
  setDbConfigs(configs: DbConfig[]) {
    localStorage.setItem(KEYS.DB_CONFIGS, JSON.stringify(configs));
  },
  addDbConfig(config: DbConfig) {
    const configs = this.getDbConfigs();
    configs.push(config);
    this.setDbConfigs(configs);
  },
  updateDbConfig(config: DbConfig) {
    const configs = this.getDbConfigs();
    const idx = configs.findIndex((c) => c.id === config.id);
    if (idx >= 0) {
      configs[idx] = config;
      this.setDbConfigs(configs);
    }
  },
  removeDbConfig(id: string) {
    const configs = this.getDbConfigs().filter((c) => c.id !== id);
    this.setDbConfigs(configs);
  },

  getLlmConfig(): LlmConfig | null {
    return safeParse(localStorage.getItem(KEYS.LLM_CONFIG), null);
  },
  setLlmConfig(config: LlmConfig) {
    localStorage.setItem(KEYS.LLM_CONFIG, JSON.stringify(config));
  },

  getConversations(): Conversation[] {
    return safeParse(localStorage.getItem(KEYS.CONVERSATIONS), []);
  },
  setConversations(conversations: Conversation[]) {
    localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(conversations));
  },
  addConversation(conv: Conversation) {
    const conversations = this.getConversations();
    conversations.unshift(conv);
    this.setConversations(conversations);
  },
  updateConversation(conv: Conversation) {
    const conversations = this.getConversations();
    const idx = conversations.findIndex((c) => c.id === conv.id);
    if (idx >= 0) {
      conversations[idx] = conv;
      this.setConversations(conversations);
    }
  },
  removeConversation(id: string) {
    const conversations = this.getConversations().filter((c) => c.id !== id);
    this.setConversations(conversations);
  },

  getActiveDb(): string | null {
    return localStorage.getItem(KEYS.ACTIVE_DB);
  },
  setActiveDb(id: string | null) {
    if (id) {
      localStorage.setItem(KEYS.ACTIVE_DB, id);
    } else {
      localStorage.removeItem(KEYS.ACTIVE_DB);
    }
  },
};
