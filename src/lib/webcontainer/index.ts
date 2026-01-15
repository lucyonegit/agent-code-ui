/**
 * WebContainer 高性能封装库
 * 统一导出所有模块
 */

// 核心管理器
export { WebContainerManager, getWebContainerManager } from './WebContainerManager';

// 缓存系统
export { OPFSStorage, getOPFSStorage } from './OPFSStorage';

// 性能监控
export { PerformanceMonitor, getPerformanceMonitor } from './PerformanceMonitor';

// 工具函数
export {
  stripAnsi,
  extractPackageJson,
  parseDependencies,
  compareDependencies,
  hasDependencyChanged,
  flattenFileTree,
  getFileContent,
  computeFileDiff,
  simpleHash,
  sha256Hash,
  delay,
  withTimeout,
} from './utils';

// 类型导出
export type {
  ContainerStatus,
  BootMetrics,
  FileNode,
  FileTree,
  FileDiff,
  ManagerConfig,
  ContainerEventType,
  ContainerEventHandler,
  ContainerEventHandlers,
  ManagedProcess,
  ExecResult,
  UseWebContainerOptions,
  UseWebContainerReturn,
  UpdateOptions,
  InstallOptions,
} from './types';

export { DEFAULT_CONFIG } from './types';

// ============ 调试工具：暴露到 window 供控制台使用 ============
import { getOPFSStorage } from './OPFSStorage';

// 在浏览器环境中暴露调试方法
if (typeof window !== 'undefined') {
  (window as any).__opfs = {
    async clearCache() {
      const opfs = getOPFSStorage();
      await opfs.clearAll();
      console.log('✅ OPFS cache cleared! Please refresh the page.');
    },
    async listProjects() {
      const opfs = getOPFSStorage();
      const projects = await opfs.listProjects();
      console.log('📁 Cached projects:', projects);
      return projects;
    },
    async getStorageInfo() {
      const opfs = getOPFSStorage();
      const estimate = await opfs.getStorageEstimate();
      console.log(`💾 Storage: ${(estimate.usage / 1024 / 1024).toFixed(2)} MB used of ${(estimate.quota / 1024 / 1024).toFixed(2)} MB`);
      return estimate;
    },
  };
  console.log('💡 OPFS debug helpers available: window.__opfs.clearCache(), listProjects(), getStorageInfo()');
}
