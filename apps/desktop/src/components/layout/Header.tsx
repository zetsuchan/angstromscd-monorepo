import React, { useState } from 'react';
import { ChevronDown, Settings, Search, Upload, Grid3X3 } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { Workspace } from '../../types';

const Header: React.FC = () => {
  const { currentWorkspace, setCurrentWorkspace, workspaces } = useChat();
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  
  const handleWorkspaceChange = (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    setIsWorkspaceDropdownOpen(false);
  };

  return (
    <header className="liquid-glass border-b border-white/10 py-3 px-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="flex items-center">
          <span className="text-blue-400 font-bold text-2xl">AngstromSCD</span>
          <span className="text-gray-400 text-xs ml-2">Medical Research</span>
        </div>
        
        <div className="relative">
          <button
            className="liquid-glass-button flex items-center space-x-1 text-gray-300"
            onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
          >
            <span>{currentWorkspace.name}</span>
            <ChevronDown size={16} />
          </button>
          
          {isWorkspaceDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 liquid-glass rounded-lg w-48 z-10 overflow-hidden">
              <ul>
                {workspaces.map((workspace) => (
                  <li key={workspace.id}>
                    <button
                      className={`w-full text-left px-4 py-2 hover:bg-white/10 transition-colors ${
                        workspace.id === currentWorkspace.id ? 'bg-blue-500/20 text-blue-300' : 'text-gray-300'
                      }`}
                      onClick={() => handleWorkspaceChange(workspace)}
                    >
                      {workspace.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <button className="liquid-glass-button flex items-center space-x-1 text-gray-300 hover:text-blue-300 transition-colors">
          <Search size={18} />
          <span className="text-sm">New Search</span>
        </button>
        
        <button className="liquid-glass-button flex items-center space-x-1 text-gray-300 hover:text-blue-300 transition-colors">
          <Upload size={18} />
          <span className="text-sm">Upload</span>
        </button>
        
        <button className="liquid-glass-button flex items-center space-x-1 text-gray-300 hover:text-blue-300 transition-colors">
          <Grid3X3 size={18} />
          <span className="text-sm">Claims Matrix</span>
        </button>
        
        <button className="p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-white/10 transition-all">
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;