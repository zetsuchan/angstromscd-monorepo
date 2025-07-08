export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  citations?: any[];
  pubmed_articles?: any[];
  created_at: string;
  metadata?: Record<string, any>;
}

export interface ConversationSummary {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_at: string | null;
  last_message: string | null;
}

export interface CreateConversationRequest {
  title: string;
  metadata?: Record<string, any>;
}

export interface CreateMessageRequest {
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  citations?: any[];
  pubmed_articles?: any[];
  metadata?: Record<string, any>;
}

export interface ConversationListResponse {
  conversations: ConversationSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface ConversationDetailResponse {
  conversation: Conversation;
  messages: ConversationMessage[];
}