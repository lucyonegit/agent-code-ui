/**
 * ProjectSelector - 项目选择器组件
 * 展示已保存的项目列表，支持选择项目进行预览
 */

import { useState, useEffect } from 'react';
import { getProjects, getProject, deleteProject, type ProjectInfo } from '../services/sseClient';
import './ProjectSelector.css';

interface ProjectSelectorProps {
  onSelectProject: (tree: unknown, projectId: string, projectName: string) => void;
  currentProjectId?: string;
}

export function ProjectSelector({ onSelectProject, currentProjectId }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);

  // 加载项目列表
  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const list = await getProjects();
      setProjects(list);
    } finally {
      setIsLoading(false);
    }
  };

  // 打开面板时加载项目
  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  // 选择项目
  const handleSelectProject = async (project: ProjectInfo) => {
    setLoadingProjectId(project.id);
    try {
      const detail = await getProject(project.id);
      if (detail && detail.tree) {
        onSelectProject(detail.tree, project.id, project.name);
        setIsOpen(false);
      }
    } finally {
      setLoadingProjectId(null);
    }
  };

  // 删除项目
  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个项目吗？')) return;

    const result = await deleteProject(projectId);
    if (result.success) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
    }
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="project-selector">
      <button
        className="project-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="选择已保存的项目"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <span>项目</span>
        <svg 
          className={`dropdown-arrow ${isOpen ? 'open' : ''}`} 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="project-selector-dropdown">
          <div className="dropdown-header">
            <span>已保存的项目</span>
            <button className="refresh-btn" onClick={loadProjects} disabled={isLoading}>
              <svg 
                className={isLoading ? 'spinning' : ''} 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
          </div>

          <div className="project-list">
            {isLoading && projects.length === 0 ? (
              <div className="empty-state">加载中...</div>
            ) : projects.length === 0 ? (
              <div className="empty-state">暂无保存的项目</div>
            ) : (
              projects.map(project => (
                <div
                  key={project.id}
                  className={`project-item ${project.id === currentProjectId ? 'active' : ''} ${loadingProjectId === project.id ? 'loading' : ''}`}
                  onClick={() => handleSelectProject(project)}
                >
                  <div className="project-info">
                    <div className="project-name">{project.name}</div>
                    <div className="project-meta">
                      更新于 {formatDate(project.updatedAt)}
                    </div>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={(e) => handleDeleteProject(e, project.id)}
                    title="删除项目"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 点击外部关闭 */}
      {isOpen && <div className="backdrop" onClick={() => setIsOpen(false)} />}
    </div>
  );
}
