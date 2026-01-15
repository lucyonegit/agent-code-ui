/**
 * WebContainer 管理器
 * 核心单例类，负责 WebContainer 的完整生命周期管理
 */

import { WebContainer, type WebContainerProcess, type FileSystemTree } from '@webcontainer/api';
import type {
  ContainerStatus,
  ContainerEventType,
  ContainerEventHandler,
  FileTree,
  BootMetrics,
  ManagerConfig,
  ManagedProcess,
  ExecResult,
  UpdateOptions,
  InstallOptions,
} from './types';
import { DEFAULT_CONFIG } from './types';
import { stripAnsi, hasDependencyChanged, extractPackageJson, sha256Hash } from './utils';
import { PerformanceMonitor, getPerformanceMonitor } from './PerformanceMonitor';
import { OPFSStorage, getOPFSStorage } from './OPFSStorage';

let globalInstance: WebContainerManager | null = null;

/**
 * WebContainer 管理器
 */
export class WebContainerManager {
  private container: WebContainer | null = null;
  private bootPromise: Promise<WebContainer> | null = null;
  private status: ContainerStatus = 'idle';
  private config: ManagerConfig;
  private monitor: PerformanceMonitor;
  private opfs: OPFSStorage;
  private processes: Map<string, ManagedProcess> = new Map();
  private devProcess: WebContainerProcess | null = null;
  private serverUrl: string | null = null;
  private currentTree: FileTree | null = null;
  private currentProjectId: string | null = null;
  private outputBuffer: string = '';

  private listeners: Map<ContainerEventType, Set<ContainerEventHandler<any>>> = new Map();

  private constructor(config?: Partial<ManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.monitor = getPerformanceMonitor();
    this.opfs = getOPFSStorage();
  }

  /**
   * 获取单例实例
   */
  static getInstance(config?: Partial<ManagerConfig>): WebContainerManager {
    if (!globalInstance) {
      globalInstance = new WebContainerManager(config);
    }
    return globalInstance;
  }

  /**
   * 重置实例（主要用于测试）
   */
  static resetInstance(): void {
    if (globalInstance) {
      globalInstance.destroy();
      globalInstance = null;
    }
  }


  /**
   * 启动 WebContainer
   */
  async boot(): Promise<WebContainer> {
    // 如果已经有实例，直接返回
    if (this.container) {
      return this.container;
    }

    // 如果正在启动，等待启动完成
    if (this.bootPromise) {
      return this.bootPromise;
    }

    // 创建启动 Promise
    this.bootPromise = this.performBoot();
    return this.bootPromise;
  }

  private async performBoot(): Promise<WebContainer> {
    try {
      this.setStatus('booting');
      this.monitor.startTimer('boot');

      const container = await WebContainer.boot();

      const bootTime = this.monitor.endTimer('boot');
      this.monitor.recordBootTime(bootTime);

      this.container = container;
      this.setupContainerListeners();

      console.log(`[WebContainerManager] Booted in ${bootTime}ms`);
      return container;
    } catch (error) {
      this.setStatus('error');
      this.bootPromise = null;
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 预启动（后台启动，不阻塞）
   */
  preBoot(): void {
    if (!this.config.enablePreBoot) return;
    if (this.container || this.bootPromise) return;

    console.log('[WebContainerManager] Pre-booting in background...');
    this.boot().catch(err => {
      console.error('[WebContainerManager] Pre-boot failed:', err);
    });
  }

  /**
   * 销毁实例
   */
  async destroy(): Promise<void> {
    for (const [id] of this.processes) {
      await this.killProcess(id);
    }

    if (this.devProcess) {
      this.devProcess.kill();
      this.devProcess = null;
    }

    this.container = null;
    this.bootPromise = null;
    this.serverUrl = null;
    this.currentTree = null;
    this.outputBuffer = '';
    this.setStatus('idle');

    console.log('[WebContainerManager] Destroyed');
  }


  /**
   * 挂载文件树
   */
  async mount(files: FileTree): Promise<void> {
    const container = await this.boot();

    this.setStatus('mounting');
    this.monitor.startTimer('mount');

    // Cast to FileSystemTree for WebContainer API compatibility
    await container.mount(files as unknown as FileSystemTree);

    const mountTime = this.monitor.endTimer('mount');
    this.monitor.recordMountTime(mountTime);

    this.currentTree = files;
  }

  /**
   * 更新文件树（智能增量更新）
   * @returns 包含更新结果的对象
   */
  async update(files: FileTree, options?: UpdateOptions): Promise<{ didInstall: boolean }> {
    const container = await this.boot();

    this.setStatus('mounting');

    await container.mount(files as unknown as FileSystemTree);

    const prevTree = this.currentTree;
    this.currentTree = files;

    let didInstall = false;
    if (options?.forceInstall || hasDependencyChanged(prevTree, files)) {
      await this.installDependencies({ useCache: true });
      didInstall = true;
    }

    return { didInstall };
  }

  /**
   * 写入单个文件
   */
  async writeFile(path: string, content: string): Promise<void> {
    const container = await this.boot();
    await container.fs.writeFile(path, content);
  }

  /**
   * 读取单个文件
   */
  async readFile(path: string): Promise<string> {
    const container = await this.boot();
    return container.fs.readFile(path, 'utf-8');
  }

  /**
   * 删除文件
   */
  async removeFile(path: string): Promise<void> {
    const container = await this.boot();
    await container.fs.rm(path, { recursive: true });
  }


  /**
   * 安装依赖
   */
  async installDependencies(_options?: InstallOptions): Promise<void> {
    const container = await this.boot();

    this.setStatus('installing');
    this.monitor.startTimer('install');
    this.appendOutput('Installing dependencies...\n');

    this.monitor.recordCacheHit(false);

    // 执行 npm install
    const installProcess = await container.spawn('npm', ['install']);

    installProcess.output.pipeTo(new WritableStream({
      write: (data) => {
        this.appendOutput(data);
      }
    }));

    const exitCode = await installProcess.exit;
    const installTime = this.monitor.endTimer('install');
    this.monitor.recordInstallTime(installTime);

    if (exitCode !== 0) {
      throw new Error(`npm install failed with exit code ${exitCode}`);
    }

    this.appendOutput(`Dependencies installed in ${installTime}ms\n`);
  }



  /**
   * 执行命令
   */
  async spawn(command: string, args: string[] = []): Promise<WebContainerProcess> {
    const container = await this.boot();
    return container.spawn(command, args);
  }

  /**
   * 执行命令并等待结果
   */
  async exec(command: string, args: string[] = []): Promise<ExecResult> {
    const process = await this.spawn(command, args);

    let output = '';
    process.output.pipeTo(new WritableStream({
      write: (data) => {
        output += stripAnsi(data);
      }
    }));

    const exitCode = await process.exit;
    return { exitCode, output };
  }

  /**
   * 启动开发服务器
   * @param force - 是否强制重启（如果已在运行）
   */
  async startDevServer(force: boolean = false): Promise<string> {
    const container = await this.boot();

    // 如果已经在运行且不要求强制重启，直接返回现有 URL
    if (this.serverUrl && !force) {
      return this.serverUrl;
    }

    // 如果要求强制重启，先终止现有进程
    if (force && this.devProcess) {
      console.log('[WebContainerManager] Terminating existing dev server for restart...');
      this.devProcess.kill();
      this.devProcess = null;
      this.serverUrl = null;
    }

    this.setStatus('running');
    this.monitor.startTimer('serverReady');
    this.appendOutput('Starting dev server...\n');

    const { devCommand, devArgs } = this.config;
    this.devProcess = await container.spawn(devCommand, devArgs);

    this.devProcess.output.pipeTo(new WritableStream({
      write: (data) => {
        this.appendOutput(data);
      }
    }));

    return new Promise((resolve) => {
      container.on('server-ready', (port, url) => {
        const serverReadyTime = this.monitor.endTimer('serverReady');
        this.monitor.recordServerReadyTime(serverReadyTime);

        this.serverUrl = url;
        this.setStatus('ready');
        this.emit('server-ready', url, port);

        console.log(`[WebContainerManager] Server ready at ${url} in ${serverReadyTime}ms`);
        resolve(url);
      });
    });
  }

  /**
   * 终止进程
   */
  async killProcess(id: string): Promise<void> {
    const managed = this.processes.get(id);
    if (managed) {
      managed.process.kill();
      this.processes.delete(id);
    }
  }


  /**
   * 挂载并启动（首次启动的完整流程）
   */
  async mountAndRun(files: FileTree, projectId?: string): Promise<string> {
    this.outputBuffer = '';
    this.currentProjectId = projectId || null;

    await this.mount(files);
    await this.installDependencies({ useCache: true });
    const url = await this.startDevServer();

    // 完成性能记录
    const metrics = this.monitor.finishMetrics();
    this.emit('metrics', metrics);

    // 保存到 OPFS（异步，不阻塞）
    if (projectId && this.opfs.isSupported()) {
      this.saveSnapshotToOPFS(projectId).catch(err => {
        console.warn('[WebContainerManager] OPFS save failed:', err);
      });
    }

    return url;
  }

  /**
   * 更新并刷新（多轮对话时的增量更新）
   * @returns 操作是否成功
   */
  async updateAndRefresh(files: FileTree): Promise<boolean> {
    try {
      // 执行增量更新，获取依赖是否变化的信号
      const { didInstall } = await this.update(files);

      // 如果安装了依赖或者服务器并未运行，则需要启动/重启服务器
      // 如果 didInstall 为 true，则强制重启服务器
      await this.startDevServer(didInstall || !this.serverUrl);

      if (this.currentProjectId && this.opfs.isSupported()) {
        this.saveSnapshotToOPFS(this.currentProjectId).catch(err => {
          console.warn('[WebContainerManager] OPFS update failed:', err);
        });
      }

      return true;
    } catch (error) {
      console.error('[WebContainerManager] updateAndRefresh failed:', error);
      return false;
    }
  }


  /**
   * 保存完整文件系统快照到 OPFS
   * 包括 node_modules，实现真正的"秒开"
   */
  async saveSnapshotToOPFS(projectId: string): Promise<void> {
    if (!this.opfs.isSupported()) return;
    if (!this.container) return;

    try {
      const packageJson = this.currentTree ? extractPackageJson(this.currentTree) || '' : '';
      const hash = await sha256Hash(packageJson);
      await this.opfs.saveSnapshot(projectId, this.container, hash);
      console.log(`[WebContainerManager] Snapshot saved: ${projectId}`);
    } catch (error) {
      console.error('[WebContainerManager] OPFS snapshot save error:', error);
    }
  }

  /**
   * 从 OPFS 恢复完整文件系统快照
   * 如果恢复成功，跳过 npm install 直接启动服务器
   * @returns 是否成功恢复
   */
  async restoreSnapshotFromOPFS(projectId: string, expectedHash?: string): Promise<boolean> {
    if (!this.opfs.isSupported()) return false;

    const container = await this.boot();

    try {
      this.setStatus('mounting');
      this.monitor.startTimer('mount');
      this.appendOutput('Restoring from OPFS cache...\n');

      const restored = await this.opfs.restoreSnapshot(projectId, container, expectedHash);

      if (!restored) {
        this.monitor.endTimer('mount');
        return false;
      }

      const mountTime = this.monitor.endTimer('mount');
      this.monitor.recordMountTime(mountTime);
      this.monitor.recordInstallTime(0); // 跳过安装
      this.monitor.recordCacheHit(true);

      this.currentProjectId = projectId;
      this.appendOutput(`Snapshot restored in ${mountTime}ms\n`);

      return true;
    } catch (error) {
      console.error('[WebContainerManager] OPFS restore error:', error);
      return false;
    }
  }

  /**
   * 智能启动：优先从 OPFS 恢复，否则完整安装
   * 这是实现"秒开"的核心方法
   */
  async smartStart(files: FileTree, projectId: string): Promise<string> {
    this.outputBuffer = '';
    this.currentProjectId = projectId;

    // 计算 package.json 哈希用于缓存验证
    const packageJson = extractPackageJson(files) || '';
    const expectedHash = await sha256Hash(packageJson);

    // 尝试从 OPFS 恢复完整快照
    if (this.opfs.isSupported()) {
      const hasValidCache = await this.opfs.hasValidSnapshot(projectId, expectedHash);

      if (hasValidCache) {
        console.log(`[WebContainerManager] Valid OPFS cache found for: ${projectId}`);
        const restored = await this.restoreSnapshotFromOPFS(projectId, expectedHash);

        if (restored) {
          // 快照恢复成功，直接启动服务器
          // 二进制快照会自动保留文件执行权限
          const url = await this.startDevServer();
          const metrics = this.monitor.finishMetrics();
          this.emit('metrics', metrics);
          return url;
        }
      }
    }

    // 无缓存或缓存失效，走正常流程
    console.log(`[WebContainerManager] No valid cache, full install for: ${projectId}`);
    await this.mount(files);
    await this.installDependencies({ useCache: false });
    const url = await this.startDevServer();

    // 完成性能记录
    const metrics = this.monitor.finishMetrics();
    this.emit('metrics', metrics);

    // 安装完成后保存快照（异步，不阻塞）
    this.saveSnapshotToOPFS(projectId).catch(err => {
      console.warn('[WebContainerManager] OPFS snapshot save failed:', err);
    });

    return url;
  }


  /**
   * 检查是否有有效的 OPFS 快照
   */
  async hasValidOPFSCache(projectId: string, files?: FileTree): Promise<boolean> {
    if (!this.opfs.isSupported()) return false;

    if (files) {
      const packageJson = extractPackageJson(files) || '';
      const expectedHash = await sha256Hash(packageJson);
      return this.opfs.hasValidSnapshot(projectId, expectedHash);
    }

    return (await this.opfs.listProjects()).includes(projectId);
  }

  /**
   * 清理过期的 OPFS 缓存
   */
  async cleanupOPFS(): Promise<number> {
    if (!this.opfs.isSupported()) return 0;
    return this.opfs.cleanup();
  }

  /**
   * 获取 OPFS 缓存信息
   */
  async getOPFSCacheInfo(): Promise<{
    totalSize: number;
    projectCount: number;
    storageUsage: number;
    storageQuota: number;
  }> {
    if (!this.opfs.isSupported()) {
      return { totalSize: 0, projectCount: 0, storageUsage: 0, storageQuota: 0 };
    }

    const [totalSize, projects, estimate] = await Promise.all([
      this.opfs.getTotalCacheSize(),
      this.opfs.listProjects(),
      this.opfs.getStorageEstimate(),
    ]);

    return {
      totalSize,
      projectCount: projects.length,
      storageUsage: estimate.usage,
      storageQuota: estimate.quota,
    };
  }


  // ============ 事件系统 ============

  /**
   * 添加事件监听器
   */
  on<T extends ContainerEventType>(event: T, handler: ContainerEventHandler<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  /**
   * 移除事件监听器
   */
  off<T extends ContainerEventType>(event: T, handler: ContainerEventHandler<T>): void {
    this.listeners.get(event)?.delete(handler);
  }

  private emit<T extends ContainerEventType>(event: T, ...args: Parameters<ContainerEventHandler<T>>): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          (handler as (...args: any[]) => void)(...args);
        } catch (error) {
          console.error(`[WebContainerManager] Event handler error:`, error);
        }
      });
    }
  }

  private setStatus(status: ContainerStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.emit('status-change', status);
    }
  }

  private appendOutput(data: string): void {
    const cleanData = stripAnsi(data);
    this.outputBuffer += cleanData;
    this.emit('output', cleanData);
  }

  private setupContainerListeners(): void {
    if (!this.container) return;

    this.container.on('error', (error) => {
      console.error('[WebContainerManager] Container error:', error);
      this.setStatus('error');
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('error', err);
    });
  }

  getStatus(): ContainerStatus {
    return this.status;
  }

  getServerUrl(): string | null {
    return this.serverUrl;
  }

  getOutput(): string {
    return this.outputBuffer;
  }

  getContainer(): WebContainer | null {
    return this.container;
  }

  getMetrics(): BootMetrics | null {
    return this.monitor.getLastMetrics();
  }

  isReady(): boolean {
    return this.status === 'ready' && this.serverUrl !== null;
  }
}

// 导出便捷获取函数
export function getWebContainerManager(config?: Partial<ManagerConfig>): WebContainerManager {
  return WebContainerManager.getInstance(config);
}
