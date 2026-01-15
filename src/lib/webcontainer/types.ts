/**
 * WebContainer 高性能封装 - 类型定义
 */

import type { WebContainer, WebContainerProcess } from '@webcontainer/api';


/**
 * 容器状态枚举
 */
export type ContainerStatus =
  | 'idle'        // 空闲，未启动
  | 'booting'     // 正在启动容器
  | 'mounting'    // 正在挂载文件
  | 'installing'  // 正在安装依赖
  | 'running'     // 开发服务器正在启动
  | 'ready'       // 就绪，可以预览
  | 'error';      // 发生错误

/**
 * 启动性能指标
 */
export interface BootMetrics {
  bootTime: number;         // 容器启动时间 (ms)
  mountTime: number;        // 文件挂载时间 (ms)
  installTime: number;      // 依赖安装时间 (ms)
  serverReadyTime: number;  // 服务器就绪时间 (ms)
  totalTime: number;        // 总时间 (ms)
  cacheHit: boolean;        // 是否命中依赖缓存
}


/**
 * WebContainer 文件树结构
 * 兼容 @webcontainer/api 的 FileSystemTree
 */
export interface FileNode {
  file?: {
    contents: string | Uint8Array;
  };
  directory?: FileTree;
}

export interface FileTree {
  [path: string]: FileNode;
}

/**
 * 文件差分结果
 */
export interface FileDiff {
  added: string[];      // 新增的文件路径
  modified: string[];   // 修改的文件路径
  removed: string[];    // 删除的文件路径
  dependenciesChanged: boolean;  // package.json 依赖是否变化
}


/**
 * Manager 配置选项
 */
export interface ManagerConfig {
  enablePreBoot: boolean;         // 是否启用预启动
  cacheMaxSize: number;           // 最大缓存大小 (MB)
  cacheMaxAge: number;            // 缓存最大有效期 (ms)
  devCommand: string;             // 开发服务器启动命令
  devArgs: string[];              // 开发服务器启动参数
}

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: ManagerConfig = {
  enablePreBoot: true,
  cacheMaxSize: 500,              // 500 MB
  cacheMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
  devCommand: 'npm',
  devArgs: ['run', 'dev'],
};


/**
 * 容器事件类型
 */
export type ContainerEventType =
  | 'status-change'
  | 'output'
  | 'server-ready'
  | 'error'
  | 'metrics';

/**
 * 事件处理器
 */
export interface ContainerEventHandlers {
  'status-change': (status: ContainerStatus) => void;
  'output': (data: string) => void;
  'server-ready': (url: string, port: number) => void;
  'error': (error: Error) => void;
  'metrics': (metrics: BootMetrics) => void;
}

export type ContainerEventHandler<T extends ContainerEventType> = ContainerEventHandlers[T];


/**
 * 托管进程信息
 */
export interface ManagedProcess {
  id: string;
  process: WebContainerProcess;
  command: string;
  args: string[];
  startTime: number;
}

/**
 * 命令执行结果
 */
export interface ExecResult {
  exitCode: number;
  output: string;
}


/**
 * useWebContainer Hook 选项
 */
export interface UseWebContainerOptions {
  autoPreBoot?: boolean;
  onStatusChange?: (status: ContainerStatus) => void;
  onOutput?: (data: string) => void;
  onError?: (error: Error) => void;
  onServerReady?: (url: string) => void;
}

/**
 * useWebContainer Hook 返回值
 */
export interface UseWebContainerReturn {
  // 状态
  status: ContainerStatus;
  url: string | null;
  output: string;
  metrics: BootMetrics | null;
  isReady: boolean;

  // 核心操作
  mount: (files: FileTree) => Promise<void>;
  update: (files: FileTree, previousFiles?: FileTree) => Promise<void>;
  refresh: () => void;
  restart: () => Promise<void>;
  smartStart: (files: FileTree, projectId: string) => Promise<void>;  // OPFS 缓存启动

  // 高级操作
  exec: (command: string, args?: string[]) => Promise<ExecResult>;
  writeFile: (path: string, content: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
  saveSnapshot: (projectId: string) => Promise<void>;  // 保存快照到 OPFS

  // 引用
  instance: WebContainer | null;
  refreshKey: number;
}


/**
 * 移除 ANSI 转义序列的函数类型
 */
export type StripAnsiFn = (str: string) => string;

/**
 * 更新选项
 */
export interface UpdateOptions {
  forceInstall?: boolean;    // 强制重新安装依赖
  skipHmr?: boolean;         // 跳过 HMR，强制刷新
}

/**
 * 安装选项
 */
export interface InstallOptions {
  useCache?: boolean;        // 是否使用缓存
  force?: boolean;           // 强制安装（忽略缓存）
}
