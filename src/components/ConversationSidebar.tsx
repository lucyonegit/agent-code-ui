/**
 * 会话历史侧边栏组件
 */

import { useState, useEffect } from 'react';
import { Plus, Trash2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  getReactConversations, 
  getPlannerConversations,
  deleteReactConversation,
  deletePlannerConversation,
  type ConversationListItem,
} from '@/services/sseClient';

interface ConversationSidebarProps {
  mode: 'react' | 'planner';
  currentConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
}

export function ConversationSidebar({
  mode,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 加载会话列表
  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const list = mode === 'react' 
        ? await getReactConversations()
        : await getPlannerConversations();
      setConversations(list);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [mode]);

  // 删除会话
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirm = window.confirm('确定要删除这个会话吗？');
    if (!confirm) return;

    const result = mode === 'react'
      ? await deleteReactConversation(id)
      : await deletePlannerConversation(id);
    
    if (result.success) {
      setConversations(prev => prev.filter(c => c.conversationId !== id));
      if (currentConversationId === id) {
        onNewConversation();
      }
    }
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-64 h-full flex flex-col bg-muted/30 border-r border-border">
      {/* 新建会话按钮 */}
      <div className="p-3 border-b border-border">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2"
          onClick={onNewConversation}
        >
          <Plus className="h-4 w-4" />
          新建会话
        </Button>
      </div>

      {/* 会话列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-4 text-sm">
              加载中...
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              暂无会话记录
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.conversationId}
                className={cn(
                  "group relative p-3 rounded-lg cursor-pointer transition-all",
                  "hover:bg-muted",
                  currentConversationId === conv.conversationId 
                    ? "bg-primary/10 border-l-2 border-primary" 
                    : "border-l-2 border-transparent"
                )}
                onClick={() => onSelectConversation(conv.conversationId)}
              >
                <div className="pr-6">
                  <div className={cn(
                    "text-sm font-medium truncate",
                    currentConversationId === conv.conversationId && "text-primary"
                  )}>
                    {conv.lastUserInput || '新会话'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatTime(conv.updatedAt)} · {conv.totalTurns}轮对话
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDelete(e, conv.conversationId)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* 刷新按钮 */}
      <div className="p-2 border-t border-border">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full text-xs text-muted-foreground"
          onClick={loadConversations}
          disabled={isLoading}
        >
          刷新列表
        </Button>
      </div>
    </div>
  );
}
