import './FinalAnswerCard.css';

interface FinalAnswerCardProps {
  content: string;
}

export function FinalAnswerCard({ content }: FinalAnswerCardProps) {
  return (
    <div className="final-answer-card">
      <div className="final-header">
        <span className="final-indicator"></span>
        <span className="final-label">答案</span>
      </div>
      <div className="final-content">
        {content}
      </div>
    </div>
  );
}
