import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import ChatBubble from './ChatBubble';
import { GitBranch, ChevronDown } from 'lucide-react';

const ChatPane: React.FC = () => {
  const { currentThread, createThread } = useChat();
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const isNearBottom = () => {
    if (!scrollContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 100; // Within 100px of bottom
  };

  useEffect(() => {
    // Only auto-scroll if user is near the bottom or this is the first message
    if (currentThread?.messages.length === 1 || isNearBottom()) {
      scrollToBottom();
    }
  }, [currentThread?.messages]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollButton(!isNearBottom());
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [currentThread]);

  const handleCreateBranch = () => {
    if (branchName.trim()) {
      createThread(branchName.trim());
      setBranchName('');
      setIsCreatingBranch(false);
    }
  };

  if (!currentThread) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center text-gray-500">
          <p className="mb-2">No thread selected.</p>
          <p>Select a thread from the sidebar or create a new one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 relative min-h-0">
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <h2 className="font-medium text-gray-800">{currentThread.name}</h2>
        <button
          className="flex items-center space-x-1 text-gray-700 hover:text-blue-700 transition-colors px-2 py-1 rounded hover:bg-gray-100"
          onClick={() => setIsCreatingBranch(true)}
        >
          <GitBranch size={16} />
          <span className="text-sm">Fork this thread</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4" ref={scrollContainerRef}>
        {currentThread.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>This thread is empty. Start a conversation!</p>
          </div>
        ) : (
          <>
            {currentThread.messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && currentThread.messages.length > 0 && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg transition-all duration-200 z-10"
          title="Scroll to bottom"
        >
          <ChevronDown size={20} />
        </button>
      )}

      {isCreatingBranch && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="bg-white rounded-lg p-6 w-80">
            <h3 className="text-lg font-medium mb-4">Fork this thread as...</h3>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4"
              placeholder="Enter branch name"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 text-gray-700 hover:text-gray-900 rounded"
                onClick={() => setIsCreatingBranch(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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