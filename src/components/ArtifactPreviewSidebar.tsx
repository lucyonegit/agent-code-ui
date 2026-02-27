/**
 * Artifact 预览侧边栏组件
 * 从右侧滑入，渲染 artifact 文件内容
 */

import React, { useRef, useCallback, useEffect } from 'react';
import { XMarkdown } from '@ant-design/x-markdown';
import { useArtifactStore } from '../lib/useArtifactStore';
import './ArtifactPreviewSidebar.css';

export const ArtifactPreviewSidebar: React.FC = () => {
  const { isOpen, sidebarWidth, setSidebarWidth, currentArtifact, content, loading, close } = useArtifactStore();
  const isResizing = useRef(false);

  // 拖拽调宽逻辑
  const startResizing = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.body.classList.add('is-resizing');
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
    document.body.classList.remove('is-resizing');
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    
    // 计算新宽度 (从右往左拉)
    const newWidth = window.innerWidth - e.clientX;
    
    // 限制最小和最大宽度
    if (newWidth >= 300 && newWidth <= window.innerWidth * 0.8) {
      setSidebarWidth(newWidth);
    }
  }, [setSidebarWidth]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', stopResizing);
    };
  }, [handleMouseMove, stopResizing]);

  if (!isOpen) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="artifact-preview-loading">
          <div className="loading-spinner" />
          <span>加载中...</span>
        </div>
      );
    }

    if (!currentArtifact) {
      return null;
    }

    switch (currentArtifact.type) {
      case 'md':
        return (
          <div className="artifact-preview-markdown">
            <XMarkdown>{content}</XMarkdown>
          </div>
        );

      case 'html':
        return (
          <iframe
            className="artifact-preview-iframe"
            srcDoc={content}
            title={currentArtifact.name}
            sandbox="allow-scripts"
          />
        );

      case 'json':
        try {
          const json = JSON.parse(content || '{}');
          return (
            <pre className="artifact-preview-code">
              <code>{JSON.stringify(json, null, 2)}</code>
            </pre>
          );
        } catch {
          return <pre className="artifact-preview-code"><code>{content}</code></pre>;
        }

      case 'txt':
      default:
        return (
          <pre className="artifact-preview-code">
            <code>{content}</code>
          </pre>
        );
    }
  };

  return (
    <div className="artifact-preview-sidebar" style={{ width: sidebarWidth }}>
      {/* 拖拽手柄 */}
      <div className="artifact-preview-resizer" onMouseDown={startResizing} />

      <div className="artifact-preview-header">
        <div className="artifact-preview-title">
          <span className="artifact-preview-icon">📄</span>
          <span className="artifact-preview-name">{currentArtifact?.name}</span>
        </div>
        <div className="artifact-preview-actions">
          <button
            className="artifact-preview-btn"
            onClick={handleCopy}
            title="复制内容"
          >
            📋
          </button>
          <button
            className="artifact-preview-btn artifact-preview-close"
            onClick={close}
            title="关闭"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="artifact-preview-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default ArtifactPreviewSidebar;
