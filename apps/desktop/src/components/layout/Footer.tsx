import React from 'react';
import { useChat } from '../../context/ChatContext';
import { Activity, Database, Cpu } from 'lucide-react';

const Footer: React.FC = () => {
  const { currentWorkspace } = useChat();
  
  return (
    <footer className="liquid-glass border-t border-white/10 px-4 py-2 flex items-center justify-between text-xs text-gray-400">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <Activity size={12} className="text-green-400" />
          <span>API Connected</span>
        </div>
        <div className="flex items-center space-x-1">
          <Database size={12} className="text-blue-400" />
          <span>ChromaDB Active</span>
        </div>
        <div className="flex items-center space-x-1">
          <Cpu size={12} className="text-purple-400" />
          <span>Apple Silicon Optimized</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <span>Workspace: {currentWorkspace.name}</span>
        <span className="text-gray-500">v0.1.0</span>
      </div>
    </footer>
  );
};

export default Footer;