import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import { Message, AppMode } from './types';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isIntroFinished, setIsIntroFinished] = useState(false);
  const [currentMode, setCurrentMode] = useState<AppMode>('standard');
  const [sessionId, setSessionId] = useState(() => Math.random().toString(36).substring(2, 15));

  const handleNewChat = () => {
    setMessages([]);
    setIsIntroFinished(false);
    setCurrentMode('standard');
    setSessionId(Math.random().toString(36).substring(2, 15));
  };

  return (
    <div className="flex h-screen bg-[#fbfbfd] text-[#1d1d1f] font-sans overflow-hidden selection:bg-zinc-200 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" />

      <Sidebar
        onNewChat={handleNewChat}
        isHidden={!isIntroFinished}
        currentMode={currentMode}
        setCurrentMode={setCurrentMode}
      />

      <main className="flex-1 flex flex-col relative h-full w-full z-10 sm:ml-[60px] ml-0">
        <ChatInterface
          messages={messages}
          setMessages={setMessages}
          isIntroFinished={isIntroFinished}
          onIntroFinish={() => setIsIntroFinished(true)}
          currentMode={currentMode}
          setCurrentMode={setCurrentMode}
          sessionId={sessionId}
        />
      </main>
    </div>
  );
};

export default App;