import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import ChatBubble from './ChatBubble';
import { GitBranch, Loader2 } from 'lucide-react';

const ChatPane: React.FC = () => {
  const { currentThread, createThread, isLoading } = useChat();
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [branchName, setBranchName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentThread?.messages]);

  const handleCreateBranch = () => {
    if (branchName.trim()) {
      createThread(branchName.trim());
      setBranchName('');
      setIsCreatingBranch(false);
    }
  };

  if (!currentThread) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-gray-400">
          <p className="mb-2">No thread selected.</p>
          <p>Select a thread from the sidebar or create a new one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative">
      <div className="liquid-glass border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <h2 className="font-medium text-gray-200">{currentThread.name}</h2>
        <button
          className="liquid-glass-button flex items-center space-x-1 text-gray-300 hover:text-blue-300 transition-colors"
          onClick={() => setIsCreatingBranch(true)}
        >
          <GitBranch size={16} />
          <span className="text-sm">Fork Thread</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {currentThread.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Start a conversation about sickle cell disease research...</p>
          </div>
        ) : (
          <>
            {currentThread.messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex items-center space-x-2 text-gray-400">
                <Loader2 className="animate-spin" size={16} />
                <span className="text-sm">AI is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {isCreatingBranch && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="liquid-glass rounded-xl p-6 w-80 shadow-2xl">
            <h3 className="text-lg font-medium mb-4 text-gray-200">Fork this thread as...</h3>
            <input
              type="text"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 mb-4 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
              placeholder="Enter branch name"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateBranch()}
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 text-gray-300 hover:text-gray-100 rounded-lg hover:bg-white/10 transition-all"
                onClick={() => setIsCreatingBranch(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all"
                onClick={handleCreateBranch}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPane;