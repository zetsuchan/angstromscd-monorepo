import React from 'react';
import { invoke } from '@tauri-apps/api/core';

const MacOSControls: React.FC = () => {
  const handleClose = () => invoke('close_window');
  const handleMinimize = () => invoke('minimize_window');
  const handleMaximize = () => invoke('maximize_window');

  return (
    <div className="flex items-center space-x-2 window-no-drag">
      <button
        onClick={handleClose}
        className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors group flex items-center justify-center"
        aria-label="Close"
      >
        <span className="opacity-0 group-hover:opacity-100 text-red-900 text-xs font-bold">×</span>
      </button>
      <button
        onClick={handleMinimize}
        className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors group flex items-center justify-center"
        aria-label="Minimize"
      >
        <span className="opacity-0 group-hover:opacity-100 text-yellow-900 text-xs font-bold">−</span>
      </button>
      <button
        onClick={handleMaximize}
        className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors group flex items-center justify-center"
        aria-label="Maximize"
      >
        <span className="opacity-0 group-hover:opacity-100 text-green-900 text-xs font-bold">⤢</span>
      </button>
    </div>
  );
};

export default MacOSControls;