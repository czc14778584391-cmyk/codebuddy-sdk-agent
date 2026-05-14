import { PanelLeftClose, PanelLeft } from 'lucide-react';

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <button className="btn-icon" onClick={onToggleSidebar} title="切换侧边栏">
          {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
        </button>
      </div>

      <div className="header-center">
        <span className="header-title">CodeBuddy Agent</span>
      </div>

      <div className="header-right"></div>
    </header>
  );
}

export default Header;
