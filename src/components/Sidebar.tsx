import { useState } from 'react';
import { Ellipsis, History, MessageSquarePlus, Trash2 } from 'lucide-react';
import type { Session } from '../App';

interface SidebarProps {
  open: boolean;
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
}

function Sidebar({
  open,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}: SidebarProps) {
  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(null);
  const [pendingDeleteSession, setPendingDeleteSession] = useState<Session | null>(null);

  if (!open) return null;

  const handleDeleteClick = (session: Session) => {
    setOpenMenuSessionId(null);
    setPendingDeleteSession(session);
  };

  const confirmDelete = () => {
    if (!pendingDeleteSession) return;
    onDeleteSession(pendingDeleteSession.id);
    setPendingDeleteSession(null);
  };

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
              <div className="session-main">
                <span className="session-title">{session.title}</span>
                <span className="session-time">
                  {new Date(session.createdAt).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="session-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className="session-more-btn"
                  type="button"
                  aria-label="打开会话操作"
                  aria-expanded={openMenuSessionId === session.id}
                  onClick={() =>
                    setOpenMenuSessionId((currentId) =>
                      currentId === session.id ? null : session.id
                    )
                  }
                >
                  <Ellipsis size={16} />
                </button>
                {openMenuSessionId === session.id && (
                  <div className="session-menu">
                    <button
                      className="session-menu-item danger"
                      type="button"
                      onClick={() => handleDeleteClick(session)}
                    >
                      <Trash2 size={13} />
                      <span>删除</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {pendingDeleteSession && (
        <div className="confirm-backdrop" role="presentation">
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-session-title"
          >
            <h3 id="delete-session-title">删除会话</h3>
            <p>确认删除“{pendingDeleteSession.title}”吗？此操作会清除本地聊天记录。</p>
            <div className="confirm-actions">
              <button
                className="confirm-btn secondary"
                type="button"
                onClick={() => setPendingDeleteSession(null)}
              >
                取消
              </button>
              <button className="confirm-btn danger" type="button" onClick={confirmDelete}>
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
