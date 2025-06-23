import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Thread, 
  Message, 
  Alert, 
  Workspace,
  ChatMode,
  MessageTone,
  Citation
} from '../types';
import { invoke } from '@tauri-apps/api/core';

interface ChatContextType {
  threads: Thread[];
  currentThread: Thread | null;
  currentWorkspace: Workspace;
  workspaces: Workspace[];
  alerts: Alert[];
  chatMode: ChatMode;
  messageTone: MessageTone;
  isLoading: boolean;
  setCurrentThread: (threadId: string) => void;
  setCurrentWorkspace: (workspace: Workspace) => void;
  addMessage: (content: string, sender: 'user' | 'ai') => void;
  createThread: (name: string) => void;
  setChatMode: (mode: ChatMode) => void;
  setMessageTone: (tone: MessageTone) => void;
  markAlertAsRead: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const defaultWorkspaces: Workspace[] = [
  { id: '1', name: 'Global', type: 'global' },
  { id: '2', name: 'Project X', type: 'project' },
  { id: '3', name: 'My Papers', type: 'personal' },
];

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentWorkspace, setWorkspace] = useState<Workspace>(defaultWorkspaces[0]);
  const [workspaceList] = useState<Workspace[]>(defaultWorkspaces);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [chatMode, setChatMode] = useState<ChatMode>('Research');
  const [messageTone, setMessageTone] = useState<MessageTone>('Default');
  const [isLoading, setIsLoading] = useState(false);

  const currentThread = threads.find(thread => thread.isActive) || null;

  useEffect(() => {
    // Load initial data
    loadAlerts();
    // Create default thread if none exists
    if (threads.length === 0) {
      createThread('New Research Thread');
    }
  }, []);

  const loadAlerts = async () => {
    try {
      const response = await invoke('get_voe_alerts');
      if (response && (response as any).success && (response as any).data) {
        const voeAlerts = (response as any).data.map((alert: any) => ({
          id: alert.id,
          type: alert.risk_level === 'high' ? 'warning' : 'info',
          title: `VOE Risk Alert - ${alert.risk_level}`,
          content: alert.message,
          timestamp: new Date(alert.timestamp),
          isRead: false,
          patientId: alert.patient_id,
          riskLevel: alert.risk_level
        }));
        setAlerts(voeAlerts);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  };

  const setCurrentThread = (threadId: string) => {
    setThreads(prevThreads => 
      prevThreads.map(thread => ({
        ...thread,
        isActive: thread.id === threadId,
      }))
    );
  };

  const setCurrentWorkspace = (workspace: Workspace) => {
    setWorkspace(workspace);
  };

  const addMessage = (content: string, sender: 'user' | 'ai', citations?: Citation[]) => {
    if (!currentThread) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      sender,
      timestamp: new Date(),
      citations,
    };

    setThreads(prevThreads =>
      prevThreads.map(thread => {
        if (thread.id === currentThread.id) {
          return {
            ...thread,
            messages: [...thread.messages, newMessage],
            updatedAt: new Date(),
          };
        }
        return thread;
      })
    );
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !currentThread) return;
    
    addMessage(content, 'user');
    setIsLoading(true);
    
    try {
      const response = await invoke('send_chat_message', {
        message: { content, role: 'user' },
        mode: chatMode,
        tone: messageTone
      });
      
      if (response && (response as any).success && (response as any).data) {
        const data = (response as any).data;
        const citations = data.citations?.map((c: string, idx: number) => ({
          id: idx.toString(),
          title: c,
          authors: [],
          year: new Date().getFullYear()
        }));
        
        addMessage(data.message, 'ai', citations);
      } else {
        addMessage('Sorry, I encountered an error processing your request.', 'ai');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      addMessage('Sorry, I encountered an error connecting to the server.', 'ai');
    } finally {
      setIsLoading(false);
    }
  };

  const createThread = (name: string) => {
    const newThread: Thread = {
      id: Date.now().toString(),
      name,
      isActive: true,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setThreads(prevThreads => [
      ...prevThreads.map(thread => ({
        ...thread,
        isActive: false,
      })),
      newThread,
    ]);
  };

  const markAlertAsRead = (id: string) => {
    setAlerts(prevAlerts =>
      prevAlerts.map(alert => {
        if (alert.id === id) {
          return { ...alert, isRead: true };
        }
        return alert;
      })
    );
  };

  return (
    <ChatContext.Provider
      value={{
        threads,
        currentThread,
        currentWorkspace,
        workspaces: workspaceList,
        alerts,
        chatMode,
        messageTone,
        isLoading,
        setCurrentThread,
        setCurrentWorkspace,
        addMessage,
        createThread,
        setChatMode,
        setMessageTone,
        markAlertAsRead,
        sendMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};