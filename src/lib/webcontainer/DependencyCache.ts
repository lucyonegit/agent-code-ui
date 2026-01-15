/**
 * 依赖缓存系统
 * 使用 IndexedDB 持久化存储 node_modules 快照，避免重复安装
 */

import type { CacheEntry, CacheStats } from './types';
import { sha256Hash } from './utils';

const DB_NAME = 'webcontainer-cache';
const DB_VERSION = 1;
const STORE_NAME = 'dependencies';

/**
 * 依赖缓存管理器
 * 基于 IndexedDB 实现持久化存储
 */
export class DependencyCache {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private stats: CacheStats = {
    totalEntries: 0,
    totalSize: 0,
    hitCount: 0,
    missCount: 0,
  };

  /**
   * 初始化数据库连接
   */
  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'hash' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('size', 'size', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * 计算 package.json 和 lock 文件的哈希
   */
  async computeHash(packageJson: string, lockfile?: string): Promise<string> {
    const content = lockfile ? `${packageJson}\n${lockfile}` : packageJson;
    return sha256Hash(content);
  }

  /**
   * 检查缓存是否存在
   */
  async has(hash: string): Promise<boolean> {
    await this.init();
    if (!this.db) return false;

    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.count(hash);

      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () => resolve(false);
    });
  }

  /**
   * 获取缓存条目
   */
  async get(hash: string): Promise<CacheEntry | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(hash);

      request.onsuccess = () => {
        if (request.result) {
          this.stats.hitCount++;
          resolve(request.result);
        } else {
          this.stats.missCount++;
          resolve(null);
        }
      };
      request.onerror = () => {
        this.stats.missCount++;
        resolve(null);
      };
    });
  }

  /**
   * 存储缓存条目
   */
  async set(hash: string, nodeModulesData: Blob): Promise<void> {
    await this.init();
    if (!this.db) return;

    const entry: CacheEntry = {
      hash,
      timestamp: Date.now(),
      size: nodeModulesData.size,
      nodeModulesData,
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(entry);

      request.onsuccess = () => {
        this.stats.totalEntries++;
        this.stats.totalSize += nodeModulesData.size;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除缓存条目
   */
  async evict(hash: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(hash);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  /**
   * 清理过期和超出大小限制的缓存
   * 使用 LRU (Least Recently Used) 策略
   */
  async cleanup(maxSize: number, maxAge: number): Promise<void> {
    await this.init();
    if (!this.db) return;

    const now = Date.now();
    const entries: CacheEntry[] = [];

    // 获取所有条目
    await new Promise<void>((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          entries.push(cursor.value);
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => resolve();
    });

    // 按时间戳排序（最旧的在前）
    entries.sort((a, b) => a.timestamp - b.timestamp);

    // 删除过期条目
    const expiredHashes = entries
      .filter(e => now - e.timestamp > maxAge)
      .map(e => e.hash);

    for (const hash of expiredHashes) {
      await this.evict(hash);
    }

    // 计算当前总大小
    const remainingEntries = entries.filter(e => now - e.timestamp <= maxAge);
    let totalSize = remainingEntries.reduce((sum, e) => sum + e.size, 0);

    // 删除超出大小限制的条目（LRU）
    let i = 0;
    while (totalSize > maxSize * 1024 * 1024 && i < remainingEntries.length) {
      const entry = remainingEntries[i];
      await this.evict(entry.hash);
      totalSize -= entry.size;
      i++;
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      tx.oncomplete = () => {
        this.stats = {
          totalEntries: 0,
          totalSize: 0,
          hitCount: 0,
          missCount: 0,
        };
        resolve();
      };
      tx.onerror = () => resolve();
    });
  }
}

// 单例实例
let cacheInstance: DependencyCache | null = null;

/**
 * 获取依赖缓存单例
 */
export function getDependencyCache(): DependencyCache {
  if (!cacheInstance) {
    cacheInstance = new DependencyCache();
  }
  return cacheInstance;
}
