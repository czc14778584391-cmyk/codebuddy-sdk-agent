import { useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import WelcomeScreen from './WelcomeScreen';
import type { Session } from '../App';

interface ChatPanelProps {
  sessionId: string | null;
  model: string;
  onModelChange: (model: string) => void;
  onSessionCreated: (session: Session) => void;
  onTitleUpdate: (id: string, title: string) => void;
}

function ChatPanel({ sessionId, model, onModelChange, onSessionCreated, onTitleUpdate }: ChatPanelProps) {
  const {
    chatMessages,
    isStreaming,
    connected,
    sendMessage,
    answerQuestion,
    stopGeneration,
    clearChat,
  } = useChat(sessionId, model, onSessionCreated, onTitleUpdate);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  return (
    <div className="chat-panel">
      <div className="messages-container">
        {chatMessages.length === 0 ? (
          <WelcomeScreen onSuggestionClick={sendMessage} />
        ) : (
          <div className="messages-list">
            {chatMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} onAnswerQuestion={answerQuestion} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <ChatInput
        onSend={sendMessage}
        onStop={stopGeneration}
        isStreaming={isStreaming}
        connected={connected}
        model={model}
        onModelChange={onModelChange}
      />
    </div>
  );
}

export default ChatPanel;
