import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Brain, Loader2 } from 'lucide-react';
import { useStreamingText } from '../hooks/useStreamingText';

interface ThoughtCardProps {
  content: string;
  isStreaming?: boolean;
}

export function ThoughtCard({ content, isStreaming = false }: ThoughtCardProps) {
  // 使用打字机效果显示流式内容
  const displayContent = useStreamingText(content, isStreaming, 15);

  return (
    <Card className="border-l-4 border-l-accent">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
          ) : (
            <Brain className="h-4 w-4 text-accent" />
          )}
          <span>思考中</span>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
          {displayContent}
          {isStreaming && <span className="animate-pulse ml-0.5">|</span>}
        </div>
      </CardContent>
    </Card>
  );
}
