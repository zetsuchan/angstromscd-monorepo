import React from 'react';
import { Message } from '../../types';
import { User, Bot, FileText } from 'lucide-react';

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex items-start max-w-3xl ${isUser ? 'flex-row-reverse' : ''}`}>
        <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isUser ? 'bg-blue-500/20' : 'bg-purple-500/20'
          }`}>
            {isUser ? <User size={16} className="text-blue-300" /> : <Bot size={16} className="text-purple-300" />}
          </div>
        </div>
        
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`rounded-xl px-4 py-2.5 ${
            isUser 
              ? 'bg-blue-500/20 text-blue-100 border border-blue-500/30' 
              : 'liquid-glass text-gray-100'
          }`}>
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          
          {message.citations && message.citations.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.citations.map((citation) => (
                <div
                  key={citation.id}
                  className="liquid-glass rounded-lg px-2 py-1 text-xs text-gray-300 flex items-center space-x-1 hover:bg-white/10 cursor-pointer transition-all"
                >
                  <FileText size={12} />
                  <span>{citation.title}</span>
                </div>
              ))}
            </div>
          )}
          
          <span className="text-xs text-gray-500 mt-1">
            {new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;