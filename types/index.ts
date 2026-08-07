export type Role = "user" | "assistant" | "system";

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: "pending" | "running" | "completed" | "failed";
  result?: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
  isThinking?: boolean;
  agentUsed?: string;
  modelUsed?: string;
  fallbackUsed?: boolean;
  taskType?: string;
}

export type ChatMessage = Message & { toolCalls?: string[] };

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export type TaskStatus = "todo" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  notionId?: string;
  tags: string[];
  createdAt: string;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  path: string;
  excerpt: string;
  tags: string[];
  lastSynced: string;
  wordCount: number;
  score?: number;
}

export interface SystemSettings {
  openaiApiKey: string;
  notionToken: string;
  notionDatabaseId: string;
  obsidianVaultPath: string;
  defaultModel: string;
  persona: "FRIDAY" | "JARVIS" | "Minimalist";
  temperature: number;
  autoSyncRAG: boolean;
}

export interface NavItem {
  name: string;
  href: string;
  iconName: string;
  badge?: string;
}
