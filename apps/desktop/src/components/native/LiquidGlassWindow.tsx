import React from 'react';

interface LiquidGlassWindowProps {
  children: React.ReactNode;
}

const LiquidGlassWindow: React.FC<LiquidGlassWindowProps> = ({ children }) => {
  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-gray-900/5 via-transparent to-gray-900/5">
      {/* Liquid glass background effect */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
      </div>
      
      {/* Content container with glass morphism */}
      <div className="flex-1 flex flex-col relative">
        {children}
      </div>
    </div>
  );
};

export default LiquidGlassWindow;