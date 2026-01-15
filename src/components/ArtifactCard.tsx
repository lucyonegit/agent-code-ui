/**
 * Artifact 文件列表卡片组件
 * 展示会话产生的 artifact 文件列表
 */

import React, { useState } from 'react';
import type { ArtifactInfo } from '../types/events';
import { useArtifactStore } from '../lib/useArtifactStore';
import './ArtifactCard.css';

// 文件类型图标和颜色映射
const fileTypeConfig: Record<string, { icon: string; color: string }> = {
  md: { icon: '📄', color: '#22c55e' },      // 绿色
  html: { icon: '🌐', color: '#3b82f6' },    // 蓝色
  txt: { icon: '📝', color: '#6b7280' },     // 灰色
  json: { icon: '📋', color: '#f59e0b' },    // 黄色
  other: { icon: '📎', color: '#8b5cf6' },   // 紫色
};

interface ArtifactCardProps {
  conversationId: string;
  mode: 'react' | 'plan';
  artifacts: ArtifactInfo[];
}

const MAX_VISIBLE_FILES = 3;

export const ArtifactCard: React.FC<ArtifactCardProps> = ({
  conversationId,
  mode,
  artifacts,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { openArtifact } = useArtifactStore();

  const shouldCollapse = artifacts.length > MAX_VISIBLE_FILES;
  const visibleArtifacts = isExpanded ? artifacts : artifacts.slice(0, MAX_VISIBLE_FILES);
  const hiddenCount = artifacts.length - MAX_VISIBLE_FILES;

  const handleFileClick = (artifact: ArtifactInfo) => {
    openArtifact(conversationId, mode, artifact);
  };

  const handleExpandToggle = () => {
    setIsExpanded(!isExpanded);
  };

  if (artifacts.length === 0) {
    return null;
  }

  return (
    <div className="artifact-card">
      <div className="artifact-card-header">
        <span className="artifact-card-title">📂 生成的文件</span>
        {shouldCollapse && (
          <button
            className="artifact-card-toggle"
            onClick={handleExpandToggle}
          >
            {isExpanded ? '收起' : `查看全部 (${artifacts.length}个文件)`}
          </button>
        )}
      </div>

      <div className="artifact-card-files">
        {visibleArtifacts.map((artifact) => {
          const config = fileTypeConfig[artifact.type] || fileTypeConfig.other;
          return (
            <button
              key={artifact.path}
              className="artifact-file-item"
              onClick={() => handleFileClick(artifact)}
              style={{ '--file-color': config.color } as React.CSSProperties}
            >
              <span className="artifact-file-icon" style={{ color: config.color }}>
                {config.icon}
              </span>
              <span className="artifact-file-name">{artifact.name}</span>
            </button>
          );
        })}

        {!isExpanded && shouldCollapse && (
          <button
            className="artifact-file-more"
            onClick={handleExpandToggle}
          >
            +{hiddenCount}
          </button>
        )}
      </div>
    </div>
  );
};

export default ArtifactCard;
