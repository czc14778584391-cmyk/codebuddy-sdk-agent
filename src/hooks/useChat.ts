import { useState, useRef, useCallback, useEffect } from 'react';
import { useWebSocket, WSMessage } from './useWebSocket';
import type { Session } from '../App';

export interface MessageBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'error' | 'image' | 'ask_user';
  content?: string;
  toolName?: string;
  toolInput?: any;
  toolUseId?: string;
  isStreaming?: boolean;
  // AskUserQuestion 专用
  questionId?: string;
  questions?: any[];
  answered?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  blocks: MessageBlock[];
  timestamp: number;
  status?: 'streaming' | 'done' | 'error';
  duration?: number;
  cost?: number;
}

// 兼容 Electron (file://) 和浏览器 (http://localhost)
const SERVER_HOST = window.location.hostname || '127.0.0.1';
const WS_URL = `ws://${SERVER_HOST}:3001/ws`;
const API_BASE = `http://${SERVER_HOST}:3001`;
const STORAGE_PREFIX = 'cb_chat_';

function saveMessages(sessionId: string, messages: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_PREFIX + sessionId, JSON.stringify(messages));
  } catch (e) {
    console.warn('[Storage] Failed to save:', e);
  }
}

function loadMessages(sessionId: string): ChatMessage[] {
  try {
    const data = localStorage.getItem(STORAGE_PREFIX + sessionId);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function useChat(
  sessionId: string | null,
  sdkSessionId: string | null,
  model: string,
  onSessionCreated: (session: Session) => void,
  onTitleUpdate: (id: string, title: string) => void,
  onSdkSessionUpdate: (id: string, sdkSessionId: string) => void
) {
  const { connected, messages, send, clearMessages } = useWebSocket(WS_URL);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const processedIndexRef = useRef(0);
  const sessionIdRef = useRef<string | null>(sessionId);

  // 切换会话时加载历史（但如果是新创建的会话且已有消息，不要清空）
  const isNewSessionRef = useRef(false);

  useEffect(() => {
    sessionIdRef.current = sessionId;
    
    // 如果是新建会话（由 sendMessage 内部创建），跳过加载/清空
    if (isNewSessionRef.current) {
      isNewSessionRef.current = false;
      return;
    }
    
    if (sessionId) {
      const saved = loadMessages(sessionId);
      setChatMessages(saved);
    } else {
      setChatMessages([]);
    }
    clearMessages();
    processedIndexRef.current = 0;
    setIsStreaming(false);
  }, [sessionId]);

  // 非流式时自动持久化
  useEffect(() => {
    if (sessionIdRef.current && !isStreaming && chatMessages.length > 0) {
      saveMessages(sessionIdRef.current, chatMessages);
    }
  }, [chatMessages, isStreaming]);

  // 处理 WS 消息
  useEffect(() => {
    const newMessages = messages.slice(processedIndexRef.current);
    processedIndexRef.current = messages.length;
    for (const msg of newMessages) {
      handleWSMessage(msg);
    }
  }, [messages]);

  const handleWSMessage = useCallback((msg: WSMessage) => {
    switch (msg.type) {
      case 'ack':
        // 创建 assistant 消息占位
        setChatMessages((prev) => [
          ...prev,
          {
            id: msg.msgId,
            role: 'assistant',
            blocks: [],
            timestamp: msg.timestamp,
            status: 'streaming',
          },
        ]);
        setIsStreaming(true);
        break;

      case 'system':
        if (sessionIdRef.current && msg.sessionId) {
          onSdkSessionUpdate(sessionIdRef.current, msg.sessionId);
        }
        break;

      // === 流式事件 ===
      case 'stream_start':
        // 新的内容块开始
        if (msg.blockType === 'text') {
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === msg.msgId
                ? { ...m, blocks: [...m.blocks, { type: 'text', content: '', isStreaming: true }] }
                : m
            )
          );
        }
        break;

      case 'text_delta':
        // 文本增量 - 追加到最后一个 text block
        setChatMessages((prev) =>
          prev.map((m) => {
            if (m.id !== msg.msgId) return m;
            const blocks = [...m.blocks];
            // 找到最后一个正在流式的 text block
            let found = false;
            for (let i = blocks.length - 1; i >= 0; i--) {
              if (blocks[i].type === 'text' && blocks[i].isStreaming) {
                blocks[i] = { ...blocks[i], content: (blocks[i].content || '') + msg.content };
                found = true;
                break;
              }
            }
            if (!found) {
              // 没有 streaming text block，创建一个
              blocks.push({ type: 'text', content: msg.content, isStreaming: true });
            }
            return { ...m, blocks };
          })
        );
        break;

      case 'tool_input_delta':
        // 工具输入增量（暂时累积到最后一个 tool_use block）
        setChatMessages((prev) =>
          prev.map((m) => {
            if (m.id !== msg.msgId) return m;
            const blocks = [...m.blocks];
            const last = blocks[blocks.length - 1];
            if (last && last.type === 'tool_use') {
              const currentInput = typeof last.toolInput === 'string' ? last.toolInput : '';
              blocks[blocks.length - 1] = { ...last, toolInput: currentInput + msg.content };
            }
            return { ...m, blocks };
          })
        );
        break;

      case 'block_stop':
        // 内容块结束 - 标记不再 streaming
        setChatMessages((prev) =>
          prev.map((m) => {
            if (m.id !== msg.msgId) return m;
            const blocks = m.blocks.map((b) => ({ ...b, isStreaming: false }));
            return { ...m, blocks };
          })
        );
        break;

      case 'tool_use_start':
        // 工具调用开始
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === msg.msgId
              ? {
                  ...m,
                  blocks: [
                    ...m.blocks.map((b) => ({ ...b, isStreaming: false })),
                    {
                      type: 'tool_use' as const,
                      toolName: msg.toolName,
                      toolUseId: msg.toolUseId,
                      toolInput: '',
                      isStreaming: true,
                    },
                  ],
                }
              : m
          )
        );
        break;

      // === 完整消息事件 ===
      case 'text_complete':
        // turn 完成后的完整文本（作为最终确认）
        setChatMessages((prev) =>
          prev.map((m) => {
            if (m.id !== msg.msgId) return m;
            // 替换所有 streaming text blocks 为最终文本
            const hasText = m.blocks.some((b) => b.type === 'text');
            if (hasText) {
              return m; // 流式已经填充好了，不需要替换
            }
            return { ...m, blocks: [...m.blocks, { type: 'text', content: msg.content }] };
          })
        );
        break;

      case 'text':
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === msg.msgId
              ? { ...m, blocks: [...m.blocks, { type: 'text', content: msg.content }] }
              : m
          )
        );
        break;

      case 'tool_use':
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === msg.msgId
              ? {
                  ...m,
                  blocks: [
                    ...m.blocks,
                    { type: 'tool_use', toolName: msg.toolName, toolInput: msg.toolInput, toolUseId: msg.toolUseId },
                  ],
                }
              : m
          )
        );
        break;

      case 'tool_result':
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === msg.msgId
              ? {
                  ...m,
                  blocks: [
                    ...m.blocks,
                    {
                      type: 'tool_result',
                      toolUseId: msg.toolUseId,
                      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content, null, 2),
                    },
                  ],
                }
              : m
          )
        );
        break;

      case 'result':
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === msg.msgId
              ? { ...m, status: msg.subtype === 'success' ? 'done' : 'error', duration: msg.duration, cost: msg.cost }
              : m
          )
        );
        break;

      case 'done':
        setChatMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === msg.msgId
              ? { ...m, status: 'done' as const, blocks: m.blocks.map((b) => ({ ...b, isStreaming: false })) }
              : m
          );
          // 持久化
          if (sessionIdRef.current) {
            saveMessages(sessionIdRef.current, updated);
          }
          return updated;
        });
        setIsStreaming(false);
        break;

      case 'error':
        if (msg.msgId) {
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === msg.msgId
                ? { ...m, blocks: [...m.blocks, { type: 'error', content: msg.message }], status: 'error' }
                : m
            )
          );
        }
        setIsStreaming(false);
        break;

      case 'ask_user':
        // AI 向用户提问
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === msg.msgId
              ? {
                  ...m,
                  blocks: [
                    ...m.blocks,
                    {
                      type: 'ask_user' as const,
                      questionId: msg.questionId,
                      questions: msg.questions,
                      answered: false,
                    },
                  ],
                }
              : m
          )
        );
        break;
    }
  }, []);

  const sendMessage = useCallback(
    (content: string, images?: string[]) => {
      if ((!content.trim() && (!images || images.length === 0)) || isStreaming) return;

      let currentSessionId = sessionId;

      const title = content
        ? content.slice(0, 30) + (content.length > 30 ? '...' : '')
        : '图片对话';

      if (!currentSessionId) {
        currentSessionId = crypto.randomUUID();
        isNewSessionRef.current = true; // 标记：防止 useEffect 清空消息
        const newSession: Session = {
          id: currentSessionId,
          title,
          createdAt: Date.now(),
        };
        onSessionCreated(newSession);
        sessionIdRef.current = currentSessionId;
      } else if (chatMessages.length === 0) {
        onTitleUpdate(currentSessionId, title);
      }

      // 构建用户消息 blocks
      const blocks: MessageBlock[] = [];
      if (images && images.length > 0) {
        for (const img of images) {
          blocks.push({ type: 'image' as any, content: img });
        }
      }
      if (content) {
        blocks.push({ type: 'text', content });
      }

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        blocks,
        timestamp: Date.now(),
        status: 'done',
      };
      setChatMessages((prev) => [...prev, userMsg]);

      send({
        type: 'chat',
        content,
        images: images || [],
        sessionId: currentSessionId,
        sdkSessionId,
        model,
      });
    },
    [sessionId, sdkSessionId, model, isStreaming, chatMessages.length, send, onSessionCreated, onTitleUpdate]
  );

  const stopGeneration = useCallback(() => {
    send({ type: 'stop' });
    setIsStreaming(false);
  }, [send]);

  const answerQuestion = useCallback((questionId: string, answers: Record<string, string>) => {
    send({ type: 'answer', questionId, answers });
    // 标记为已回答
    setChatMessages((prev) =>
      prev.map((m) => ({
        ...m,
        blocks: m.blocks.map((b) =>
          b.type === 'ask_user' && b.questionId === questionId
            ? { ...b, answered: true }
            : b
        ),
      }))
    );
  }, [send]);

  const clearChat = useCallback(() => {
    setChatMessages([]);
    if (sessionIdRef.current) {
      localStorage.removeItem(STORAGE_PREFIX + sessionIdRef.current);
    }
    clearMessages();
    processedIndexRef.current = 0;
  }, [clearMessages]);

  return {
    chatMessages,
    isStreaming,
    connected,
    sendMessage,
    answerQuestion,
    stopGeneration,
    clearChat,
  };
}
