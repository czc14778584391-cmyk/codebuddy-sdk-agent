import { useState, useEffect, useCallback } from 'react';
import ChatPanel from './components/ChatPanel';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

export interface Session {
  id: string;
  title: string;
  createdAt: number;
}

const SESSIONS_KEY = 'cb_sessions';
const CHAT_STORAGE_PREFIX = 'cb_chat_';

function loadSessions(): Session[] {
  try {
    const data = localStorage.getItem(SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: Session[]) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.warn('[Storage] Failed to save sessions:', e);
  }
}

function App() {
  const [sessions, setSessions] = useState<Session[]>(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [model, setModel] = useState('kimi-k2.6');

  // 会话列表变化时自动持久化
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  const createNewSession = () => {
    const newSession: Session = {
      id: crypto.randomUUID(),
      title: '新对话',
      createdAt: Date.now(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const handleSessionCreated = useCallback((session: Session) => {
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
  }, []);

  const handleTitleUpdate = useCallback((id: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title } : s))
    );
  }, []);

  const handleDeleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((session) => session.id !== id));
    setActiveSessionId((currentId) => (currentId === id ? null : currentId));

    try {
      localStorage.removeItem(CHAT_STORAGE_PREFIX + id);
    } catch (e) {
      console.warn('[Storage] Failed to delete session messages:', e);
    }
  }, []);

  return (
    <div className="app">
      <Sidebar
        open={sidebarOpen}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewSession={createNewSession}
        onDeleteSession={handleDeleteSession}
      />
      <div className="app-main">
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <ChatPanel
          sessionId={activeSessionId}
          model={model}
          onModelChange={setModel}
          onSessionCreated={handleSessionCreated}
          onTitleUpdate={handleTitleUpdate}
        />
      </div>
    </div>
  );
}

export default App;
