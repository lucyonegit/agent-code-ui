import { useRef, useEffect, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Send, X } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  onCancel?: () => void;
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
}

export function ChatInput({ 
  onSend, 
  isLoading, 
  onCancel, 
  placeholder = '输入你的消息...',
  value,
  onValueChange
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (value.trim() && !isLoading) {
      onSend(value.trim());
      onValueChange('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-2 p-[20px]">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          className="flex-1 min-h-[40px] max-h-[150px] px-3 py-2 text-sm bg-background border border-input rounded-md resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-muted-foreground"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={1}
        />
        {isLoading ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            title="取消"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!value.trim()}
            title="发送"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        按 Enter 发送，Shift + Enter 换行
      </div>
    </div>
  );
}
