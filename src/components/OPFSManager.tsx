/**
 * OPFSManager - OPFS 存储管理浮窗组件
 * 用于查看和管理 WebContainer 项目快照缓存
 */

import { useState, useEffect, useCallback } from 'react';
import { getOPFSStorage } from '@/lib/webcontainer/OPFSStorage';
import { HardDrive, X, Package, Trash2, RefreshCw, AlertCircle, Database } from 'lucide-react';
import './OPFSManager.css';

interface ProjectInfo {
  id: string;
  size: number;
  timestamp: number;
  hash: string;
}

export function OPFSManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [storageInfo, setStorageInfo] = useState({ usage: 0, quota: 0 });
  const [isSupported, setIsSupported] = useState(true);

  const opfs = getOPFSStorage();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 检查支持性
      if (!opfs.isSupported()) {
        setIsSupported(false);
        return;
      }

      // 获取存储信息
      const storage = await opfs.getStorageEstimate();
      setStorageInfo(storage);

      // 获取项目列表
      const projectIds = await opfs.listProjects();
      const projectInfos: ProjectInfo[] = [];

      for (const id of projectIds) {
        const metadata = await opfs.getSnapshotMetadata(id);
        if (metadata) {
          projectInfos.push({
            id,
            size: metadata.size,
            timestamp: metadata.timestamp,
            hash: metadata.hash,
          });
        }
      }

      // 按时间倒序排列
      projectInfos.sort((a, b) => b.timestamp - a.timestamp);
      setProjects(projectInfos);
    } catch (error) {
      console.error('[OPFSManager] Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [opfs]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  const handleDelete = async (projectId: string) => {
    try {
      await opfs.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      // 更新存储信息
      const storage = await opfs.getStorageEstimate();
      setStorageInfo(storage);
    } catch (error) {
      console.error('[OPFSManager] Failed to delete project:', error);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('确定要清空所有缓存吗？这将删除所有项目的 node_modules 缓存。')) {
      return;
    }
    try {
      await opfs.clearAll();
      setProjects([]);
      const storage = await opfs.getStorageEstimate();
      setStorageInfo(storage);
    } catch (error) {
      console.error('[OPFSManager] Failed to clear all:', error);
    }
  };

  const handleCleanup = async () => {
    try {
      const count = await opfs.cleanup();
      if (count > 0) {
        await loadData();
      }
    } catch (error) {
      console.error('[OPFSManager] Failed to cleanup:', error);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
    
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const usagePercent = storageInfo.quota > 0 
    ? Math.min((storageInfo.usage / storageInfo.quota) * 100, 100) 
    : 0;

  return (
    <>
      {/* 触发按钮 */}
      <button
        className="opfs-manager-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="OPFS 存储管理"
      >
        <HardDrive />
      </button>

      {/* 面板 */}
      {isOpen && (
        <div className="opfs-manager-panel">
          {/* 头部 */}
          <div className="opfs-manager-header">
            <h3>
              <Database />
              OPFS 存储管理
            </h3>
            <button className="opfs-manager-close" onClick={() => setIsOpen(false)}>
              <X size={16} />
            </button>
          </div>

          {!isSupported ? (
            <div className="opfs-manager-not-supported">
              <AlertCircle />
              <p>您的浏览器不支持 OPFS</p>
            </div>
          ) : isLoading ? (
            <div className="opfs-manager-loading">
              <div className="spinner" />
            </div>
          ) : (
            <>
              {/* 存储使用情况 */}
              <div className="opfs-manager-storage">
                <div className="opfs-manager-storage-label">存储使用</div>
                <div className="opfs-manager-storage-bar">
                  <div 
                    className="opfs-manager-storage-fill" 
                    style={{ width: `${usagePercent}%` }} 
                  />
                </div>
                <div className="opfs-manager-storage-text">
                  <strong>{formatSize(storageInfo.usage)}</strong> / {formatSize(storageInfo.quota)}
                </div>
              </div>

              {/* 项目列表 */}
              <div className="opfs-manager-list">
                {projects.length === 0 ? (
                  <div className="opfs-manager-empty">
                    <Package />
                    <p>暂无缓存项目</p>
                  </div>
                ) : (
                  projects.map(project => (
                    <div key={project.id} className="opfs-manager-item">
                      <div className="opfs-manager-item-icon">
                        <Package />
                      </div>
                      <div className="opfs-manager-item-info">
                        <div className="opfs-manager-item-name" title={project.id}>
                          {project.id}
                        </div>
                        <div className="opfs-manager-item-meta">
                          <span>{formatSize(project.size)}</span>
                          <span>·</span>
                          <span>{formatTime(project.timestamp)}</span>
                        </div>
                      </div>
                      <button
                        className="opfs-manager-item-delete"
                        onClick={() => handleDelete(project.id)}
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* 底部操作 */}
              <div className="opfs-manager-footer">
                <button onClick={() => loadData()} title="刷新">
                  <RefreshCw size={14} style={{ marginRight: 4 }} />
                  刷新
                </button>
                <button onClick={handleCleanup} title="清理过期缓存">
                  清理过期
                </button>
                <button className="destructive" onClick={handleClearAll} title="清空所有">
                  清空
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
