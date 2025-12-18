/**
 * useChat hook - manages chat state and SSE connection
 * 
 * Handles new event types: thought, tool_call, tool_call_result, final_result
 * Plus Coding-specific events: bdd_generated, architecture_generated, code_generated
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  ChatItem,
  AgentEvent,
  ToolInfo,
  BDDFeature,
  GeneratedFile,
  ArchitectureFile
} from '../types/events';
import { sendMessage, sendPlannerMessage, sendCodingMessage, getTools } from '../services/sseClient';

export function useChat() {
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tools, setTools] = useState<ToolInfo[]>([]);

  // Coding-specific state (for three-panel layout)
  const [bddFeatures, setBddFeatures] = useState<BDDFeature[]>([]);
  const [architectureFiles, setArchitectureFiles] = useState<ArchitectureFile[]>([]);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [codeSummary, setCodeSummary] = useState<string>('');

  const abortRef = useRef<(() => void) | null>(null);
  const streamingThoughtRef = useRef<Map<string, ChatItem>>(new Map());
  const toolCallMapRef = useRef<Map<string, ChatItem>>(new Map());

  // Fetch available tools on mount
  useEffect(() => {
    getTools().then(setTools);
  }, []);

  const handleEvent = useCallback((event: AgentEvent) => {
    switch (event.type) {
      // === 新版 thought 事件（流式） ===
      case 'thought': {
        const existing = streamingThoughtRef.current.get(event.thoughtId);
        if (existing) {
          // 累积内容
          existing.content += event.chunk;
          existing.isComplete = event.isComplete;
          existing.isStreaming = !event.isComplete;
          setMessages(prev =>
            prev.map(m => m.id === existing.id ? { ...existing } : m)
          );
        } else if (event.chunk) {
          // 新的 thought
          const newThought: ChatItem = {
            id: event.thoughtId,
            type: 'thought',
            content: event.chunk,
            isStreaming: !event.isComplete,
            isComplete: event.isComplete,
            timestamp: event.timestamp,
          };
          streamingThoughtRef.current.set(event.thoughtId, newThought);
          setMessages(prev => [...prev, newThought]);
        }
        break;
      }

      // === 普通消息事件（友好提示等） ===
      case 'normal_message': {
        const item: ChatItem = {
          id: event.messageId,
          type: 'normal_message',
          content: event.content,
          timestamp: event.timestamp,
        };
        setMessages(prev => [...prev, item]);
        break;
      }

      // === 新版 tool_call 事件 ===
      case 'tool_call': {
        const item: ChatItem = {
          id: `tool_${event.toolCallId}`,
          type: 'tool_call',
          content: event.toolName,
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          args: event.args,
          timestamp: event.timestamp,
        };
        toolCallMapRef.current.set(event.toolCallId, item);
        setMessages(prev => [...prev, item]);
        break;
      }

      // === 新版 tool_call_result 事件 ===
      case 'tool_call_result': {
        // 更新对应的 tool_call 消息
        const existingCall = toolCallMapRef.current.get(event.toolCallId);
        if (existingCall) {
          setMessages(prev => prev.map(m => {
            if (m.id === existingCall.id) {
              return {
                ...m,
                result: event.result,
                success: event.success,
                duration: event.duration,
              };
            }
            return m;
          }));
        }
        break;
      }

      // === 新版 final_result 事件 ===
      case 'final_result': {
        // 清理流式状态
        streamingThoughtRef.current.forEach(thought => {
          thought.isStreaming = false;
        });
        streamingThoughtRef.current.clear();
        toolCallMapRef.current.clear();

        const item: ChatItem = {
          id: `final_${Date.now()}`,
          type: 'final_result',
          content: event.content,
          timestamp: event.timestamp,
        };
        setMessages(prev => [...prev, item]);
        break;
      }

      // === 向后兼容: stream 事件 ===
      case 'stream': {
        const existing = streamingThoughtRef.current.get(event.thoughtId);
        if (existing) {
          existing.content += event.chunk;
          setMessages(prev =>
            prev.map(m => m.id === existing.id ? { ...existing } : m)
          );
        } else {
          const newThought: ChatItem = {
            id: event.thoughtId,
            type: 'thought',
            content: event.chunk,
            isStreaming: true,
            timestamp: Date.now(),
          };
          streamingThoughtRef.current.set(event.thoughtId, newThought);
          setMessages(prev => [...prev, newThought]);
        }
        break;
      }

      // === 向后兼容: action 事件 ===
      case 'action': {
        const item: ChatItem = {
          id: `tool_${Date.now()}`,
          type: 'tool_call',
          content: event.toolName,
          toolName: event.toolName,
          args: event.args,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, item]);
        break;
      }

      // === 向后兼容: observation 事件 ===
      case 'observation': {
        setMessages(prev => {
          const lastToolIndex = [...prev].reverse().findIndex(m => m.type === 'tool_call');
          if (lastToolIndex !== -1) {
            const index = prev.length - 1 - lastToolIndex;
            const updated = [...prev];
            updated[index] = { ...updated[index], result: event.content, success: true };
            return updated;
          }
          return prev;
        });
        break;
      }

      // === 向后兼容: final_answer 事件 ===
      case 'final_answer': {
        streamingThoughtRef.current.clear();
        const item: ChatItem = {
          id: `final_${Date.now()}`,
          type: 'final_result',
          content: event.content,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, item]);
        break;
      }

      case 'plan_update': {
        const planItem: ChatItem = {
          id: `plan_${Date.now()}`,
          type: 'plan',
          content: event.plan.goal,
          plan: event.plan,
          timestamp: event.timestamp || Date.now(),
        };
        setMessages(prev => {
          const existingPlanIndex = prev.findIndex(m => m.type === 'plan');
          if (existingPlanIndex !== -1) {
            const updated = [...prev];
            updated[existingPlanIndex] = planItem;
            return updated;
          }
          return [...prev, planItem];
        });
        break;
      }

      case 'error': {
        const item: ChatItem = {
          id: `error_${Date.now()}`,
          type: 'error',
          content: event.message,
          timestamp: event.timestamp || Date.now(),
        };
        setMessages(prev => [...prev, item]);
        break;
      }
    }
  }, []);

  // === CodingAgent 事件处理 ===
  const handleCodingEvent = useCallback((event: AgentEvent) => {
    const anyEvent = event as any;

    // 处理 bdd_generated 事件
    if (anyEvent.type === 'bdd_generated') {
      setBddFeatures(anyEvent.features);
      return;
    }

    // 处理 architecture_generated 事件
    if (anyEvent.type === 'architecture_generated') {
      setArchitectureFiles(anyEvent.files);
      return;
    }

    // 处理 code_generated 事件
    if (anyEvent.type === 'code_generated') {
      setGeneratedFiles(anyEvent.files);
      setCodeSummary(anyEvent.summary || '');
      return;
    }

    // 处理 phase_complete 事件（向后兼容）
    if (anyEvent.type === 'phase_complete') {
      if (anyEvent.phase === 'bdd' && anyEvent.data) {
        setBddFeatures(anyEvent.data);
      } else if (anyEvent.phase === 'architect' && anyEvent.data) {
        setArchitectureFiles(anyEvent.data);
      } else if (anyEvent.phase === 'codegen' && anyEvent.data) {
        setGeneratedFiles(anyEvent.data.files || []);
        setCodeSummary(anyEvent.data.summary || '');
      }
      return;
    }

    // 处理 plan_update 事件
    if (anyEvent.type === 'plan_update') {
      handleEvent(event);
      return;
    }

    // 其他事件走普通处理
    handleEvent(event);
  }, [handleEvent]);

  const send = useCallback((input: string) => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatItem = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: input,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    streamingThoughtRef.current.clear();
    toolCallMapRef.current.clear();

    const toolNames = tools.map(t => t.name);
    abortRef.current = sendMessage(input, toolNames, {
      onEvent: handleEvent,
      onDone: () => {
        setIsLoading(false);
        streamingThoughtRef.current.clear();
      },
      onError: (error) => {
        setIsLoading(false);
        const errorItem: ChatItem = {
          id: `error_${Date.now()}`,
          type: 'error',
          content: error,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorItem]);
      },
    });
  }, [isLoading, tools, handleEvent]);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setBddFeatures([]);
    setArchitectureFiles([]);
    setGeneratedFiles([]);
    setCodeSummary('');
    streamingThoughtRef.current.clear();
    toolCallMapRef.current.clear();
  }, []);

  const sendPlanner = useCallback((goal: string) => {
    if (!goal.trim() || isLoading) return;

    const userMessage: ChatItem = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: `🎯 目标: ${goal}`,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    streamingThoughtRef.current.clear();

    const toolNames = tools.map(t => t.name);
    abortRef.current = sendPlannerMessage(goal, toolNames, {
      onEvent: handleEvent,
      onDone: () => {
        setIsLoading(false);
        streamingThoughtRef.current.clear();
      },
      onError: (error) => {
        setIsLoading(false);
        const errorItem: ChatItem = {
          id: `error_${Date.now()}`,
          type: 'error',
          content: error,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorItem]);
      },
    });
  }, [isLoading, tools, handleEvent]);

  const sendCoding = useCallback((requirement: string) => {
    if (!requirement.trim() || isLoading) return;

    const userMessage: ChatItem = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: `💻 需求: ${requirement}`,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    streamingThoughtRef.current.clear();

    // 清空 Coding 专用状态
    setBddFeatures([]);
    setArchitectureFiles([]);
    setGeneratedFiles([]);
    setCodeSummary('');

    abortRef.current = sendCodingMessage(requirement, {
      onEvent: handleCodingEvent,
      onDone: () => {
        setIsLoading(false);
        streamingThoughtRef.current.clear();
      },
      onError: (error) => {
        setIsLoading(false);
        const errorItem: ChatItem = {
          id: `error_${Date.now()}`,
          type: 'error',
          content: error,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorItem]);
      },
    });
  }, [isLoading, handleCodingEvent]);

  return {
    messages,
    isLoading,
    tools,
    // Coding-specific state
    bddFeatures,
    architectureFiles,
    generatedFiles,
    codeSummary,
    // Actions
    send,
    sendPlanner,
    sendCoding,
    cancel,
    clear,
  };
}
