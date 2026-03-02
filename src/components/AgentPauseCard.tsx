/**
 * AgentPauseCard - 通用 Agent 暂停交互卡片
 *
 * 根据 payload.type 渲染不同 UI：
 * - clarification: 问答表单
 * - confirmation: 确认/取消按钮
 * - 其他: 通用文本输入
 */

import { useState } from 'react';
import { Pause, Send, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ClarificationQuestion } from '../types/events';
import { submitAgentResume } from '../services/sseClient';
import './AgentPauseCard.css';

interface AgentPauseCardProps {
  sessionId: string;
  payload: Record<string, any>;
}

export function AgentPauseCard({ sessionId, payload }: AgentPauseCardProps) {
  const pauseType = payload?.type as string;

  switch (pauseType) {
    case 'clarification':
      return (
        <ClarificationUI
          sessionId={sessionId}
          questions={(payload.questions || []) as ClarificationQuestion[]}
        />
      );
    case 'confirmation':
      return (
        <ConfirmationUI
          sessionId={sessionId}
          message={payload.message as string || '请确认是否继续'}
        />
      );
    default:
      return (
        <GenericPauseUI
          sessionId={sessionId}
          message={payload.message as string || 'Agent 已暂停，等待输入'}
        />
      );
  }
}

// ============================================================================
// 澄清 UI（问答表单）
// ============================================================================

function ClarificationUI({
  sessionId,
  questions,
}: {
  sessionId: string;
  questions: ClarificationQuestion[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await submitAgentResume(sessionId, { answers });
      if (result.success) {
        setIsSubmitted(true);
      } else {
        setError(result.error || '提交失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      const result = await submitAgentResume(sessionId, {});
      if (result.success) setIsSubmitted(true);
    } catch {
      setError('网络错误');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="agent-pause-card agent-pause-submitted">
        <div className="agent-pause-header">
          <Check className="w-4 h-4" />
          <span>需求补充完成</span>
        </div>
        <div className="agent-pause-summary">
          {Object.entries(answers).length > 0 ? (
            <ul>
              {questions.map(q =>
                answers[q.id] ? (
                  <li key={q.id}>
                    <span className="agent-pause-q-label">{q.question}</span>
                    <span className="agent-pause-a-label">{answers[q.id]}</span>
                  </li>
                ) : null
              )}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">已跳过，使用原始需求继续</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="agent-pause-card">
      <div className="agent-pause-header">
        <Pause className="w-4 h-4" />
        <span>需要更多信息来帮你更好地开发</span>
      </div>

      <div className="agent-pause-questions">
        {questions.map(q => (
          <div key={q.id} className="agent-pause-question">
            <label className="agent-pause-label">{q.question}</label>

            {q.type === 'text' && (
              <input
                type="text"
                className="agent-pause-input"
                placeholder={q.placeholder || '请输入...'}
                value={answers[q.id] || ''}
                onChange={e => handleAnswerChange(q.id, e.target.value)}
                disabled={isSubmitting}
              />
            )}

            {q.type === 'single_choice' && q.options && (
              <div className="agent-pause-options">
                {q.options.map(option => (
                  <button
                    key={option}
                    className={`agent-pause-option ${answers[q.id] === option ? 'selected' : ''}`}
                    onClick={() => handleAnswerChange(q.id, option)}
                    disabled={isSubmitting}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {q.type === 'multi_choice' && q.options && (
              <div className="agent-pause-options">
                {q.options.map(option => {
                  const selected = (answers[q.id] || '').split(',').filter(Boolean).includes(option);
                  return (
                    <button
                      key={option}
                      className={`agent-pause-option ${selected ? 'selected' : ''}`}
                      onClick={() => {
                        const current = (answers[q.id] || '').split(',').filter(Boolean);
                        const next = selected
                          ? current.filter(v => v !== option)
                          : [...current, option];
                        handleAnswerChange(q.id, next.join(','));
                      }}
                      disabled={isSubmitting}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <div className="text-xs text-red-400 px-1">{error}</div>}

      <div className="agent-pause-actions">
        <button className="agent-pause-skip" onClick={handleSkip} disabled={isSubmitting}>
          跳过，直接开始
        </button>
        <Button size="sm" onClick={handleSubmit} disabled={isSubmitting} className="agent-pause-submit">
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
          ) : (
            <Send className="w-3.5 h-3.5 mr-1" />
          )}
          确认提交
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// 确认 UI（确认/取消按钮）
// ============================================================================

function ConfirmationUI({
  sessionId,
  message,
}: {
  sessionId: string;
  message: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolved, setIsResolved] = useState(false);
  const [resolvedAction, setResolvedAction] = useState<'confirm' | 'cancel'>('confirm');

  const handleAction = async (action: 'confirm' | 'cancel') => {
    setIsSubmitting(true);
    try {
      const result = await submitAgentResume(sessionId, { confirm: action === 'confirm' ? 'yes' : 'no' });
      if (result.success) {
        setIsResolved(true);
        setResolvedAction(action);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isResolved) {
    return (
      <div className="agent-pause-card agent-pause-submitted">
        <div className="agent-pause-header">
          <Check className="w-4 h-4" />
          <span>{resolvedAction === 'confirm' ? '已确认' : '已取消'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-pause-card">
      <div className="agent-pause-header">
        <Pause className="w-4 h-4" />
        <span>需要确认</span>
      </div>
      <p className="text-sm px-1 mb-3">{message}</p>
      <div className="agent-pause-actions">
        <Button variant="outline" size="sm" onClick={() => handleAction('cancel')} disabled={isSubmitting}>
          <X className="w-3.5 h-3.5 mr-1" />
          取消
        </Button>
        <Button size="sm" onClick={() => handleAction('confirm')} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
          确认
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// 通用暂停 UI（自由文本输入）
// ============================================================================

function GenericPauseUI({
  sessionId,
  message,
}: {
  sessionId: string;
  message: string;
}) {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolved, setIsResolved] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await submitAgentResume(sessionId, { input });
      if (result.success) setIsResolved(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isResolved) {
    return (
      <div className="agent-pause-card agent-pause-submitted">
        <div className="agent-pause-header">
          <Check className="w-4 h-4" />
          <span>已提交</span>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-pause-card">
      <div className="agent-pause-header">
        <Pause className="w-4 h-4" />
        <span>{message}</span>
      </div>
      <input
        type="text"
        className="agent-pause-input"
        placeholder="请输入..."
        value={input}
        onChange={e => setInput(e.target.value)}
        disabled={isSubmitting}
      />
      <div className="agent-pause-actions" style={{ marginTop: 12 }}>
        <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
          提交
        </Button>
      </div>
    </div>
  );
}
