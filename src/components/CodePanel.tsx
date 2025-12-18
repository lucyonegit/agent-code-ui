/**
 * CodePanel - Code directory and preview panel
 */

import { useState, useMemo, useEffect } from 'react';
import type { GeneratedFile } from '../types/events';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../hooks/useTheme';
import { useWebContainer } from '../hooks/useWebContainer';
import './CodePanel.css';

interface CodePanelProps {
  files: GeneratedFile[];
  tree?: any;
  summary?: string;
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
  content?: string;
}

export function CodePanel({ files, tree, summary }: CodePanelProps) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['src']));

  const { url, status, output, mountAndRun } = useWebContainer();

  useEffect(() => {
    if (tree && activeTab === 'preview') {
      mountAndRun(tree);
    }
  }, [tree, activeTab, mountAndRun]);

  const codeStyle = isDark ? vscDarkPlus : oneLight;

  // Build file tree from flat file list
  const fileTree = useMemo(() => {
    const root: TreeNode = { name: '', path: '', isDir: true, children: [] };

    files.forEach(file => {
      let normalizedPath = file.path;
      if (normalizedPath.startsWith('./')) {
        normalizedPath = normalizedPath.substring(2);
      } else if (normalizedPath.startsWith('/')) {
        normalizedPath = normalizedPath.substring(1);
      }

      const parts = normalizedPath.split('/').filter(Boolean);
      let current = root;

      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        const currentPath = parts.slice(0, index + 1).join('/');

        let child = current.children.find(c => c.name === part);
        if (!child) {
          child = {
            name: part,
            path: currentPath,
            isDir: !isLast,
            children: [],
            content: isLast ? file.content : undefined,
          };
          current.children.push(child);
        }
        current = child;
      });
    });

    // Sort: directories first, then alphabetically
    const sortTree = (node: TreeNode) => {
      node.children.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortTree);
    };
    sortTree(root);

    return root;
  }, [files]);

  const toggleDir = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const selectFile = (node: TreeNode) => {
    if (!node.isDir) {
      const file = files.find(f => {
         let normalizedPath = f.path;
         if (normalizedPath.startsWith('./')) {
            normalizedPath = normalizedPath.substring(2);
         } else if (normalizedPath.startsWith('/')) {
            normalizedPath = normalizedPath.substring(1);
         }
         return normalizedPath === node.path;
      });
      setSelectedFile(file || null);
    }
  };

  if (files.length === 0) {
    return (
      <div className="code-panel">
        <div className="code-panel-header">
          <h3>生成的代码</h3>
        </div>
        <div className="code-empty">
          <p>等待代码生成...</p>
        </div>
      </div>
    );
  }

  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'ts':
        case 'tsx':
            return 'typescript';
        case 'js':
        case 'jsx':
            return 'javascript';
        case 'css':
        case 'scss':
        case 'less':
            return 'css';
        case 'json':
            return 'json';
        case 'html':
            return 'html';
        case 'md':
            return 'markdown';
        default:
            return 'text';
    }
  };

  return (
    <div className="code-panel">
      <div className="code-panel-header">
        <div className="header-left">
          <h3>项目代码</h3>
          <div className="panel-tabs">
            <button 
              className={`tab-btn ${activeTab === 'code' ? 'active' : ''}`}
              onClick={() => setActiveTab('code')}
            >
              代码
            </button>
            <button 
              className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              预览
            </button>
          </div>
        </div>
        <span className="file-count">{files.length} 个文件</span>
      </div>
      
      {summary && activeTab === 'code' && (
        <div className="code-summary">
          <p>{summary}</p>
        </div>
      )}

      <div className="code-panel-body">
        {activeTab === 'code' ? (
          <>
            <div className="file-tree">
              {fileTree.children.map(node => (
                <TreeItem
                  key={node.path}
                  node={node}
                  depth={0}
                  expandedDirs={expandedDirs}
                  selectedPath={selectedFile ?  
                    (selectedFile.path.startsWith('./') ? selectedFile.path.substring(2) : 
                     selectedFile.path.startsWith('/') ? selectedFile.path.substring(1) : selectedFile.path) 
                    : undefined}
                  onToggleDir={toggleDir}
                  onSelectFile={selectFile}
                />
              ))}
            </div>

            <div className="code-preview">
              {selectedFile ? (
                <>
                  <div className="preview-header">
                    <span className="file-name">{selectedFile.path}</span>
                  </div>
                  <div className="code-content-wrapper">
                     <SyntaxHighlighter
                        language={getLanguage(selectedFile.path)}
                        style={codeStyle}
                        customStyle={{
                            margin: 0,
                            padding: '16px',
                            background: 'var(--color-bg-secondary)',
                            fontSize: '12px',
                            lineHeight: '1.5',
                            height: '100%'
                        }}
                        showLineNumbers={true}
                        wrapLines={true}
                     >
                        {selectedFile.content}
                     </SyntaxHighlighter>
                  </div>
                </>
              ) : (
                <div className="preview-placeholder">
                  <p>选择文件查看代码</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="runtime-preview">
            <div className="preview-container">
              {url ? (
                <iframe src={url} className="preview-iframe" title="Preview" />
              ) : (
                <div className="preview-loading">
                  <div className="spinner"></div>
                  <p>{status === 'installing' ? '正在安装依赖...' : 
                      status === 'running' ? '正在启动开发服务器...' : 
                      status === 'booting' ? '正在启动容器...' : 
                      status === 'mounting' ? '正在挂载文件...' : '等待预览启动...'}</p>
                </div>
              )}
            </div>
            <div className="terminal-container">
              <div className="terminal-header">终端输出</div>
              <pre className="terminal-content">{output}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface TreeItemProps {
  node: TreeNode;
  depth: number;
  expandedDirs: Set<string>;
  selectedPath?: string;
  onToggleDir: (path: string) => void;
  onSelectFile: (node: TreeNode) => void;
}

function TreeItem({ node, depth, expandedDirs, selectedPath, onToggleDir, onSelectFile }: TreeItemProps) {
  const isExpanded = expandedDirs.has(node.path);
  const isSelected = node.path === selectedPath;

  const handleClick = () => {
    if (node.isDir) {
      onToggleDir(node.path);
    } else {
      onSelectFile(node);
    }
  };

  return (
    <div className="tree-item">
      <div 
        className={`tree-row ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${depth * 14 + 10}px` }}
        onClick={handleClick}
      >
        {node.isDir ? (
          <span className={`folder-indicator ${isExpanded ? 'expanded' : ''}`}>›</span>
        ) : (
          <span className="file-indicator">·</span>
        )}
        <span className="node-name">{node.name}</span>
      </div>

      {node.isDir && isExpanded && (
        <div className="tree-children">
          {node.children.map(child => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedDirs={expandedDirs}
              selectedPath={selectedPath}
              onToggleDir={onToggleDir}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
