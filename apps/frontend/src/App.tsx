import React from 'react';
import { ChatProvider } from './context/ChatContext';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import ChatPane from './components/chat/ChatPane';
import Composer from './components/chat/Composer';
import Footer from './components/layout/Footer';

function App() {
  return (
    <ChatProvider>
      <div className="flex flex-col h-screen overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <ChatPane />
            <Composer />
          </div>
        </div>
        <Footer />
      </div>
    </ChatProvider>
  );
}

export default App;