import React, { useState } from 'react';
import { ChevronDown, Settings, Search, Upload, Grid3X3 } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { Workspace } from '../../types';

const Header: React.FC = () => {
  const { currentWorkspace, setCurrentWorkspace } = useChat();
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  
  const handleWorkspaceChange = (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    setIsWorkspaceDropdownOpen(false);
  };

  return (
    <header className="bg-white border-b border-gray-200 py-3 px-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="flex items-center">
          <span className="text-blue-700 font-bold text-2xl">MedLab Chat</span>
          <span className="text-gray-500 text-xs ml-2">by Angstrom AI</span>
        </div>
        
        <div className="relative">
          <button
            className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 transition-colors px-3 py-1.5 rounded-md text-gray-700"
            onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
          >
            <span>{currentWorkspace.name}</span>
            <ChevronDown size={16} />
          </button>
          
          {isWorkspaceDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white shadow-lg rounded-md border border-gray-200 w-48 z-10">
              <ul>
                {useChat().workspaces.map((workspace) => (
                  <li key={workspace.id}>
                    <button
                      className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                        workspace.id === currentWorkspace.id ? 'bg-blue-50 text-blue-700' : ''
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
        <button className="flex items-center space-x-1 text-gray-700 hover:text-blue-700 transition-colors">
          <Search size={18} />
          <span className="text-sm">New Search</span>
        </button>
        
        <button className="flex items-center space-x-1 text-gray-700 hover:text-blue-700 transition-colors">
          <Upload size={18} />
          <span className="text-sm">Upload</span>
        </button>
        
        <button className="flex items-center space-x-1 text-gray-700 hover:text-blue-700 transition-colors">
          <Grid3X3 size={18} />
          <span className="text-sm">Claims Matrix</span>
        </button>
        
        <button className="p-1.5 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors">
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;