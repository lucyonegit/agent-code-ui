/**
 * OPFS (Origin Private File System) 存储
 * 用于持久化 WebContainer 完整文件系统，包括 node_modules
 * 
 * 核心功能：
 * - 使用 WebContainer.export() 导出完整文件系统
 * - 使用 OPFS 持久化存储
 * - 使用 WebContainer.mount() 恢复文件系统
 * 
 * OPFS 优势：
 * - 高性能文件读写（比 IndexedDB 快）
 * - 支持大文件和目录结构（node_modules 可能很大）
 * - 持久化存储，浏览器重启后仍然可用
 * - 沙箱隔离，安全可靠
 */

import type { WebContainer } from '@webcontainer/api';

/**
 * OPFS 存储配置
 */
export interface OPFSStorageConfig {
  rootDir: string;           // OPFS 根目录名
  maxCacheAge: number;       // 最大缓存有效期 (ms)
  snapshotFormat: 'binary' | 'json'; // 快照格式
}

/**
 * 默认配置
 */
const DEFAULT_OPFS_CONFIG: OPFSStorageConfig = {
  rootDir: 'webcontainer-cache',
  maxCacheAge: 7 * 24 * 60 * 60 * 1000, // 7 天
  snapshotFormat: 'binary', // binary 更快更小
};

/**
 * 项目缓存元数据
 */
interface SnapshotMetadata {
  hash: string;              // package.json 哈希
  timestamp: number;         // 创建时间
  format: 'binary' | 'json'; // 快照格式
  hasNodeModules: boolean;   // 是否包含 node_modules
  size: number;              // 快照大小
}

/**
 * OPFS 存储管理器
 * 负责 WebContainer 文件系统与 OPFS 的双向同步
 */
export class OPFSStorage {
  private config: OPFSStorageConfig;
  private rootHandle: FileSystemDirectoryHandle | null = null;
  private initPromise: Promise<void> | null = null;
  private supported: boolean = false;

  constructor(config?: Partial<OPFSStorageConfig>) {
    this.config = { ...DEFAULT_OPFS_CONFIG, ...config };
    this.supported = 'storage' in navigator && 'getDirectory' in navigator.storage;
  }

  /**
   * 检查 OPFS 是否支持
   */
  isSupported(): boolean {
    return this.supported;
  }

  /**
   * 初始化 OPFS 根目录
   */
  async init(): Promise<void> {
    if (!this.supported) {
      console.warn('[OPFSStorage] OPFS not supported in this browser');
      return;
    }

    if (this.rootHandle) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const opfsRoot = await navigator.storage.getDirectory();
        this.rootHandle = await opfsRoot.getDirectoryHandle(this.config.rootDir, { create: true });
        console.log('[OPFSStorage] Initialized');
      } catch (error) {
        console.error('[OPFSStorage] Init failed:', error);
        this.supported = false;
      }
    })();

    return this.initPromise;
  }


  /**
   * 导出 WebContainer 文件系统并保存到 OPFS
   * 这会包含完整的 node_modules
   * 使用 binary 格式以保留二进制文件（WASM）和权限
   */
  async saveSnapshot(
    projectId: string,
    container: WebContainer,
    pkgHash: string
  ): Promise<void> {
    await this.init();
    if (!this.rootHandle) return;

    try {
      console.log(`[OPFSStorage] Exporting file system for: ${projectId}`);

      // 使用 binary 格式导出以保留所有二进制内容和元数据
      // JSON 格式会损坏 WASM 文件
      let snapshot: Uint8Array;
      try {
        snapshot = await container.export('.', { format: 'binary' });
      } catch (exportError: any) {
        if (exportError?.code === 'ENOENT') {
          console.warn('[OPFSStorage] Export failed with ENOENT, retrying in 1s...');
          await new Promise(r => setTimeout(r, 1000));
          snapshot = await container.export('.', { format: 'binary' });
        } else {
          throw exportError;
        }
      }

      if (!snapshot || snapshot.length === 0) {
        console.warn('[OPFSStorage] Export returned empty snapshot, skipping save');
        return;
      }

      const projectDir = await this.rootHandle.getDirectoryHandle(projectId, { create: true });

      const snapshotFile = await projectDir.getFileHandle('snapshot.bin', { create: true });
      const writable = await snapshotFile.createWritable();
      await writable.write(new Blob([snapshot as unknown as ArrayBuffer]));
      await writable.close();

      const snapshotSize = snapshot.length;

      const metadata: SnapshotMetadata = {
        hash: pkgHash,
        timestamp: Date.now(),
        format: 'binary',
        hasNodeModules: true,
        size: snapshotSize,
      };

      const metadataFile = await projectDir.getFileHandle('metadata.json', { create: true });
      const metaWritable = await metadataFile.createWritable();
      await metaWritable.write(JSON.stringify(metadata));
      await metaWritable.close();

      console.log(`[OPFSStorage] Snapshot saved: ${projectId} (${(snapshotSize / 1024 / 1024).toFixed(2)} MB)`);
    } catch (error) {
      console.error('[OPFSStorage] Save snapshot failed:', error);
      throw error;
    }
  }

  /**
   * 从 OPFS 加载快照并恢复到 WebContainer
   * 返回是否成功恢复
   */
  async restoreSnapshot(
    projectId: string,
    container: WebContainer,
    expectedHash?: string
  ): Promise<boolean> {
    await this.init();
    if (!this.rootHandle) return false;

    try {
      const projectDir = await this.rootHandle.getDirectoryHandle(projectId);

      const metadataFile = await projectDir.getFileHandle('metadata.json');
      const metadataBlob = await metadataFile.getFile();
      const metadataText = await metadataBlob.text();
      const metadata: SnapshotMetadata = JSON.parse(metadataText);

      // 检查哈希是否匹配（如果提供）
      if (expectedHash && metadata.hash !== expectedHash) {
        console.log(`[OPFSStorage] Hash mismatch for ${projectId}, cache invalidated`);
        await this.deleteProject(projectId);
        return false;
      }

      // 检查是否过期
      if (Date.now() - metadata.timestamp > this.config.maxCacheAge) {
        console.log(`[OPFSStorage] Cache expired for ${projectId}`);
        await this.deleteProject(projectId);
        return false;
      }

      // 读取二进制快照
      const snapshotFileName = metadata.format === 'binary' ? 'snapshot.bin' : 'snapshot.json';
      const snapshotFile = await projectDir.getFileHandle(snapshotFileName);
      const snapshotBlob = await snapshotFile.getFile();

      console.log(`[OPFSStorage] Restoring snapshot: ${projectId} (${(metadata.size / 1024 / 1024).toFixed(2)} MB)`);

      if (metadata.format === 'binary') {
        const arrayBuffer = await snapshotBlob.arrayBuffer();
        await container.mount(arrayBuffer);
      } else {
        // JSON 格式
        const jsonText = await snapshotBlob.text();
        const tree = JSON.parse(jsonText);
        const restoredTree = this.restoreFileTree(tree);
        await container.mount(restoredTree);
      }

      console.log(`[OPFSStorage] Snapshot restored: ${projectId}`);
      return true;
    } catch (error) {
      // 项目不存在或恢复失败
      console.log(`[OPFSStorage] No valid cache for: ${projectId}`, error);
      return false;
    }
  }

  /**
   * 递归转换文件树，将数组形式的 contents 转换回 Uint8Array
   * 同时处理符号链接和其他特殊文件类型
   */
  private restoreFileTree(tree: any, depth: number = 0): any {
    if (!tree || typeof tree !== 'object') return tree;

    const result: any = {};

    for (const key of Object.keys(tree)) {
      const node = tree[key];

      if (!node || typeof node !== 'object') {
        continue;
      }

      if (node.file) {
        const contents = node.file.contents;

        if (contents === undefined || contents === null) {
          // 符号链接或空文件 - 直接复制
          result[key] = node;
        } else if (contents instanceof Uint8Array) {
          result[key] = node;
        } else if (Array.isArray(contents)) {
          result[key] = { file: { contents: new Uint8Array(contents) } };
        } else if (typeof contents === 'object') {
          const arr = Object.values(contents) as number[];
          result[key] = { file: { contents: new Uint8Array(arr) } };
        } else if (typeof contents === 'string') {
          result[key] = node;
        } else {
          result[key] = node;
        }
      } else if (node.directory) {
        result[key] = { directory: this.restoreFileTree(node.directory, depth + 1) };
      } else {
        result[key] = node;
      }
    }

    return result;
  }

  /**
   * 获取快照元数据
   */
  async getSnapshotMetadata(projectId: string): Promise<SnapshotMetadata | null> {
    await this.init();
    if (!this.rootHandle) return null;

    try {
      const projectDir = await this.rootHandle.getDirectoryHandle(projectId);
      const metadataFile = await projectDir.getFileHandle('metadata.json');
      const metadataBlob = await metadataFile.getFile();
      const metadataText = await metadataBlob.text();
      return JSON.parse(metadataText);
    } catch {
      return null;
    }
  }


  /**
   * 检查项目快照是否存在且有效
   */
  async hasValidSnapshot(projectId: string, expectedHash?: string): Promise<boolean> {
    const metadata = await this.getSnapshotMetadata(projectId);
    if (!metadata) return false;

    // 检查哈希
    if (expectedHash && metadata.hash !== expectedHash) return false;

    // 检查过期
    if (Date.now() - metadata.timestamp > this.config.maxCacheAge) return false;

    return true;
  }

  /**
   * 删除项目快照
   */
  async deleteProject(projectId: string): Promise<void> {
    await this.init();
    if (!this.rootHandle) return;

    try {
      await this.rootHandle.removeEntry(projectId, { recursive: true });
      console.log(`[OPFSStorage] Project deleted: ${projectId}`);
    } catch {
      // 忽略不存在的情况
    }
  }

  /**
   * 列出所有缓存的项目
   */
  async listProjects(): Promise<string[]> {
    await this.init();
    if (!this.rootHandle) return [];

    const projects: string[] = [];
    try {
      for await (const [name, handle] of (this.rootHandle as any).entries()) {
        if (handle.kind === 'directory') {
          projects.push(name);
        }
      }
    } catch (error) {
      console.error('[OPFSStorage] Failed to list projects:', error);
    }
    return projects;
  }

  /**
   * 清除所有缓存
   */
  async clearAll(): Promise<void> {
    await this.init();
    if (!this.rootHandle) return;

    const projects = await this.listProjects();
    for (const projectId of projects) {
      await this.deleteProject(projectId);
    }
    console.log(`[OPFSStorage] Cleared all cache (${projects.length} projects)`);
  }

  /**
   * 清理过期缓存
   */
  async cleanup(): Promise<number> {
    await this.init();
    if (!this.rootHandle) return 0;

    const projects = await this.listProjects();
    const now = Date.now();
    let cleanedCount = 0;

    for (const projectId of projects) {
      const metadata = await this.getSnapshotMetadata(projectId);
      if (!metadata || now - metadata.timestamp > this.config.maxCacheAge) {
        await this.deleteProject(projectId);
        cleanedCount++;
      }
    }

    console.log(`[OPFSStorage] Cleaned ${cleanedCount} expired projects`);
    return cleanedCount;
  }

  /**
   * 获取总缓存大小
   */
  async getTotalCacheSize(): Promise<number> {
    const projects = await this.listProjects();
    let totalSize = 0;

    for (const projectId of projects) {
      const metadata = await this.getSnapshotMetadata(projectId);
      if (metadata) {
        totalSize += metadata.size;
      }
    }

    return totalSize;
  }

  /**
   * 获取存储使用情况
   */
  async getStorageEstimate(): Promise<{ usage: number; quota: number }> {
    if (!this.supported) return { usage: 0, quota: 0 };

    try {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    } catch {
      return { usage: 0, quota: 0 };
    }
  }

}

// 单例实例
let opfsInstance: OPFSStorage | null = null;

/**
 * 获取 OPFS 存储单例
 */
export function getOPFSStorage(config?: Partial<OPFSStorageConfig>): OPFSStorage {
  if (!opfsInstance) {
    opfsInstance = new OPFSStorage(config);
  }
  return opfsInstance;
}
