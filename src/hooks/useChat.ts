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
  ArchitectureFile,
} from '../types/events';
import {
  sendMessage,
  sendPlannerMessage,
  sendCodingMessage,
  getTools,
  getReactConversation,
  getPlannerConversation,
  type StoredMessage,
} from '../services/sseClient';

export function useChat() {
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tools, setTools] = useState<ToolInfo[]>([]);

  // 会话 ID（用于多轮对话）
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [plannerConversationId, setPlannerConversationId] = useState<string | undefined>(undefined);

  // Coding-specific state (for three-panel layout)
  const [bddFeatures, setBddFeatures] = useState<BDDFeature[]>([]);
  const [architectureFiles, setArchitectureFiles] = useState<ArchitectureFile[]>([]);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [generatedTree, setGeneratedTree] = useState<unknown>(null);
  const [codeSummary, setCodeSummary] = useState<string>('');
  const [projectId, setProjectId] = useState<string | undefined>(undefined);

  const abortRef = useRef<(() => void) | null>(null);
  const streamingThoughtRef = useRef<Map<string, ChatItem>>(new Map());
  const toolCallMapRef = useRef<Map<string, ChatItem>>(new Map());
  const streamingFinalAnswerRef = useRef<Map<string, ChatItem>>(new Map());

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

        // 如果已经有流式最终答案，只需标记完成并清理 ref，不再添加新消息
        if (streamingFinalAnswerRef.current.size > 0) {
          streamingFinalAnswerRef.current.forEach(answer => {
            answer.isStreaming = false;
            answer.isComplete = true;
          });
          setMessages(prev =>
            prev.map(m => {
              const streamingAnswer = streamingFinalAnswerRef.current.get(m.id);
              if (streamingAnswer) {
                return { ...streamingAnswer };
              }
              return m;
            })
          );
          streamingFinalAnswerRef.current.clear();
        } else {
          // 没有流式答案（直接给出的最终答案），创建新消息
          const item: ChatItem = {
            id: `final_${Date.now()}`,
            type: 'final_result',
            content: event.content,
            timestamp: event.timestamp,
          };
          setMessages(prev => [...prev, item]);
        }
        break;
      }

      // === 新版 final_answer_stream 事件（流式最终答案） ===
      case 'final_answer_stream': {
        const existing = streamingFinalAnswerRef.current.get(event.answerId);
        if (existing) {
          // 累积内容
          existing.content += event.chunk;
          existing.isComplete = event.isComplete;
          existing.isStreaming = !event.isComplete;
          setMessages(prev =>
            prev.map(m => m.id === existing.id ? { ...existing } : m)
          );
        } else if (event.chunk) {
          // 新的 final_answer 流
          const newFinalAnswer: ChatItem = {
            id: event.answerId,
            type: 'final_result',
            content: event.chunk,
            isStreaming: !event.isComplete,
            isComplete: event.isComplete,
            timestamp: event.timestamp,
          };
          streamingFinalAnswerRef.current.set(event.answerId, newFinalAnswer);
          setMessages(prev => [...prev, newFinalAnswer]);
        }
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
      if (anyEvent.tree) setGeneratedTree(anyEvent.tree);
      setCodeSummary(anyEvent.summary || '');
      if (anyEvent.projectId) setProjectId(anyEvent.projectId);
      return;
    }

    // 处理 coding_done 事件
    if (anyEvent.type === 'coding_done') {
      if (anyEvent.bddFeatures) setBddFeatures(anyEvent.bddFeatures);
      if (anyEvent.architecture) setArchitectureFiles(anyEvent.architecture);
      if (anyEvent.generatedFiles) setGeneratedFiles(anyEvent.generatedFiles);
      if (anyEvent.tree) setGeneratedTree(anyEvent.tree);
      if (anyEvent.summary) setCodeSummary(anyEvent.summary);
      if (anyEvent.projectId) setProjectId(anyEvent.projectId);
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
        if (anyEvent.data.tree) setGeneratedTree(anyEvent.data.tree);
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
    abortRef.current = sendMessage(input, toolNames, conversationId, {
      onEvent: handleEvent,
      onConversationId: (id) => {
        setConversationId(id);
      },
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
  }, [isLoading, tools, handleEvent, conversationId]);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setConversationId(undefined);
    setPlannerConversationId(undefined);
    setBddFeatures([]);
    setArchitectureFiles([]);
    setGeneratedFiles([]);
    setGeneratedTree(null);
    setCodeSummary('');
    streamingThoughtRef.current.clear();
    toolCallMapRef.current.clear();
    streamingFinalAnswerRef.current.clear();
  }, []);

  // 加载已保存的项目
  const loadProject = useCallback((tree: unknown, id: string, name: string, conversation?: StoredMessage[]) => {
    setGeneratedTree(tree);
    setProjectId(id);
    setCodeSummary(`已加载项目: ${name}`);
    // 清空 BDD 和架构（因为加载的是已保存项目）
    setBddFeatures([]);
    setArchitectureFiles([]);

    // 恢复对话历史
    if (conversation && conversation.length > 0) {
      const chatItems: ChatItem[] = conversation.map(msg => ({
        id: msg.id,
        type: msg.type as ChatItem['type'],
        content: msg.content,
        timestamp: msg.timestamp,
        // 工具调用相关字段
        toolCallId: msg.toolCallId,
        toolName: msg.toolName,
        args: msg.args,
        result: msg.result,
        success: msg.success,
        duration: msg.duration,
        // 流式状态
        isStreaming: msg.isStreaming,
        isComplete: msg.isComplete,
      }));
      setMessages(chatItems);
    } else {
      setMessages([]);
    }
  }, []);

  // 将存储的消息转换为 ChatItem，合并 tool_result 到 tool_call
  const convertStoredMessagesToChatItems = (messages: StoredMessage[]): ChatItem[] => {
    const chatItems: ChatItem[] = [];
    const toolResultMap = new Map<string, StoredMessage>();

    // 先收集所有 tool_result
    for (const msg of messages) {
      if (msg.type === 'tool_result' && msg.toolCallId) {
        toolResultMap.set(msg.toolCallId, msg);
      }
    }

    // 转换消息，合并 tool_result 到 tool_call
    for (const msg of messages) {
      // 跳过 tool_result，因为会合并到 tool_call
      if (msg.type === 'tool_result') continue;

      if (msg.type === 'tool_call' && msg.toolCallId) {
        const toolResult = toolResultMap.get(msg.toolCallId);
        chatItems.push({
          id: msg.id,
          type: 'tool_call',
          content: msg.content,
          timestamp: msg.timestamp,
          toolCallId: msg.toolCallId,
          toolName: msg.toolName,
          args: msg.args,
          // 合并 tool_result 的字段
          result: toolResult?.result,
          success: toolResult?.success,
          duration: toolResult?.duration,
          isStreaming: false,
          isComplete: true,
        });
      } else {
        chatItems.push({
          id: msg.id,
          type: msg.type as ChatItem['type'],
          content: msg.content,
          timestamp: msg.timestamp,
          toolCallId: msg.toolCallId,
          toolName: msg.toolName,
          args: msg.args,
          result: msg.result,
          success: msg.success,
          duration: msg.duration,
          isStreaming: msg.isStreaming,
          isComplete: msg.isComplete,
        });
      }
    }

    return chatItems;
  };

  // 加载推理模式会话
  const loadReactConversation = useCallback(async (id: string) => {
    const conversation = await getReactConversation(id);
    if (conversation) {
      setConversationId(id);
      const chatItems = convertStoredMessagesToChatItems(conversation.messages);
      setMessages(chatItems);
    }
  }, []);

  // 加载规划模式会话
  const loadPlannerConversation = useCallback(async (id: string) => {
    const data = await getPlannerConversation(id);
    if (data.conversation) {
      setPlannerConversationId(id);
      const chatItems = convertStoredMessagesToChatItems(data.conversation.messages);
      setMessages(chatItems);
    }
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
    abortRef.current = sendPlannerMessage(goal, toolNames, plannerConversationId, {
      onEvent: handleEvent,
      onConversationId: (id) => {
        setPlannerConversationId(id);
      },
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
  }, [isLoading, tools, handleEvent, plannerConversationId]);

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

    // 保留现有文件作为上下文，不进行清空
    // setGeneratedFiles([]); // Removed: Do not clear files to support multi-turn
    setBddFeatures([]);
    setArchitectureFiles([]);
    setGeneratedTree(null);
    setCodeSummary('');

    // Pass only projectId - backend will auto-load project files
    abortRef.current = sendCodingMessage(requirement, projectId, {
      onEvent: handleCodingEvent,
      onDone: () => {
        setIsLoading(false);
        streamingThoughtRef.current.clear();
      },
      onError: (error: string) => {
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
  }, [isLoading, handleCodingEvent, projectId]);

  return {
    messages,
    conversationId,
    plannerConversationId,
    isLoading,
    tools,
    // Coding-specific state
    bddFeatures,
    architectureFiles,
    generatedFiles,
    generatedTree,
    codeSummary,
    projectId,
    // Actions
    send,
    sendPlanner,
    sendCoding,
    cancel,
    clear,
    loadProject,
    loadReactConversation,
    loadPlannerConversation,
  };
}
