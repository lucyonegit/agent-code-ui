import { useState } from 'react';
import './ToolCard.css';

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
  const statusClass = isRunning ? 'running' : (success ? 'success' : 'error');

  return (
    <div className={`tool-card ${statusClass}`}>
      <div className="tool-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="tool-header-left">
          <span className={`expand-arrow ${isExpanded ? 'expanded' : ''}`}>›</span>
          <span className="tool-name">{toolName}</span>
        </div>
        <div className="tool-header-right">
          <span className={`status-badge ${statusClass}`}>
            <span className="status-dot"></span>
            {statusText}
          </span>
        </div>
      </div>

      <div className="tool-meta">
        {duration !== undefined && (
          <span className="meta-item">{formatDuration(duration)}</span>
        )}
        {timestamp && (
          <span className="meta-item">{formatTime(timestamp)}</span>
        )}
      </div>
      
      {isExpanded && (
        <div className="tool-body">
          <div className="tool-section">
            <div className="section-header">
              <span className="section-label">输入</span>
            </div>
            <pre className="code-block">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>
          
          {result && (
            <div className="tool-section">
              <div className="section-header">
                <span className="section-label">输出</span>
              </div>
              <div className="result-content">
                {result}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
