/**
 * ChatPage - 推理模式 + 规划模式页面
 * 包含会话历史侧边栏
 */

import { useState, useCallback } from 'react';
import { ChatContainer } from '@/components/ChatContainer';
import { ChatInput } from '@/components/ChatInput';
import { ConversationSidebar } from '@/components/ConversationSidebar';
import { useChat } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ChatMode = 'react' | 'planner';

export function ChatPage() {
  const {
    messages,
    conversationId,
    plannerConversationId,
    isLoading,
    send,
    sendPlanner,
    cancel,
    clear,
    tools,
    loadReactConversation,
    loadPlannerConversation,
  } = useChat();

  const [mode, setMode] = useState<ChatMode>('react');

  const currentConversationId = mode === 'react' ? conversationId : plannerConversationId;

  const handleSend = (input: string) => {
    if (mode === 'planner') {
      sendPlanner(input);
    } else {
      send(input);
    }
  };

  const handleSelectConversation = useCallback(async (id: string) => {
    if (mode === 'react') {
      await loadReactConversation(id);
    } else {
      await loadPlannerConversation(id);
    }
  }, [mode, loadReactConversation, loadPlannerConversation]);

  const handleNewConversation = useCallback(() => {
    clear();
  }, [clear]);

  return (
    <div className="flex h-full">
      {/* 侧边栏 */}
      <ConversationSidebar
        mode={mode}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部工具栏 */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
          <Tabs value={mode} onValueChange={(v) => setMode(v as ChatMode)}>
            <TabsList>
              <TabsTrigger value="react">推理模式</TabsTrigger>
              <TabsTrigger value="planner">规划模式</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            {tools.length > 0 && (
              <Badge variant="secondary">
                {tools.length} 个工具
              </Badge>
            )}
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clear}>
                清除
              </Button>
            )}
          </div>
        </div>

        {/* 聊天区域 */}
        <div className="flex-1 overflow-hidden">
          <ChatContainer messages={messages} isLoading={isLoading} />
        </div>

        {/* 输入区域 */}
        <div className="p-4 border-t border-border bg-background">
          <div className="max-w-3xl mx-auto">
            <ChatInput
              onSend={handleSend}
              isLoading={isLoading}
              onCancel={cancel}
              placeholder={mode === 'planner' ? '输入你的目标...' : '输入你的问题...'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
