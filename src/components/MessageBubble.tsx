import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Bot, User, Terminal, ChevronDown, ChevronRight, AlertCircle, Copy, Check, HelpCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { ChatMessage, MessageBlock } from '../hooks/useChat';

interface MessageBubbleProps {
  message: ChatMessage;
  onAnswerQuestion?: (questionId: string, answers: Record<string, string>) => void;
}

function MessageBubble({ message, onAnswerQuestion }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`message ${isUser ? 'message-user' : 'message-assistant'}`}>
      <div className="message-avatar">
        {isUser ? (
          <div className="avatar avatar-user">
            <User size={16} />
          </div>
        ) : (
          <div className="avatar avatar-bot">
            <Bot size={16} />
          </div>
        )}
      </div>
      <div className="message-content">
        {message.blocks.map((block, idx) => (
          <BlockRenderer key={idx} block={block} onAnswerQuestion={onAnswerQuestion} />
        ))}
        {message.status === 'streaming' && message.blocks.length === 0 && (
          <div className="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        )}
        {message.status === 'streaming' && message.blocks.length > 0 && (
          <StreamingIndicator blocks={message.blocks} />
        )}
        {message.status === 'done' && message.duration && (
          <div className="message-meta">
            <span className="meta-duration">{(message.duration / 1000).toFixed(1)}s</span>
            {message.cost && <span className="meta-cost">${message.cost.toFixed(4)}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function BlockRenderer({ block, onAnswerQuestion }: { block: MessageBlock; onAnswerQuestion?: (questionId: string, answers: Record<string, string>) => void }) {
  switch (block.type) {
    case 'text':
      return (
        <div className="block-text">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              pre({ children, ...props }) {
                return <>{children}</>;
              },
              code({ className, children, node, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !match && !className;
                if (isInline) {
                  return <code className="inline-code" {...props}>{children}</code>;
                }
                // 代码块 - 从 children 中提取纯文本用于复制
                const extractText = (node: any): string => {
                  if (typeof node === 'string') return node;
                  if (Array.isArray(node)) return node.map(extractText).join('');
                  if (node?.props?.children) return extractText(node.props.children);
                  return '';
                };
                const codeText = extractText(children);
                return (
                  <div className="code-block">
                    <div className="code-block-header">
                      <span className="code-lang">{match?.[1] || 'code'}</span>
                      <CopyButton text={codeText} />
                    </div>
                    <pre><code className={className} {...props}>{children}</code></pre>
                  </div>
                );
              },
            }}
          >
            {block.content || ''}
          </ReactMarkdown>
        </div>
      );

    case 'tool_use':
      return <ToolUseBlock block={block} />;

    case 'tool_result':
      return <ToolResultBlock block={block} />;

    case 'image':
      return (
        <div className="block-image">
          <img src={block.content} alt="uploaded" />
        </div>
      );

    case 'ask_user':
      return <AskUserBlock block={block} onAnswer={onAnswerQuestion} />;

    case 'error':
      return (
        <div className="block-error">
          <AlertCircle size={14} />
          <span>{block.content}</span>
        </div>
      );

    default:
      return null;
  }
}

function StreamingIndicator({ blocks }: { blocks: MessageBlock[] }) {
  const lastBlock = blocks[blocks.length - 1];
  
  // 根据最后一个 block 的类型显示不同的 loading 状态
  let statusText = '思考中...';
  if (lastBlock) {
    switch (lastBlock.type) {
      case 'tool_use':
        statusText = `正在执行 ${lastBlock.toolName || '工具'}...`;
        break;
      case 'tool_result':
        statusText = '正在分析结果...';
        break;
      case 'ask_user':
        if (!lastBlock.answered) {
          statusText = '等待你的回答...';
        } else {
          statusText = '继续处理中...';
        }
        break;
      case 'text':
        if (lastBlock.isStreaming) return null; // 文本流式中不显示
        statusText = '继续生成...';
        break;
    }
  }

  return (
    <div className="streaming-indicator">
      <Loader2 size={14} className="spin" />
      <span>{statusText}</span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button className="btn-copy" onClick={handleCopy}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? '已复制' : '复制'}
    </button>
  );
}

function ToolUseBlock({ block }: { block: MessageBlock }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="block-tool-use">
      <div className="tool-header" onClick={() => setExpanded(!expanded)}>
        <Terminal size={14} />
        <span className="tool-name">{block.toolName}</span>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </div>
      {expanded && block.toolInput && (
        <div className="tool-body">
          <pre>{typeof block.toolInput === 'string' ? block.toolInput : JSON.stringify(block.toolInput, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function ToolResultBlock({ block }: { block: MessageBlock }) {
  const [expanded, setExpanded] = useState(false);
  const content = block.content || '';
  const isLong = content.length > 200;

  return (
    <div className="block-tool-result">
      <div className="tool-result-header" onClick={() => setExpanded(!expanded)}>
        <span className="tool-result-label">执行结果</span>
        {isLong && (expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
      </div>
      <div className={`tool-result-content ${!expanded && isLong ? 'collapsed' : ''}`}>
        <pre>{content}</pre>
      </div>
    </div>
  );
}

function AskUserBlock({ block, onAnswer }: { block: MessageBlock; onAnswer?: (questionId: string, answers: Record<string, string>) => void }) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  if (!block.questions || block.questions.length === 0) return null;

  const handleSelect = (question: string, label: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [question]: label }));
  };

  const handleSubmit = () => {
    if (block.questionId && onAnswer) {
      onAnswer(block.questionId, selectedAnswers);
    }
  };

  const allAnswered = block.questions.every((q: any) => selectedAnswers[q.question]);

  if (block.answered) {
    return (
      <div className="block-ask-user answered">
        <div className="ask-user-header">
          <HelpCircle size={14} />
          <span>已回答</span>
        </div>
        <div className="ask-user-summary">
          {Object.entries(selectedAnswers).map(([q, a]) => (
            <div key={q} className="answer-item">
              <span className="answer-q">{q}</span>
              <span className="answer-a">{a}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="block-ask-user">
      <div className="ask-user-header">
        <HelpCircle size={14} />
        <span>AI 需要你的确认</span>
      </div>
      {block.questions.map((q: any, qIdx: number) => (
        <div key={qIdx} className="ask-user-question">
          <div className="question-text">{q.question}</div>
          <div className="question-options">
            {q.options?.map((opt: any, oIdx: number) => (
              <button
                key={oIdx}
                className={`option-btn ${selectedAnswers[q.question] === opt.label ? 'selected' : ''}`}
                onClick={() => handleSelect(q.question, opt.label)}
              >
                <span className="option-label">{opt.label}</span>
                {opt.description && <span className="option-desc">{opt.description}</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button
        className="ask-user-submit"
        onClick={handleSubmit}
        disabled={!allAnswered}
      >
        确认
      </button>
    </div>
  );
}

export default MessageBubble;
