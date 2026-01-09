/**
 * useStreamingText - 打字机效果 Hook
 * 
 * 用于在 LLM 响应批量到达时模拟流式输出效果
 */

import { useState, useEffect, useRef } from 'react';

/**
 * 将文本以打字机效果逐字显示
 * @param fullText - 完整文本内容
 * @param isStreaming - 是否正在流式输出
 * @param speed - 每个字符的显示间隔（毫秒）
 */
export function useStreamingText(
  fullText: string,
  isStreaming: boolean = true,
  speed: number = 15
): string {
  const [displayText, setDisplayText] = useState('');
  const prevFullTextRef = useRef('');
  const animationRef = useRef<number | null>(null);
  const targetIndexRef = useRef(0);

  useEffect(() => {
    // 如果不是流式状态，直接显示完整文本
    if (!isStreaming) {
      setDisplayText(fullText);
      return;
    }

    // 如果新文本不是旧文本的延续（新的 thought），重置
    if (!fullText.startsWith(prevFullTextRef.current)) {
      setDisplayText('');
      targetIndexRef.current = 0;
    }
    prevFullTextRef.current = fullText;

    // 如果还有字符需要显示
    if (targetIndexRef.current < fullText.length) {
      const animate = () => {
        targetIndexRef.current++;
        setDisplayText(fullText.slice(0, targetIndexRef.current));

        if (targetIndexRef.current < fullText.length) {
          animationRef.current = window.setTimeout(animate, speed);
        }
      };

      // 清除之前的动画
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }

      // 开始新的动画
      animationRef.current = window.setTimeout(animate, speed);
    }

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [fullText, isStreaming, speed]);

  // 流式结束时返回完整文本
  return isStreaming ? displayText : fullText;
}
