import { useRef, useEffect } from 'react';
import { Sparkles, Lightbulb } from 'lucide-react';
import type { ChatItem } from '../types/events';
import { ChatMessage } from './ChatMessage';
import { ThoughtCard } from './ThoughtCard';
import { ToolCard } from './ToolCard';
import { FinalAnswerCard } from './FinalAnswerCard';
import { PlanCard } from './PlanCard';
import { BDDCard } from './BDDCard';
import { CodeTreeCard } from './CodeTreeCard';
import './ChatContainer.css';

interface ChatContainerProps {
  messages: ChatItem[];
  isLoading: boolean;
  onSelectPrompt?: (prompt: string) => void;
}

export function ChatContainer({ messages, isLoading, onSelectPrompt }: ChatContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const renderMessage = (item: ChatItem) => {
    switch (item.type) {
      case 'user':
        return <ChatMessage key={item.id} type="user" content={item.content} />;
      case 'thought':
        return (
          <ThoughtCard
            key={item.id}
            content={item.content}
            isStreaming={item.isStreaming}
          />
        );
      case 'normal_message':
        return <ChatMessage key={item.id} type="assistant" content={item.content} />;
      case 'tool_call':
        return (
          <ToolCard
            key={item.id}
            toolName={item.toolName || item.content}
            args={item.args || {}}
            result={item.result}
            success={item.success}
            duration={item.duration}
            timestamp={item.timestamp}
            toolCallId={item.toolCallId}
          />
        );
      case 'final_result':
        return <FinalAnswerCard key={item.id} content={item.content} />;
      case 'plan':
        return item.plan ? <PlanCard key={item.id} plan={item.plan} /> : null;
      case 'bdd':
        return item.bddFeatures ? (
          <BDDCard key={item.id} features={item.bddFeatures} />
        ) : null;
      case 'codegen':
        return item.generatedFiles ? (
          <CodeTreeCard 
            key={item.id} 
            files={item.generatedFiles} 
            summary={item.summary}
          />
        ) : null;
      case 'error':
        return <ChatMessage key={item.id} type="error" content={item.content} />;
      default:
        return null;
    }
  };

  const examplePrompts = [
    "帮我写一个 React 登录页面",
    "待办事项清单 (Todo List)",
    "个人博客模板",
    "实时天气仪表盘",
    "贪吃蛇小游戏",
    "Markdown 编辑器"
  ];

  return (
    <div className="chat-container scrollbar-hide" ref={containerRef}>
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse"></div>
            <div className="relative bg-background p-4 rounded-full shadow-lg border border-primary/20">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2 tracking-tight">AI 智能助手</h2>
          <p className="text-muted-foreground max-w-[280px] mb-10 text-sm leading-relaxed">
            我是你的全能 AI 助手，可以帮你写代码、查资料或进行深度思考。
          </p>
          
          <div className="w-full max-w-sm space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest px-2">
              <Lightbulb className="w-3 h-3" /> 试试提问
            </div>
            <div className="grid gap-2 overflow-y-auto max-h-[300px] pr-2 scrollbar-thin">
              {examplePrompts.map((prompt, i) => (
                <button 
                  key={i}
                  onClick={() => onSelectPrompt?.(prompt)}
                  className="text-left px-4 py-3 bg-muted/30 hover:bg-primary/10 hover:border-primary/30 border border-transparent rounded-xl text-xs text-secondary-foreground transition-all duration-200 group"
                >
                  <span className="opacity-70 group-hover:opacity-100">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="messages-list">
          {messages.map(renderMessage)}
          {isLoading && messages[messages.length - 1]?.type !== 'thought' && (
            <div className="loading-indicator">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

