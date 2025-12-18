import { useRef, useEffect } from 'react';
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
}

export function ChatContainer({ messages, isLoading }: ChatContainerProps) {
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

  return (
    <div className="chat-container" ref={containerRef}>
      {messages.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◉</div>
          <h2>AI 智能助手</h2>
          <p>开始对话以查看推理过程</p>
          <div className="example-prompts">
            <span className="example-label">试试提问</span>
            <div className="examples">
              <span className="example">"北京今天天气怎么样？"</span>
              <span className="example">"计算 123 × 456"</span>
              <span className="example">"创建一个登录页面"</span>
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

