/**
 * CodePage - 编程模式页面
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CodingLayout } from '@/components/CodingLayout';
import { ProjectSelector } from '@/components/ProjectSelector';
import { useChat } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import type { StoredMessage } from '@/services/sseClient';

export function CodePage() {
  const navigate = useNavigate();
  const {
    messages,
    isLoading,
    sendCoding,
    cancel,
    clear,
    tools,
    bddFeatures,
    generatedFiles,
    generatedTree,
    codeSummary,
    projectId,
    loadProject,
  } = useChat();

  const handleSend = (input: string) => {
    sendCoding(input);
  };

  const handleLoadProject = useCallback((tree: unknown, id: string, name: string, conversation?: StoredMessage[]) => {
    loadProject(tree, id, name, conversation);
  }, [loadProject]);

  return (
    <div className="flex flex-col h-full">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/chat')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            返回聊天
          </Button>
          <ProjectSelector
            onSelectProject={handleLoadProject}
            currentProjectId={projectId}
          />
        </div>

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

      {/* 编程布局 */}
      <div className="flex-1 overflow-hidden">
        <CodingLayout
          messages={messages}
          isLoading={isLoading}
          bddFeatures={bddFeatures}
          generatedFiles={generatedFiles}
          generatedTree={generatedTree}
          codeSummary={codeSummary}
          onSend={handleSend}
          onCancel={cancel}
        />
      </div>
    </div>
  );
}
