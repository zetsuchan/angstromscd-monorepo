export interface Thread {
  id: string;
  name: string;
  isActive: boolean;
  messages: Message[];
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  citations?: Citation[];
}

export interface Citation {
  id: string;
  reference: string;
  snippet: string;
  source: string;
}

export interface Alert {
  id: string;
  type: 'warning' | 'info';
  content: string;
  isRead: boolean;
}

export interface Workspace {
  id: string;
  name: string;
}

export type ChatMode = 'Research' | 'Create' | 'Analyze' | 'Plan' | 'Learn';

export type MessageTone = 'Default' | 'Formal' | 'Bullet Points' | 'Lay Summary';