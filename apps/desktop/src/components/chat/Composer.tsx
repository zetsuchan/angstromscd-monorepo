import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { 
  Send, 
  Paperclip, 
  Link, 
  Settings, 
  ChevronDown,
  Loader2
} from 'lucide-react';
import { ChatMode, MessageTone } from '../../types';

const Composer: React.FC = () => {
  const { sendMessage, chatMode, setChatMode, messageTone, setMessageTone, isLoading } = useChat();
  const [input, setInput] = useState('');
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [isToneDropdownOpen, setIsToneDropdownOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      await sendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleModeSelect = (mode: ChatMode) => {
    setChatMode(mode);
    setIsModeDropdownOpen(false);
  };

  const handleToneSelect = (tone: MessageTone) => {
    setMessageTone(tone);
    setIsToneDropdownOpen(false);
  };

  return (
    <div className="liquid-glass border-t border-white/10 p-4">
      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        <div className="flex space-x-2">
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded-lg transition-all"
            title="Attach file"
          >
            <Paperclip size={20} />
          </button>
          
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded-lg transition-all"
            title="Insert citation"
          >
            <Link size={20} />
          </button>
          
          <div className="relative">
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded-lg transition-all"
              title="Chat mode"
              onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
            >
              <Settings size={20} />
            </button>
            
            {isModeDropdownOpen && (
              <div className="absolute bottom-full left-0 mb-2 liquid-glass rounded-lg w-48 z-10 overflow-hidden">
                <div className="py-2 px-3 border-b border-white/10">
                  <span className="text-sm font-medium text-gray-300">Mode</span>
                </div>
                <ul>
                  {(['Research', 'Create', 'Analyze', 'Plan', 'Learn'] as ChatMode[]).map((mode) => (
                    <li key={mode}>
                      <button
                        type="button"
                        className={`w-full text-left px-4 py-2 text-sm transition-all ${
                          mode === chatMode 
                            ? 'bg-blue-500/20 text-blue-300' 
                            : 'text-gray-300 hover:bg-white/10'
                        }`}
                        onClick={() => handleModeSelect(mode)}
                      >
                        {mode}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1 flex items-end space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent resize-none"
              placeholder="Ask about sickle cell disease research..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isLoading}
            />
          </div>
          
          <div className="relative">
            <button
              type="button"
              className="liquid-glass-button flex items-center space-x-1 text-gray-300 min-w-[120px]"
              onClick={() => setIsToneDropdownOpen(!isToneDropdownOpen)}
            >
              <span className="text-sm">{messageTone}</span>
              <ChevronDown size={16} />
            </button>
            
            {isToneDropdownOpen && (
              <div className="absolute bottom-full right-0 mb-2 liquid-glass rounded-lg w-48 z-10 overflow-hidden">
                <div className="py-2 px-3 border-b border-white/10">
                  <span className="text-sm font-medium text-gray-300">Tone</span>
                </div>
                <ul>
                  {(['Default', 'Formal', 'Bullet Points', 'Lay Summary'] as MessageTone[]).map((tone) => (
                    <li key={tone}>
                      <button
                        type="button"
                        className={`w-full text-left px-4 py-2 text-sm transition-all ${
                          tone === messageTone 
                            ? 'bg-blue-500/20 text-blue-300' 
                            : 'text-gray-300 hover:bg-white/10'
                        }`}
                        onClick={() => handleToneSelect(tone)}
                      >
                        {tone}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <button
            type="submit"
            className="p-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Composer;