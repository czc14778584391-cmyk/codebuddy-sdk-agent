import { MessageSquarePlus, History } from 'lucide-react';
import type { Session } from '../App';

interface SidebarProps {
  open: boolean;
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
}

function Sidebar({ open, sessions, activeSessionId, onSelectSession, onNewSession }: SidebarProps) {
  if (!open) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">CB</div>
          <span className="logo-text">CodeBuddy Agent</span>
        </div>
        <button className="btn-icon" onClick={onNewSession} title="新建对话">
          <MessageSquarePlus size={18} />
        </button>
      </div>

      <div className="sidebar-content">
        <div className="sidebar-section-title">
          <History size={14} />
          <span>历史会话</span>
        </div>
        <div className="session-list">
          {sessions.length === 0 && (
            <div className="empty-sessions">暂无历史会话</div>
          )}
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`session-item ${session.id === activeSessionId ? 'active' : ''}`}
              onClick={() => onSelectSession(session.id)}
            >
              <span className="session-title">{session.title}</span>
              <span className="session-time">
                {new Date(session.createdAt).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
