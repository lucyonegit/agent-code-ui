/**
 * Event types from base-agent SSE server
 */

// ============================================================================
// 基础事件类型（新版）
// ============================================================================

/**
 * 思考流式事件
 */
export interface ThoughtEvent {
  type: 'thought';
  thoughtId: string;
  chunk: string;
  isComplete: boolean;
  timestamp: number;
}

/**
 * 工具调用事件
 */
export interface ToolCallEvent {
  type: 'tool_call';
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  timestamp: number;
}

/**
 * 工具调用结果事件
 */
export interface ToolCallResultEvent {
  type: 'tool_call_result';
  toolCallId: string;
  toolName: string;
  result: string;
  success: boolean;
  duration: number;
  timestamp: number;
}

/**
 * 最终结果事件
 */
export interface FinalResultEvent {
  type: 'final_result';
  content: string;
  totalDuration: number;
  iterationCount: number;
  timestamp: number;
}

/**
 * 错误事件
 */
export interface ErrorEvent {
  type: 'error';
  message: string;
  timestamp?: number;
  details?: unknown;
}

/**
 * 普通消息事件（用于友好提示等普通对话消息）
 */
export interface NormalMessageEvent {
  type: 'normal_message';
  messageId: string;
  content: string;
  timestamp: number;
}

// ============================================================================
// 向后兼容事件（旧版，逐步废弃）
// ============================================================================

/** @deprecated 使用 ThoughtEvent */
export interface StreamEvent {
  type: 'stream';
  thoughtId: string;
  chunk: string;
  isThought: boolean;
}

/** @deprecated 使用 ToolCallEvent */
export interface ActionEvent {
  type: 'action';
  toolName: string;
  args: Record<string, unknown>;
}

/** @deprecated 使用 ToolCallResultEvent */
export interface ObservationEvent {
  type: 'observation';
  content: string;
}

/** @deprecated 使用 FinalResultEvent */
export interface FinalAnswerEvent {
  type: 'final_answer';
  content: string;
}

export interface DoneEvent {
  type: 'done';
  result: string;
}

// ============================================================================
// Planner 事件类型
// ============================================================================

export interface PlanStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'done' | 'failed' | 'skipped';
  requiredTools?: string[];
  result?: string;
}

export interface Plan {
  goal: string;
  steps: PlanStep[];
  reasoning: string;
}

export interface PlanUpdateEvent {
  type: 'plan_update';
  plan: Plan;
  timestamp?: number;
}

export interface PlannerDoneEvent {
  type: 'planner_done';
  success: boolean;
  response: string;
  plan: Plan;
}

export interface StepStartEvent {
  type: 'step_start';
  stepId: string;
  description: string;
  timestamp: number;
}

export interface StepCompleteEvent {
  type: 'step_complete';
  stepId: string;
  result: string;
  success: boolean;
  duration: number;
  timestamp: number;
}

// ============================================================================
// 统一消息格式（用于多轮对话历史同步）
// ============================================================================

/**
 * 工具调用结构
 */
export interface UnifiedToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

/**
 * 统一消息格式 - 前后端共用
 */
export interface UnifiedMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  timestamp: number;
  content?: string;
  toolCalls?: UnifiedToolCall[];
  toolCallId?: string;
  toolName?: string;
  toolResult?: unknown;
  success?: boolean;
}



// ============================================================================
// Agent 事件联合类型
// ============================================================================

export type AgentEvent =
  // 新版事件
  | ThoughtEvent
  | ToolCallEvent
  | ToolCallResultEvent
  | FinalResultEvent
  | ErrorEvent
  | NormalMessageEvent
  | StepStartEvent
  | StepCompleteEvent
  // 向后兼容
  | StreamEvent
  | ActionEvent
  | ObservationEvent
  | FinalAnswerEvent
  | DoneEvent
  | PlanUpdateEvent
  | PlannerDoneEvent;

// ============================================================================
// UI 消息类型
// ============================================================================

export type MessageType = 'user' | 'thought' | 'normal_message' | 'tool_call' | 'final_result' | 'error' | 'plan' | 'bdd' | 'architecture' | 'codegen';

export interface ChatItem {
  id: string;
  type: MessageType;
  content: string;
  // 工具调用相关
  toolCallId?: string;
  toolName?: string;
  args?: Record<string, unknown>;
  result?: string;
  success?: boolean;
  duration?: number;
  // 流式状态
  isStreaming?: boolean;
  isComplete?: boolean;
  timestamp: number;
  // Plan 相关
  plan?: Plan;
  // Coding 相关
  bddFeatures?: BDDFeature[];
  architectureFiles?: ArchitectureFile[];
  generatedFiles?: GeneratedFile[];
  summary?: string;
}

export interface ToolInfo {
  name: string;
  description: string;
}

// ============================================================================
// CodingAgent 事件类型
// ============================================================================

export interface BDDScenario {
  id: string;
  title: string;
  given: string[];
  when: string[];
  then: string[];
}

export interface BDDFeature {
  feature_id: string;
  feature_title: string;
  description: string;
  scenarios: BDDScenario[];
}

export interface ArchitectureFile {
  path: string;
  type: 'component' | 'service' | 'config' | 'util' | 'test' | 'route';
  description: string;
  bdd_references: string[];
  status: string;
  dependencies: Array<{ path: string; import: string[] }>;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface PhaseStartEvent {
  type: 'phase_start';
  phase: 'bdd' | 'architect' | 'codegen';
  message: string;
  timestamp: number;
}

export interface PhaseCompleteEvent {
  type: 'phase_complete';
  phase: 'bdd' | 'architect' | 'codegen';
  data: unknown;
  timestamp: number;
}

// 新版 Coding 事件
export interface BDDGeneratedEvent {
  type: 'bdd_generated';
  features: BDDFeature[];
  timestamp: number;
}

export interface ArchitectureGeneratedEvent {
  type: 'architecture_generated';
  files: ArchitectureFile[];
  timestamp: number;
}

export interface CodeGeneratedEvent {
  type: 'code_generated';
  files: GeneratedFile[];
  tree?: any;
  summary: string;
  projectId?: string;
  timestamp: number;
}

export interface CodingDoneEvent {
  type: 'coding_done';
  success: boolean;
  bddFeatures?: BDDFeature[];
  architecture?: ArchitectureFile[];
  generatedFiles?: GeneratedFile[];
  tree?: any;
  summary?: string;
  projectId?: string;
  error?: string;
}

export type CodingEvent =
  | PhaseStartEvent
  | PhaseCompleteEvent
  | BDDGeneratedEvent
  | ArchitectureGeneratedEvent
  | CodeGeneratedEvent
  | CodingDoneEvent
  | ThoughtEvent
  | NormalMessageEvent
  | ToolCallEvent
  | ToolCallResultEvent
  | ErrorEvent;
