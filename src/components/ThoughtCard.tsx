import './ThoughtCard.css';

interface ThoughtCardProps {
  content: string;
  isStreaming?: boolean;
}

export function ThoughtCard({ content, isStreaming }: ThoughtCardProps) {
  return (
    <div className={`thought-card ${isStreaming ? 'streaming' : ''}`}>
      <div className="thought-header">
        <span className="thought-indicator"></span>
        <span className="thought-label">思考中</span>
      </div>
      <div className="thought-content">
        {content}
        {isStreaming && <span className="cursor-blink">|</span>}
      </div>
    </div>
  );
}
