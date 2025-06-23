import React from 'react';
import MacOSControls from './MacOSControls';

interface NativeMenuBarProps {
  title?: string;
}

const NativeMenuBar: React.FC<NativeMenuBarProps> = ({ title = 'AngstromSCD' }) => {
  return (
    <div className="h-8 bg-liquid-glass-dark backdrop-blur-2xl border-b border-white/10 flex items-center justify-between px-4 window-drag">
      <div className="flex items-center space-x-4">
        <MacOSControls />
        <span className="text-sm font-medium text-white/70">{title}</span>
      </div>
      
      {/* Center title for macOS style */}
      <div className="absolute left-1/2 transform -translate-x-1/2">
        <span className="text-sm text-white/50">Medical Research Assistant</span>
      </div>
      
      {/* Right side status indicators */}
      <div className="flex items-center space-x-2 window-no-drag">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Connected" />
      </div>
    </div>
  );
};

export default NativeMenuBar;