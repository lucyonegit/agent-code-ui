import './ChatMessage.css';

interface ChatMessageProps {
  type: 'user' | 'assistant' | 'error';
  content: string;
}

export function ChatMessage({ type, content }: ChatMessageProps) {
  return (
    <div className={`chat-message ${type}`}>
      <div className="message-bubble">
        {type === 'error' && <span className="error-indicator">!</span>}
        {content}
      </div>
    </div>
  );
}
