/**
 * CodingLayout - 两栏布局容器（支持拖拽调整宽度）
 * 
 * 左侧：对话面板 + 输入框
 * 右侧：代码面板 & 预览
 */

import { useState, useCallback, useRef } from 'react';
import type { ChatItem, BDDFeature, GeneratedFile } from '../types/events';
import { ChatContainer } from './ChatContainer';
import { ChatInput } from './ChatInput';
import { CodePanel } from './CodePanel';
import { ResizeHandle } from './ResizeHandle';
import './CodingLayout.css';

interface CodingLayoutProps {
  messages: ChatItem[];
  isLoading: boolean;
  bddFeatures: BDDFeature[];
  generatedFiles: GeneratedFile[];
  generatedTree?: unknown;
  codeSummary?: string;
  onSend: (message: string) => void;
  onCancel: () => void;
}

// 面板最小宽度（像素）
const MIN_PANEL_WIDTH = 300;

export function CodingLayout({ 
  messages, 
  isLoading, 
  generatedFiles,
  generatedTree,
  codeSummary,
  onSend,
  onCancel
}: CodingLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 面板宽度百分比（两栏布局）
  const [panelWidths, setPanelWidths] = useState({
    chat: 35,    // 左侧对话面板
    code: 65,    // 右侧代码面板
  });

  // 处理分隔条拖拽（调整 chat 和 code 的宽度）
  const handleResize = useCallback((deltaX: number) => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const deltaPercent = (deltaX / containerWidth) * 100;
    
    setPanelWidths(prev => {
      const newChatWidth = prev.chat + deltaPercent;
      const newCodeWidth = prev.code - deltaPercent;
      
      // 检查最小宽度限制
      const minPercent = (MIN_PANEL_WIDTH / containerWidth) * 100;
      if (newChatWidth < minPercent || newCodeWidth < minPercent) {
        return prev;
      }
      
      return {
        chat: newChatWidth,
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
      
      <ResizeHandle onResize={handleResize} />
      
      <div 
        className="coding-panel code-panel-container"
        style={{ width: `${panelWidths.code}%` }}
      >
        <CodePanel 
          files={generatedFiles} 
          tree={generatedTree} 
          summary={codeSummary}
        />
      </div>
    </div>
  );
}

