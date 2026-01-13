import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  type: 'user' | 'assistant' | 'error';
  content: string;
}

export function ChatMessage({ type, content }: ChatMessageProps) {
  return (
    <div className={cn(
      "flex w-full",
      type === 'user' ? 'justify-end' : 'justify-start'
    )}>
      <Card className={cn(
        "max-w-[80%] p-3",
        type === 'user' && 'bg-primary text-primary-foreground',
        type === 'assistant' && 'bg-card',
        type === 'error' && 'bg-destructive text-destructive-foreground'
      )}>
        <div className="flex items-start gap-2">
          {type === 'error' && <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
          <div className="text-sm whitespace-pre-wrap break-words">{content}</div>
        </div>
      </Card>
    </div>
  );
}
