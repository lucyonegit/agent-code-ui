/**
 * WebContainer 工具函数
 */

import type { FileTree, FileDiff } from './types';

export function stripAnsi(str: string): string {
  const ESC = String.fromCharCode(27); // \x1b
  const BEL = String.fromCharCode(7);  // \x07

  const ansiRegex = new RegExp(`${ESC}\\[[0-9;]*[a-zA-Z]|${ESC}\\][^${BEL}]*${BEL}`, 'g');

  return str
    .replace(ansiRegex, '')
    .replace(/\r(?!\n)/g, '\n');
}

/**
 * 从 FileTree 中提取 package.json 内容
 */
export function extractPackageJson(tree: FileTree): string | null {
  const pkg = tree['package.json'];
  if (pkg?.file?.contents) {
    return typeof pkg.file.contents === 'string'
      ? pkg.file.contents
      : new TextDecoder().decode(pkg.file.contents);
  }
  return null;
}

/**
 * 解析 package.json 中的依赖
 */
export function parseDependencies(packageJsonContent: string): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  try {
    const pkg = JSON.parse(packageJsonContent);
    return {
      dependencies: pkg.dependencies || {},
      devDependencies: pkg.devDependencies || {},
    };
  } catch {
    return { dependencies: {}, devDependencies: {} };
  }
}

/**
 * 比较两个依赖对象是否相同
 */
export function compareDependencies(
  deps1: Record<string, string>,
  deps2: Record<string, string>
): boolean {
  const keys1 = Object.keys(deps1).sort();
  const keys2 = Object.keys(deps2).sort();

  if (keys1.length !== keys2.length) return false;

  for (let i = 0; i < keys1.length; i++) {
    if (keys1[i] !== keys2[i] || deps1[keys1[i]] !== deps2[keys2[i]]) {
      return false;
    }
  }

  return true;
}

/**
 * 检测依赖是否发生变化
 */
export function hasDependencyChanged(oldTree: FileTree | null, newTree: FileTree): boolean {
  if (!oldTree) return true;

  const oldPkgContent = extractPackageJson(oldTree);
  const newPkgContent = extractPackageJson(newTree);

  if (!oldPkgContent || !newPkgContent) return true;

  const oldDeps = parseDependencies(oldPkgContent);
  const newDeps = parseDependencies(newPkgContent);

  return !compareDependencies(oldDeps.dependencies, newDeps.dependencies) ||
    !compareDependencies(oldDeps.devDependencies, newDeps.devDependencies);
}

/**
 * 计算文件树中所有文件的路径列表
 */
export function flattenFileTree(tree: FileTree, basePath: string = ''): string[] {
  const paths: string[] = [];

  for (const [name, node] of Object.entries(tree)) {
    const fullPath = basePath ? `${basePath}/${name}` : name;

    if (node.file) {
      paths.push(fullPath);
    } else if (node.directory) {
      paths.push(...flattenFileTree(node.directory, fullPath));
    }
  }

  return paths;
}

/**
 * 获取文件树中指定路径的文件内容
 */
export function getFileContent(tree: FileTree, path: string): string | null {
  const parts = path.split('/').filter(Boolean);
  let current: FileTree = tree;

  for (let i = 0; i < parts.length - 1; i++) {
    const node = current[parts[i]];
    if (!node?.directory) return null;
    current = node.directory;
  }

  const fileName = parts[parts.length - 1];
  const fileNode = current[fileName];

  if (fileNode?.file?.contents) {
    return typeof fileNode.file.contents === 'string'
      ? fileNode.file.contents
      : new TextDecoder().decode(fileNode.file.contents);
  }

  return null;
}

/**
 * 计算两个文件树的差异
 */
export function computeFileDiff(oldTree: FileTree | null, newTree: FileTree): FileDiff {
  const oldPaths = oldTree ? new Set(flattenFileTree(oldTree)) : new Set<string>();
  const newPaths = new Set(flattenFileTree(newTree));

  const added: string[] = [];
  const modified: string[] = [];
  const removed: string[] = [];

  for (const path of newPaths) {
    if (!oldPaths.has(path)) {
      added.push(path);
    } else {
      const oldContent = oldTree ? getFileContent(oldTree, path) : null;
      const newContent = getFileContent(newTree, path);
      if (oldContent !== newContent) {
        modified.push(path);
      }
    }
  }

  for (const path of oldPaths) {
    if (!newPaths.has(path)) {
      removed.push(path);
    }
  }

  return {
    added,
    modified,
    removed,
    dependenciesChanged: hasDependencyChanged(oldTree, newTree),
  };
}

/**
 * 计算字符串的简单哈希（用于快速比较）
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * 使用 Web Crypto API 计算 SHA-256 哈希
 */
export async function sha256Hash(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 创建延迟 Promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带有超时的 Promise
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string = 'Operation timed out'): Promise<T> {
  return Promise.race([
    promise,
    delay(ms).then(() => Promise.reject(new Error(message))),
  ]);
}
