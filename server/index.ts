import 'dotenv/config';
import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { query, unstable_v2_createSession } from '@tencent-ai/agent-sdk';
import { v4 as uuidv4 } from 'uuid';

// 启动时打印认证状态
console.log(`[Auth] API Key: ${process.env.CODEBUDDY_API_KEY ? 'SET (' + process.env.CODEBUDDY_API_KEY.slice(0, 12) + '...)' : '❌ NOT SET'}`);
console.log(`[Auth] Environment: ${process.env.CODEBUDDY_INTERNET_ENVIRONMENT || 'default (overseas)'}`);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json());

// CORS support for dev
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 获取可用模型列表 - 通过 SDK session API 动态获取
let cachedModels: any[] | null = null;
let modelsCacheTime = 0;
const MODEL_CACHE_TTL = 5 * 60 * 1000; // 5 分钟缓存

app.get('/api/models', async (req, res) => {
  try {
    // 使用缓存避免频繁创建 session
    if (cachedModels && Date.now() - modelsCacheTime < MODEL_CACHE_TTL) {
      return res.json({ models: cachedModels });
    }

    const session = unstable_v2_createSession({
      env: {
        ...process.env as Record<string, string>,
        CODEBUDDY_API_KEY: process.env.CODEBUDDY_API_KEY || '',
        CODEBUDDY_INTERNET_ENVIRONMENT: process.env.CODEBUDDY_INTERNET_ENVIRONMENT || 'internal',
      },
      permissionMode: 'plan',
    });

    const rawModels = await session.getAvailableModelsRaw();
    session.close();

    cachedModels = rawModels;
    modelsCacheTime = Date.now();

    console.log(`[Models] Fetched ${rawModels.length} models from SDK`);
    res.json({ models: rawModels });
  } catch (err: any) {
    console.error('[Models] Error fetching models:', err.message);
    // 如果 SDK 方式失败，回退到 CLI 解析
    try {
      const { execSync } = await import('child_process');
      const output = execSync('codebuddy --help 2>&1', {
        env: {
          ...process.env,
          CODEBUDDY_API_KEY: process.env.CODEBUDDY_API_KEY || '',
          CODEBUDDY_INTERNET_ENVIRONMENT: process.env.CODEBUDDY_INTERNET_ENVIRONMENT || 'internal',
        },
        encoding: 'utf-8',
      });
      // 从 --model 行解析模型列表
      const modelMatch = output.match(/--model <model>\s+.*?Currently supported: \(([^)]+)\)/);
      if (modelMatch) {
        const modelIds = modelMatch[1].split(',').map((s: string) => s.trim());
        const models = modelIds.map((id: string) => ({ id, name: id }));
        cachedModels = models;
        modelsCacheTime = Date.now();
        res.json({ models });
      } else {
        res.status(500).json({ error: 'Failed to parse models from CLI' });
      }
    } catch (fallbackErr: any) {
      res.status(500).json({ error: err.message });
    }
  }
});

interface ActiveQuery {
  sdkSessionId: string | null;
  queryIterator: AsyncIterableIterator<any> | null;
  session?: any; // 持久化 session 引用
}

// connectionId -> 当前活跃的查询
const activeQueries = new Map<string, ActiveQuery>();
// 客户端 sessionId -> SDK session_id 的映射（用于多轮对话恢复）
const sessionMapping = new Map<string, string>();
// 客户端 sessionId -> 持久化 Session 实例（复用进程，大幅加速后续请求）
const persistentSessions = new Map<string, any>();
// 等待用户回答的 Promise resolvers
const pendingAnswers = new Map<string, (answers: Record<string, string> | null) => void>();

// 等待用户回答（超时 60 秒）
function waitForUserAnswer(connectionId: string, questionId: string): Promise<Record<string, string> | null> {
  return new Promise((resolve) => {
    const key = `${connectionId}:${questionId}`;
    const timeout = setTimeout(() => {
      pendingAnswers.delete(key);
      resolve(null);
    }, 60000);

    pendingAnswers.set(key, (answers) => {
      clearTimeout(timeout);
      pendingAnswers.delete(key);
      resolve(answers);
    });
  });
}

wss.on('connection', (ws: WebSocket) => {
  const connectionId = uuidv4();
  console.log(`[WS] Client connected: ${connectionId}`);

  ws.on('message', async (raw: Buffer) => {
    try {
      const data = JSON.parse(raw.toString());
      
      switch (data.type) {
        case 'chat': {
          await handleChat(ws, data, connectionId);
          break;
        }
        case 'stop': {
          await handleStop(connectionId);
          ws.send(JSON.stringify({ type: 'stopped', timestamp: Date.now() }));
          break;
        }
        case 'answer': {
          // 用户回答了 AskUserQuestion
          const key = `${connectionId}:${data.questionId}`;
          const resolver = pendingAnswers.get(key);
          if (resolver) {
            resolver(data.answers || null);
            console.log(`[WS] User answered question: ${data.questionId}`);
          }
          break;
        }
        default:
          ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${data.type}` }));
      }
    } catch (err: any) {
      console.error('[WS] Error:', err);
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Client disconnected: ${connectionId}`);
    handleStop(connectionId);
  });
});

async function handleChat(ws: WebSocket, data: any, connectionId: string) {
  const { content, images, sessionId, sdkSessionId, model, allowedTools  } = data;

  // Stop any previous query
  await handleStop(connectionId);

  const msgId = uuidv4();
  
  // Send acknowledgment
  ws.send(JSON.stringify({
    type: 'ack',
    msgId,
    timestamp: Date.now(),
  }));

  try {
    const options: any = {
      permissionMode: 'bypassPermissions',
      maxTurns: 30,
      // 工作目录 - AI 文件操作的基准路径
      cwd: process.env.CODEBUDDY_CWD || process.cwd(),
      // 不加载 CLI 的 skills/rules/mcp 等配置，保持纯净环境
      settingSources: [],
      // 只保留核心工具，禁用 CLI 内置 skills
      tools: ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'AskUserQuestion'],
      // 系统提示：告知 AI 使用 AskUserQuestion 工具来向用户提问
      systemPrompt: {
        append: `\n\n重要：当你需要向用户提问、确认选项或做出选择时，你必须使用 AskUserQuestion 工具，而不是在文本中列出选项让用户回复。AskUserQuestion 工具会在用户界面中渲染交互式选择卡片，用户可以直接点击选项。`,
      },
      // 关键：开启流式部分消息
      includePartialMessages: true,
      // 关闭 thinking 加速响应
      thinking: { type: 'disabled' },
      // MCP 服务器配置 - 项目知识库
      mcpServers: {
        knot: {
          type: 'http',
          url: 'http://mcp.knot.woa.com/open/mcp',
          headers: {
            'x-knot-knowledge-uuids': '928f5fd2b5a048b5a33891082b749b72',
            'x-knot-api-token': '794e8832baa64682972759c94dd5c3b1',
          },
        },
      },
      // 传入环境变量
      env: {
        ...process.env,
        CODEBUDDY_API_KEY: process.env.CODEBUDDY_API_KEY || '',
        CODEBUDDY_INTERNET_ENVIRONMENT: process.env.CODEBUDDY_INTERNET_ENVIRONMENT || 'internal',
      },
      // 权限回调 - 处理 AskUserQuestion 交互
      canUseTool: async (toolName: string, input: any) => {
        if (toolName === 'AskUserQuestion') {
          // 发送问题给前端，等待用户回答
          const questionId = uuidv4();
          const questions = input.questions || [];

          ws.send(JSON.stringify({
            type: 'ask_user',
            questionId,
            questions,
            msgId,
            timestamp: Date.now(),
          }));

          // 等待前端回答（Promise + 超时）
          const answers = await waitForUserAnswer(connectionId, questionId);
          
          if (answers) {
            return {
              behavior: 'allow',
              updatedInput: { ...input, answers },
            };
          } else {
            // 超时或用户取消
            return {
              behavior: 'deny',
              message: '用户未回答问题',
            };
          }
        }
        return { behavior: 'allow', updatedInput: input };
      },
    };

    if (model) {
      options.model = model;
    }

    if (allowedTools && allowedTools.length > 0) {
      options.allowedTools = allowedTools;
    }

    // 如果有已知的 SDK session_id，使用 resume 恢复对话上下文
    const existingSdkSessionId = sessionId
      ? sessionMapping.get(sessionId) || sdkSessionId || null
      : sdkSessionId || null;
    if (existingSdkSessionId) {
      options.resume = existingSdkSessionId;
      console.log(`[SDK] Resuming session: ${existingSdkSessionId}`);
      if (sessionId) {
        sessionMapping.set(sessionId, existingSdkSessionId);
      }
    } else {
      console.log(`[SDK] Starting new session`);
    }

    // 判断是否包含图片 → 使用不同的 SDK 调用方式
    const hasImages = images && images.length > 0;
    let messageStream: AsyncIterable<any>;

    // ===== 优化：尝试复用持久化 Session（跳过 CLI 进程启动） =====
    let persistentSession = sessionId ? persistentSessions.get(sessionId) : null;

    if (persistentSession || hasImages) {
      // 使用 Session API（持久化或多模态）
      if (!persistentSession) {
        // 首次创建 Session
        const sessionOpts: any = { ...options };
        delete sessionOpts.resume;
        
        if (existingSdkSessionId) {
          persistentSession = (await import('@tencent-ai/agent-sdk')).unstable_v2_resumeSession(existingSdkSessionId, sessionOpts);
        } else {
          persistentSession = unstable_v2_createSession(sessionOpts);
        }
        // 缓存 session 实例
        if (sessionId) {
          persistentSessions.set(sessionId, persistentSession);
        }
        console.log(`[SDK] Created persistent session`);
      } else {
        console.log(`[SDK] Reusing persistent session (fast path)`);
      }

      // 构建消息内容并发送
      if (hasImages) {
        const contentBlocks: any[] = [];
        for (const img of images) {
          if (img.startsWith('data:')) {
            const match = img.match(/^data:(image\/\w+);base64,(.+)$/);
            if (match) {
              contentBlocks.push({
                type: 'image',
                source: { type: 'base64', media_type: match[1], data: match[2] },
              });
            }
          } else {
            contentBlocks.push({
              type: 'image',
              source: { type: 'url', url: img },
            });
          }
        }
        if (content) {
          contentBlocks.push({ type: 'text', text: content });
        }
        console.log(`[SDK] Multimodal send with ${images.length} image(s)`);
        
        // 必须传完整的 UserMessage 对象格式
        await persistentSession.send({
          type: 'user',
          session_id: '',
          parent_tool_use_id: null,
          message: { role: 'user', content: contentBlocks },
        });
      } else {
        // 纯文本直接传 string
        await persistentSession.send(content);
      }

      messageStream = persistentSession.stream();

      activeQueries.set(connectionId, {
        sdkSessionId: persistentSession.sessionId || existingSdkSessionId || null,
        queryIterator: null,
        session: persistentSession,
      });
      
      if (sessionId && persistentSession.sessionId) {
        sessionMapping.set(sessionId, persistentSession.sessionId);
      }

    } else {
      // ===== 首次纯文本：用 query() 然后转为持久化 =====
      const q = query({ prompt: content, options });
      const iterator = q[Symbol.asyncIterator]();
      
      activeQueries.set(connectionId, {
        sdkSessionId: existingSdkSessionId || null,
        queryIterator: iterator,
      });

      messageStream = q;
    }

    // Stream messages from SDK (统一处理)
    for await (const message of messageStream) {
      if (ws.readyState !== WebSocket.OPEN) break;

      switch (message.type) {
        case 'system':
          // 保存 session 映射
          if (sessionId && message.session_id) {
            sessionMapping.set(sessionId, message.session_id);
          }
          ws.send(JSON.stringify({
            type: 'system',
            sessionId: message.session_id,
            tools: message.tools,
            model: message.model,
            msgId,
          }));
          break;

        case 'stream_event':
          // 流式事件 - 这是实现逐字输出的核心
          handleStreamEvent(ws, message, msgId);
          break;

        case 'assistant':
          // 完整的 assistant 消息（一个 turn 结束时）
          handleAssistantMessage(ws, message, msgId);
          break;

        case 'result':
          ws.send(JSON.stringify({
            type: 'result',
            subtype: message.subtype,
            duration: message.duration_ms,
            cost: message.total_cost_usd,
            msgId,
            timestamp: Date.now(),
          }));
          break;
      }
    }

    // Send completion signal
    ws.send(JSON.stringify({
      type: 'done',
      msgId,
      timestamp: Date.now(),
    }));

  } catch (err: any) {
    console.error('[SDK] Error:', err.message);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'error',
        message: err.message,
        msgId,
        timestamp: Date.now(),
      }));
    }
  } finally {
    activeQueries.delete(connectionId);
  }
}

/**
 * 处理 SDK stream_event - 实现逐字流式输出
 * 
 * stream_event.event 结构:
 * - content_block_start: 新内容块开始 (text / tool_use / thinking)
 * - content_block_delta: 增量内容 (text_delta / input_json_delta)
 * - content_block_stop: 内容块结束
 * - message_start: 消息开始
 * - message_delta: 消息元信息更新
 * - message_stop: 消息结束
 */
function handleStreamEvent(ws: WebSocket, message: any, msgId: string) {
  const event = message.event;
  if (!event) return;

  switch (event.type) {
    case 'content_block_start':
      if (event.content_block?.type === 'text') {
        // 文本块开始
        ws.send(JSON.stringify({
          type: 'stream_start',
          blockType: 'text',
          blockIndex: event.index,
          msgId,
          timestamp: Date.now(),
        }));
      } else if (event.content_block?.type === 'tool_use') {
        // 工具调用开始
        ws.send(JSON.stringify({
          type: 'tool_use_start',
          toolName: event.content_block.name,
          toolUseId: event.content_block.id,
          blockIndex: event.index,
          msgId,
          timestamp: Date.now(),
        }));
      }
      break;

    case 'content_block_delta':
      if (event.delta?.type === 'text_delta') {
        // 文本增量 - 逐字输出的核心！
        ws.send(JSON.stringify({
          type: 'text_delta',
          content: event.delta.text,
          blockIndex: event.index,
          msgId,
          timestamp: Date.now(),
        }));
      } else if (event.delta?.type === 'input_json_delta') {
        // 工具输入参数增量
        ws.send(JSON.stringify({
          type: 'tool_input_delta',
          content: event.delta.partial_json,
          blockIndex: event.index,
          msgId,
          timestamp: Date.now(),
        }));
      }
      break;

    case 'content_block_stop':
      ws.send(JSON.stringify({
        type: 'block_stop',
        blockIndex: event.index,
        msgId,
        timestamp: Date.now(),
      }));
      break;
  }
}

/**
 * 处理完整的 assistant 消息（非流式，在 turn 完成时发出）
 */
function handleAssistantMessage(ws: WebSocket, message: any, msgId: string) {
  if (!message.message?.content) return;

  for (const block of message.message.content) {
    if (block.type === 'text') {
      ws.send(JSON.stringify({
        type: 'text_complete',
        content: block.text,
        msgId,
        timestamp: Date.now(),
      }));
    } else if (block.type === 'tool_use') {
      ws.send(JSON.stringify({
        type: 'tool_use',
        toolName: block.name,
        toolInput: block.input,
        toolUseId: block.id,
        msgId,
        timestamp: Date.now(),
      }));
    } else if (block.type === 'tool_result') {
      ws.send(JSON.stringify({
        type: 'tool_result',
        toolUseId: block.tool_use_id,
        content: block.content,
        msgId,
        timestamp: Date.now(),
      }));
    }
  }
}

async function handleStop(connectionId: string) {
  const session = activeQueries.get(connectionId);
  if (session?.queryIterator) {
    try {
      await session.queryIterator.return?.(undefined);
    } catch (e) {
      // ignore
    }
    activeQueries.delete(connectionId);
  }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 CodeBuddy Agent Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket available at ws://localhost:${PORT}/ws`);
});
