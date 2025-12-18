import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import './ChatInput.css';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  onCancel?: () => void;
}

export function ChatInput({ onSend, isLoading, onCancel }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="chat-input-container">
      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          placeholder="输入你的消息..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={1}
        />
        {isLoading ? (
          <button
            className="input-button cancel"
            onClick={onCancel}
            title="取消"
          >
            <span className="button-icon">×</span>
          </button>
        ) : (
          <button
            className="input-button send"
            onClick={handleSubmit}
            disabled={!input.trim()}
            title="发送"
          >
            <span className="button-icon">→</span>
          </button>
        )}
      </div>
      <div className="input-hint">
        按 Enter 发送，Shift + Enter 换行
      </div>
    </div>
  );
}
