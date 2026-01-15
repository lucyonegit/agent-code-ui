/**
 * useWebContainer Hook
 * 高级封装的 React Hook，提供 WebContainer 的完整功能
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  WebContainerManager,
  getWebContainerManager,
  type ContainerStatus,
  type FileTree,
  type BootMetrics,
  type ExecResult,
  type UseWebContainerOptions,
  type UseWebContainerReturn,
} from '../lib/webcontainer';

/**
 * WebContainer React Hook
 * 
 * @example
 * ```tsx
 * const { status, url, mount, update, isReady } = useWebContainer({
 *   enableCache: true,
 *   onStatusChange: (s) => console.log('Status:', s),
 * });
 * 
 * // 挂载文件并启动
 * await mount(fileTree);
 * 
 * // 更新文件（利用 HMR）
 * await update(newFileTree, oldFileTree);
 * ```
 */
export function useWebContainer(options: UseWebContainerOptions = {}): UseWebContainerReturn {
  const {
    autoPreBoot = true,
    onStatusChange,
    onOutput,
    onError,
    onServerReady,
  } = options;

  // 状态
  const [status, setStatus] = useState<ContainerStatus>('idle');
  const [url, setUrl] = useState<string | null>(null);
  const [output, setOutput] = useState<string>('');
  const [metrics, setMetrics] = useState<BootMetrics | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Refs
  const managerRef = useRef<WebContainerManager | null>(null);
  const prevTreeRef = useRef<FileTree | null>(null);
  const isFirstMountRef = useRef(true);

  // 初始化 Manager
  useEffect(() => {
    const manager = getWebContainerManager({
      enablePreBoot: autoPreBoot,
    });
    managerRef.current = manager;

    // 注册事件监听
    const handleStatusChange = (newStatus: ContainerStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    };

    const handleOutput = (data: string) => {
      setOutput(prev => prev + data);
      onOutput?.(data);
    };

    const handleServerReady = (serverUrl: string) => {
      setUrl(serverUrl);
      onServerReady?.(serverUrl);
    };

    const handleError = (error: Error) => {
      onError?.(error);
    };

    const handleMetrics = (newMetrics: BootMetrics) => {
      setMetrics(newMetrics);
    };

    manager.on('status-change', handleStatusChange);
    manager.on('output', handleOutput);
    manager.on('server-ready', handleServerReady);
    manager.on('error', handleError);
    manager.on('metrics', handleMetrics);

    // 预启动
    if (autoPreBoot) {
      manager.preBoot();
    }

    // 清理
    return () => {
      manager.off('status-change', handleStatusChange);
      manager.off('output', handleOutput);
      manager.off('server-ready', handleServerReady);
      manager.off('error', handleError);
      manager.off('metrics', handleMetrics);
    };
  }, [autoPreBoot, onStatusChange, onOutput, onError, onServerReady]);

  /**
   * 挂载文件并启动（首次）
   */
  const mount = useCallback(async (files: FileTree): Promise<void> => {
    const manager = managerRef.current;
    if (!manager) return;

    setOutput('');
    isFirstMountRef.current = false;
    prevTreeRef.current = files;

    await manager.mountAndRun(files);
  }, []);

  /**
   * 更新文件（增量更新）
   */
  const update = useCallback(async (files: FileTree, previousFiles?: FileTree): Promise<void> => {
    const manager = managerRef.current;
    if (!manager) return;

    const prev = previousFiles || prevTreeRef.current;
    prevTreeRef.current = files;

    // 如果是首次，走完整挂载流程
    if (isFirstMountRef.current) {
      return mount(files);
    }

    await manager.updateAndRefresh(files, prev || undefined);

    // 触发刷新
    setRefreshKey(k => k + 1);
  }, [mount]);

  /**
   * 强制刷新 iframe
   */
  const refresh = useCallback((): void => {
    setRefreshKey(k => k + 1);
  }, []);

  /**
   * 重启容器
   */
  const restart = useCallback(async (): Promise<void> => {
    const manager = managerRef.current;
    if (!manager) return;

    await manager.destroy();
    setOutput('');
    setUrl(null);
    setStatus('idle');
    isFirstMountRef.current = true;

    if (prevTreeRef.current) {
      await mount(prevTreeRef.current);
    }
  }, [mount]);

  /**
   * 执行命令
   */
  const exec = useCallback(async (command: string, args: string[] = []): Promise<ExecResult> => {
    const manager = managerRef.current;
    if (!manager) {
      return { exitCode: 1, output: 'Manager not initialized' };
    }
    return manager.exec(command, args);
  }, []);

  /**
   * 写入文件
   */
  const writeFile = useCallback(async (path: string, content: string): Promise<void> => {
    const manager = managerRef.current;
    if (!manager) return;
    await manager.writeFile(path, content);
  }, []);

  /**
   * 读取文件
   */
  const readFile = useCallback(async (path: string): Promise<string> => {
    const manager = managerRef.current;
    if (!manager) return '';
    return manager.readFile(path);
  }, []);

  /**
   * 智能启动 - 优先从 OPFS 缓存恢复，实现"秒开"
   * @param files - 文件树
   * @param projectId - 项目标识（用于缓存 key）
   */
  const smartStart = useCallback(async (files: FileTree, projectId: string): Promise<void> => {
    const manager = managerRef.current;
    if (!manager) return;

    setOutput('');
    isFirstMountRef.current = false;
    prevTreeRef.current = files;

    await manager.smartStart(files, projectId);
  }, []);

  /**
   * 保存当前快照到 OPFS
   */
  const saveSnapshot = useCallback(async (projectId: string): Promise<void> => {
    const manager = managerRef.current;
    if (!manager) return;
    await manager.saveSnapshotToOPFS(projectId);
  }, []);

  return {
    // 状态
    status,
    url,
    output,
    metrics,
    isReady: status === 'ready' && url !== null,
    refreshKey,

    // 核心操作
    mount,
    update,
    refresh,
    restart,
    smartStart,  // 新增：智能启动（OPFS 缓存）

    // 高级操作
    exec,
    writeFile,
    readFile,
    saveSnapshot,  // 新增：手动保存快照

    // 引用
    instance: managerRef.current?.getContainer() || null,
  };
}

// 为向后兼容导出旧的 API 结构
export default useWebContainer;
