import { useState, useRef, useEffect } from 'react';
import { Send, Square, Image, X, ChevronDown, Loader2 } from 'lucide-react';

interface ModelInfo {
  id: string;
  name: string;
  credits?: string;
  supportsImages?: boolean;
  supportsReasoning?: boolean;
  maxOutputTokens?: number;
}

interface ChatInputProps {
  onSend: (content: string, images?: string[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  connected: boolean;
  model: string;
  onModelChange: (model: string) => void;
}

function ChatInput({ onSend, onStop, isStreaming, connected, model, onModelChange }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // 获取模型列表
  useEffect(() => {
    fetchModels();
  }, []);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function fetchModels() {
    setLoadingModels(true);
    try {
      const host = window.location.hostname || '127.0.0.1';
      const res = await fetch(`http://${host}:3001/api/models`);
      const data = await res.json();
      if (data.models && data.models.length > 0) {
        const parsed: ModelInfo[] = data.models.map((m: any) => ({
          id: m.id || m.name || m,
          name: m.name || m.id || m,
          credits: m.credits,
          supportsImages: m.supportsImages,
          supportsReasoning: m.supportsReasoning,
          maxOutputTokens: m.maxOutputTokens || 0,
        }));
        setModels(parsed);
        if (!parsed.find((m) => m.id === model) && parsed.length > 0) {
          onModelChange(parsed[0].id);
        }
      }
    } catch (err) {
      setModels([
        { id: 'kimi-k2.6', name: 'Kimi-K2.6' },
        { id: 'deepseek-v3-2-volc', name: 'DeepSeek-V3.2' },
        { id: 'glm-5.1', name: 'GLM-5.1' },
      ]);
    } finally {
      setLoadingModels(false);
    }
  }

  const currentModel = models.find((m) => m.id === model) || { id: model, name: model };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSend = () => {
    if ((!input.trim() && images.length === 0) || isStreaming) return;
    onSend(input.trim(), images.length > 0 ? images : undefined);
    setInput('');
    setImages([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 10 * 1024 * 1024) { alert('图片大小不能超过 10MB'); return; }
      const reader = new FileReader();
      reader.onload = () => setImages((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => setImages((prev) => [...prev, reader.result as string]);
        reader.readAsDataURL(file);
      }
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="chat-input-container">
      <div className="chat-input-box">
        {/* 图片预览区 */}
        {images.length > 0 && (
          <div className="input-image-preview">
            {images.map((img, idx) => (
              <div key={idx} className="image-preview-item">
                <img src={img} alt={`upload-${idx}`} />
                <button className="image-remove-btn" onClick={() => removeImage(idx)}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 输入区域 */}
        <textarea
          ref={textareaRef}
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={connected ? '输入消息，Enter 发送，Shift+Enter 换行...' : '正在连接服务器...'}
          disabled={!connected}
          rows={1}
        />

        {/* 底部工具栏（在输入框内） */}
        <div className="input-toolbar">
          <div className="toolbar-left">
            <button
              className="toolbar-btn"
              onClick={() => fileInputRef.current?.click()}
              title="上传图片"
              disabled={isStreaming}
            >
              <Image size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />

            {/* 模型选择 */}
            <div className="toolbar-model-selector" ref={modelDropdownRef}>
              <button
                className="toolbar-model-btn"
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                disabled={loadingModels}
              >
                {loadingModels ? (
                  <Loader2 size={12} className="spin" />
                ) : (
                  <>
                    <span>{currentModel.name}</span>
                    <ChevronDown size={10} />
                  </>
                )}
              </button>
              {modelDropdownOpen && !loadingModels && (
                <div className="toolbar-model-dropdown">
                  {models.map((m) => (
                    <div
                      key={m.id}
                      className={`toolbar-model-option ${m.id === model ? 'active' : ''}`}
                      onClick={() => { onModelChange(m.id); setModelDropdownOpen(false); }}
                    >
                      <div className="toolbar-model-main">
                        <span className="toolbar-model-name">{m.name}</span>
                        {m.credits && <span className="toolbar-model-credits">{m.credits}</span>}
                      </div>
                      <div className="toolbar-model-tags">
                        {m.supportsReasoning && <span className="model-tag tag-reasoning">推理</span>}
                        {m.supportsImages && <span className="model-tag tag-vision">视觉</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="toolbar-right">
            {isStreaming ? (
              <button className="btn-stop-inline" onClick={onStop} title="停止生成">
                <Square size={14} />
              </button>
            ) : (
              <button
                className="btn-send-inline"
                onClick={handleSend}
                disabled={(!input.trim() && images.length === 0) || !connected}
                title="发送消息"
              >
                <Send size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInput;
