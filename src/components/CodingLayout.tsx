/**
 * CodingLayout - 三栏布局容器（支持拖拽调整宽度）
 * 
 * 左侧：对话面板 + 输入框
 * 中间：BDD 面板
 * 右侧：代码面板
 */

import { useState, useCallback, useRef } from 'react';
import type { ChatItem, BDDFeature, GeneratedFile } from '../types/events';
import { ChatContainer } from './ChatContainer';
import { ChatInput } from './ChatInput';
import { BDDPanel } from './BDDPanel';
import { CodePanel } from './CodePanel';
import { ResizeHandle } from './ResizeHandle';
import './CodingLayout.css';

interface CodingLayoutProps {
  messages: ChatItem[];
  isLoading: boolean;
  bddFeatures: BDDFeature[];
  generatedFiles: GeneratedFile[];
  codeSummary?: string;
  onSend: (message: string) => void;
  onCancel: () => void;
}

// 面板最小宽度（像素）
const MIN_PANEL_WIDTH = 250;

export function CodingLayout({ 
  messages, 
  isLoading, 
  bddFeatures, 
  generatedFiles,
  codeSummary,
  onSend,
  onCancel
}: CodingLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 面板宽度百分比
  const [panelWidths, setPanelWidths] = useState({
    chat: 30,    // 左侧对话面板
    bdd: 35,     // 中间 BDD 面板
    code: 35,    // 右侧代码面板
  });

  // 处理左侧分隔条拖拽（调整 chat 和 bdd 的宽度）
  const handleLeftResize = useCallback((deltaX: number) => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const deltaPercent = (deltaX / containerWidth) * 100;
    
    setPanelWidths(prev => {
      const newChatWidth = prev.chat + deltaPercent;
      const newBddWidth = prev.bdd - deltaPercent;
      
      // 检查最小宽度限制
      const minPercent = (MIN_PANEL_WIDTH / containerWidth) * 100;
      if (newChatWidth < minPercent || newBddWidth < minPercent) {
        return prev;
      }
      
      return {
        ...prev,
        chat: newChatWidth,
        bdd: newBddWidth,
      };
    });
  }, []);

  // 处理右侧分隔条拖拽（调整 bdd 和 code 的宽度）
  const handleRightResize = useCallback((deltaX: number) => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const deltaPercent = (deltaX / containerWidth) * 100;
    
    setPanelWidths(prev => {
      const newBddWidth = prev.bdd + deltaPercent;
      const newCodeWidth = prev.code - deltaPercent;
      
      // 检查最小宽度限制
      const minPercent = (MIN_PANEL_WIDTH / containerWidth) * 100;
      if (newBddWidth < minPercent || newCodeWidth < minPercent) {
        return prev;
      }
      
      return {
        ...prev,
        bdd: newBddWidth,
        code: newCodeWidth,
      };
    });
  }, []);

  return (
    <div className="coding-layout" ref={containerRef}>
      <div 
        className="coding-panel chat-panel"
        style={{ width: `${panelWidths.chat}%` }}
      >
        <ChatContainer messages={messages} isLoading={isLoading} />
        <ChatInput onSend={onSend} isLoading={isLoading} onCancel={onCancel} />
      </div>
      
      <ResizeHandle onResize={handleLeftResize} />
      
      <div 
        className="coding-panel bdd-panel-container"
        style={{ width: `${panelWidths.bdd}%` }}
      >
        <BDDPanel features={bddFeatures} />
      </div>
      
      <ResizeHandle onResize={handleRightResize} />
      
      <div 
        className="coding-panel code-panel-container"
        style={{ width: `${panelWidths.code}%` }}
      >
        <CodePanel files={generatedFiles} summary={codeSummary} />
      </div>
    </div>
  );
}

