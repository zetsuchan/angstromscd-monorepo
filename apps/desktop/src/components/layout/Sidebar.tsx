import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { ChevronLeft, ChevronRight, Plus, AlertCircle, Bell } from 'lucide-react';
import { Thread, Alert } from '../../types';
import { useLiquidGlass } from '../../hooks/useLiquidGlass';

const Sidebar: React.FC = () => {
  const { threads, setCurrentThread, alerts, markAlertAsRead } = useChat();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const liquidGlassRef = useLiquidGlass({ shimmer: true });
  
  const handleThreadClick = (threadId: string) => {
    setCurrentThread(threadId);
  };
  
  const handleAlertClick = (alert: Alert) => {
    markAlertAsRead(alert.id);
  };

  if (isCollapsed) {
    return (
      <div className="w-16 liquid-glass-dark border-r border-white/10 flex flex-col items-center py-4">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-white/10 mb-6 transition-all"
        >
          <ChevronRight size={18} />
        </button>
        
        {threads.map((thread) => (
          <button
            key={thread.id}
            className={`w-10 h-10 mb-2 rounded-xl flex items-center justify-center transition-all ${
              thread.isActive 
                ? 'bg-blue-500/30 text-blue-300 shadow-lg shadow-blue-500/20' 
                : 'liquid-glass text-gray-300 hover:bg-white/10'
            }`}
            onClick={() => handleThreadClick(thread.id)}
          >
            {thread.name.charAt(0)}
          </button>
        ))}
        
        <button className="w-10 h-10 mt-2 rounded-xl liquid-glass text-gray-300 hover:bg-white/10 flex items-center justify-center transition-all">
          <Plus size={16} />
        </button>
      </div>
    );
  }

  return (
    <div ref={liquidGlassRef} className="w-64 liquid-glass-dark border-r border-white/10 flex flex-col h-full">
      <div className="p-4 flex items-center justify-between border-b border-white/10">
        <h2 className="font-medium text-gray-200">Threads</h2>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1.5 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-white/10 transition-all"
        >
          <ChevronLeft size={18} />
        </button>
      </div>
      
      <div className="overflow-y-auto flex-grow">
        <ul className="py-2">
          {threads.map((thread) => (
            <ThreadItem 
              key={thread.id} 
              thread={thread} 
              onClick={() => handleThreadClick(thread.id)} 
            />
          ))}
        </ul>
        
        <div className="px-4 py-2">
          <button className="w-full liquid-glass-button flex items-center justify-center space-x-2 text-gray-300 hover:text-blue-300 py-2">
            <Plus size={16} />
            <span>New Thread</span>
          </button>
        </div>
      </div>
      
      <div className="border-t border-white/10 p-4">
        <h3 className="font-medium text-sm text-gray-300 mb-3 flex items-center">
          <Bell size={14} className="mr-1" />
          Recent Alerts
        </h3>
        <ul className="space-y-2">
          {alerts.slice(0, 3).map((alert) => (
            <li key={alert.id}>
              <button
                className={`w-full text-left p-2 rounded-lg transition-all ${
                  alert.isRead 
                    ? 'text-gray-400 hover:bg-white/5' 
                    : alert.type === 'warning' 
                      ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20' 
                      : 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
                }`}
                onClick={() => handleAlertClick(alert)}
              >
                <div className="flex items-start">
                  <span className="mr-2 mt-0.5">
                    {alert.type === 'warning' ? 
                      <AlertCircle size={14} /> : 
                      <Bell size={14} />
                    }
                  </span>
                  <div>
                    <div className={`text-xs ${alert.isRead ? '' : 'font-medium'}`}>
                      {alert.title}
                    </div>
                    <div className="text-xs opacity-70 mt-0.5">
                      {alert.content}
                    </div>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

interface ThreadItemProps {
  thread: Thread;
  onClick: () => void;
}

const ThreadItem: React.FC<ThreadItemProps> = ({ thread, onClick }) => {
  return (
    <li>
      <button
        className={`w-full flex items-center space-x-2 px-4 py-2.5 text-left transition-all ${
          thread.isActive
            ? 'bg-blue-500/20 text-blue-300 border-l-2 border-blue-400'
            : 'text-gray-300 hover:bg-white/5 hover:text-gray-100'
        }`}
        onClick={onClick}
      >
        <span className={thread.isActive ? 'font-medium' : ''}>
          {thread.name}
        </span>
        {thread.messages.length > 0 && (
          <span className="text-xs text-gray-500 ml-auto">
            {thread.messages.length}
          </span>
        )}
      </button>
    </li>
  );
};

export default Sidebar;