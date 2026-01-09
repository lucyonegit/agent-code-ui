/**
 * SSE Client for connecting to base-agent server
 */

import type { AgentEvent, UnifiedMessage } from '../types/events';

const API_BASE = 'http://localhost:3002';

export interface SSEClientOptions {
  onEvent: (event: AgentEvent) => void;
  onDone?: (result: string) => void;
  onError?: (error: string) => void;
}

/**
 * Send a message to the ReAct agent via SSE
 */
export function sendMessage(
  input: string,
  tools: string[],
  history: UnifiedMessage[],
  options: SSEClientOptions
): () => void {
  const abortController = new AbortController();

  const fetchSSE = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input, tools, history }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      let currentEvent = '';
      let currentData = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
          } else if (line.startsWith('data: ')) {
            currentData = line.slice(6);
            if (currentEvent && currentData) {
              try {
                const parsed = JSON.parse(currentData) as AgentEvent;

                if (currentEvent === 'done') {
                  options.onDone?.(parsed.type === 'done' ? parsed.result : '');
                } else {
                  options.onEvent(parsed);
                }
              } catch {
                console.error('Failed to parse SSE data:', currentData);
              }
              currentEvent = '';
              currentData = '';
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        const message = error instanceof Error ? error.message : 'Unknown error';
        options.onError?.(message);
      }
    }
  };

  fetchSSE();

  // Return abort function
  return () => abortController.abort();
}

/**
 * Get available tools from the server
 */
export async function getTools(): Promise<{ name: string; description: string }[]> {
  try {
    const response = await fetch(`${API_BASE}/api/tools`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.tools;
  } catch (error) {
    console.error('Failed to fetch tools:', error);
    return [];
  }
}

/**
 * Send a goal to the Planner agent via SSE
 */
export function sendPlannerMessage(
  goal: string,
  tools: string[],
  options: SSEClientOptions
): () => void {
  const abortController = new AbortController();

  const fetchSSE = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/planner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ goal, tools }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      let currentEvent = '';
      let currentData = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
          } else if (line.startsWith('data: ')) {
            currentData = line.slice(6);
            if (currentEvent && currentData) {
              try {
                const parsed = JSON.parse(currentData) as AgentEvent;

                if (currentEvent === 'planner_done') {
                  options.onDone?.(parsed.type === 'planner_done' ? parsed.response : '');
                } else {
                  options.onEvent(parsed);
                }
              } catch {
                console.error('Failed to parse SSE data:', currentData);
              }
              currentEvent = '';
              currentData = '';
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        const message = error instanceof Error ? error.message : 'Unknown error';
        options.onError?.(message);
      }
    }
  };

  fetchSSE();

  return () => abortController.abort();
}

/**
 * Send a requirement to the Coding agent via SSE
 * Backend will auto-load project files when projectId is provided
 */
export function sendCodingMessage(
  requirement: string,
  projectId: string | undefined,
  options: SSEClientOptions
): () => void {
  const abortController = new AbortController();

  const fetchSSE = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/coding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requirement, projectId }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let doneReceived = false;

      let currentEvent = '';
      let currentData = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
          } else if (line.startsWith('data: ')) {
            currentData = line.slice(6);
            if (currentEvent && currentData) {
              try {
                const parsed = JSON.parse(currentData);

                if (currentEvent === 'coding_done') {
                  options.onEvent(parsed as AgentEvent);
                  options.onDone?.(parsed.summary || '');
                  doneReceived = true;
                } else {
                  options.onEvent(parsed as AgentEvent);
                }
              } catch {
                console.error('Failed to parse SSE data:', currentData);
              }
              currentEvent = '';
              currentData = '';
            }
          }
        }
      }

      // Stream 结束后，如果没收到 coding_done 事件，也调用 onDone
      if (!doneReceived) {
        console.log('[SSE] Stream ended without coding_done event, calling onDone');
        options.onDone?.('');
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        const message = error instanceof Error ? error.message : 'Unknown error';
        options.onError?.(message);
      }
    }
  };

  fetchSSE();

  return () => abortController.abort();
}

// ============================================================================
// 项目管理 API
// ============================================================================

export interface ProjectInfo {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  path: string;
}

export interface ProjectDetail extends ProjectInfo {
  tree: unknown;
  conversation?: StoredMessage[];
}

/**
 * 存储的消息类型（与后端和 ChatItem 保持一致）
 */
export interface StoredMessage {
  id: string;
  type: 'user' | 'thought' | 'normal_message' | 'tool_call' | 'final_result' | 'error';
  content: string;
  timestamp: number;
  // 工具调用相关 (type === 'tool_call' 时使用)
  toolCallId?: string;
  toolName?: string;
  args?: Record<string, unknown>;
  result?: string;
  success?: boolean;
  duration?: number;
  // 流式状态
  isStreaming?: boolean;
  isComplete?: boolean;
}

/**
 * 获取项目列表
 */
export async function getProjects(): Promise<ProjectInfo[]> {
  try {
    const response = await fetch(`${API_BASE}/api/projects`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.projects || [];
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return [];
  }
}

/**
 * 获取项目详情（包含文件树）
 */
export async function getProject(projectId: string): Promise<ProjectDetail | null> {
  try {
    const response = await fetch(`${API_BASE}/api/projects/${projectId}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch project:', error);
    return null;
  }
}

/**
 * 持久化临时项目
 */
export async function persistProject(
  projectId: string,
  name?: string
): Promise<{ success: boolean; projectId?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/projects/${projectId}/persist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.error || 'Unknown error' };
    }
    const data = await response.json();
    return { success: true, projectId: data.projectId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * 删除项目
 */
export async function deleteProject(
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/projects/${projectId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.error || 'Unknown error' };
    }
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
