/**
 * SSE Client for connecting to base-agent server
 */

import type { AgentEvent } from '../types/events';

const API_BASE = 'http://localhost:3001';

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
        body: JSON.stringify({ input, tools }),
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        let currentData = '';

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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        let currentData = '';

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
 */
export function sendCodingMessage(
  requirement: string,
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
        body: JSON.stringify({ requirement }),
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        let currentData = '';

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

