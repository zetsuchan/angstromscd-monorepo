export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  citations?: Citation[];
}

export interface Citation {
  id: string;
  title: string;
  authors: string[];
  pmid?: string;
  doi?: string;
  year: number;
}

export interface Thread {
  id: string;
  name: string;
  messages: Message[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  type: 'global' | 'project' | 'personal';
}

export interface Alert {
  id: string;
  type: 'warning' | 'info';
  title: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  patientId?: string;
  riskLevel?: 'low' | 'medium' | 'high';
}

export type ChatMode = 'Research' | 'Create' | 'Analyze' | 'Plan' | 'Learn';
export type MessageTone = 'Default' | 'Formal' | 'Bullet Points' | 'Lay Summary';

export interface ModelOption {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'ollama' | 'apple';
  type: 'cloud' | 'local';
  description?: string;
}