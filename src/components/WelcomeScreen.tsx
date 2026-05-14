import { Code, FileSearch, Globe, Wrench } from 'lucide-react';

interface WelcomeScreenProps {
  onSuggestionClick: (content: string) => void;
}

const SUGGESTIONS = [
  {
    icon: <Code size={18} />,
    title: '编写代码',
    desc: '帮我写一个 React 组件',
    prompt: '帮我写一个带表单验证的 React 登录组件，使用 TypeScript',
  },
  {
    icon: <FileSearch size={18} />,
    title: '分析文件',
    desc: '读取并分析代码文件',
    prompt: '读取当前目录下的 package.json 文件并分析项目依赖',
  },
  {
    icon: <Globe size={18} />,
    title: '搜索资料',
    desc: '搜索互联网获取信息',
    prompt: '搜索 2026 年最新的 React 状态管理最佳实践',
  },
  {
    icon: <Wrench size={18} />,
    title: '调试修复',
    desc: '帮助定位和修复 Bug',
    prompt: '帮我检查项目中可能存在的 TypeScript 类型错误',
  },
];

function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  return (
    <div className="welcome-screen">
      <div className="welcome-header">
        <div className="welcome-logo">
          <div className="logo-glow">CB</div>
        </div>
        <h1>CodeBuddy Agent</h1>
        <p className="welcome-subtitle">
          你的 AI 编程助手，支持代码生成、文件操作、网络搜索等多种能力
        </p>
      </div>

      <div className="suggestions-grid">
        {SUGGESTIONS.map((item, idx) => (
          <button
            key={idx}
            className="suggestion-card"
            onClick={() => onSuggestionClick(item.prompt)}
          >
            <div className="suggestion-icon">{item.icon}</div>
            <div className="suggestion-text">
              <span className="suggestion-title">{item.title}</span>
              <span className="suggestion-desc">{item.desc}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default WelcomeScreen;
