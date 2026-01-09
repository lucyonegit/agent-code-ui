import './ThoughtCard.css';
import { useStreamingText } from '../hooks/useStreamingText';

interface ThoughtCardProps {
  content: string;
  isStreaming?: boolean;
}

export function ThoughtCard({ content, isStreaming = false }: ThoughtCardProps) {
  // 使用打字机效果显示流式内容
  const displayContent = useStreamingText(content, isStreaming, 15);

  return (
    <div className={`thought-card ${isStreaming ? 'streaming' : ''}`}>
      <div className="thought-header">
        <span className="thought-indicator"></span>
        <span className="thought-label">思考中</span>
      </div>
      <div className="thought-content">
        {displayContent}
        {isStreaming && <span className="cursor-blink">|</span>}
      </div>
    </div>
  );
}
