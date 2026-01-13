import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolCardProps {
  toolName: string;
  args: Record<string, unknown>;
  result?: string;
  success?: boolean;
  duration?: number;
  timestamp?: number;
  toolCallId?: string;
}

export function ToolCard({ toolName, args, result, success, duration, timestamp }: ToolCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  const isRunning = success === undefined;
  const statusText = isRunning ? '运行中' : (success ? '完成' : '失败');

  return (
    <Card className="overflow-hidden">
      <CardHeader 
        className="p-3 cursor-pointer hover:bg-secondary transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChevronRight className={cn(
              "h-4 w-4 transition-transform",
              isExpanded && "rotate-90"
            )} />
            <span className="font-medium text-sm">{toolName}</span>
          </div>
          <Badge variant={isRunning ? 'secondary' : success ? 'default' : 'destructive'} className="flex items-center gap-1">
            {isRunning && <Loader2 className="h-3 w-3 animate-spin" />}
            {!isRunning && success && <CheckCircle2 className="h-3 w-3" />}
            {!isRunning && !success && <XCircle className="h-3 w-3" />}
            {statusText}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {duration !== undefined && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(duration)}
            </span>
          )}
          {timestamp && (
            <span>{formatTime(timestamp)}</span>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-3 pt-0 space-y-3">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">输入</div>
            <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>
          
          {result && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">输出</div>
              <div className="text-xs bg-muted p-2 rounded-md whitespace-pre-wrap break-words">
                {result}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
