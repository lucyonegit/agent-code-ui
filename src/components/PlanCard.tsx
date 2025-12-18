import type { Plan } from '../types/events';
import './PlanCard.css';

interface PlanCardProps {
  plan: Plan;
}

export function PlanCard({ plan }: PlanCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return '✓';
      case 'in_progress': return '○';
      case 'failed': return '×';
      case 'skipped': return '–';
      default: return '○';
    }
  };

  const getStatusClass = (status: string) => {
    return `step-status status-${status}`;
  };

  return (
    <div className="plan-card">
      <div className="plan-header">
        <span className="plan-indicator"></span>
        <span className="plan-label">计划</span>
      </div>
      
      <div className="plan-goal">
        <span className="goal-label">目标</span>
        <span className="goal-text">{plan.goal}</span>
      </div>

      <div className="plan-steps">
        {plan.steps.map((step, index) => (
          <div key={step.id} className={`plan-step ${step.status}`}>
            <div className="step-number">{index + 1}</div>
            <div className="step-content">
              <div className="step-description">{step.description}</div>
              {step.requiredTools && step.requiredTools.length > 0 && (
                <div className="step-tools">
                  {step.requiredTools.map(tool => (
                    <span key={tool} className="tool-tag">{tool}</span>
                  ))}
                </div>
              )}
              {step.result && (
                <div className="step-result">
                  <span className="result-label">结果：</span>
                  <span className="result-text">{step.result.slice(0, 100)}...</span>
                </div>
              )}
            </div>
            <div className={getStatusClass(step.status)}>
              {getStatusIcon(step.status)}
            </div>
          </div>
        ))}
      </div>

      {plan.reasoning && (
        <div className="plan-reasoning">
          <span className="reasoning-label">推理：</span>
          <span className="reasoning-text">{plan.reasoning}</span>
        </div>
      )}
    </div>
  );
}
