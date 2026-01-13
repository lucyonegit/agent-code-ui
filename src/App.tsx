import { useState, useCallback } from 'react';
import { ChatContainer } from './components/ChatContainer';
import { ChatInput } from './components/ChatInput';
import { CodingLayout } from './components/CodingLayout';
import { ProjectSelector } from './components/ProjectSelector';
import { useChat } from './hooks/useChat';
import { useTheme } from './hooks/useTheme';
import type { StoredMessage } from './services/sseClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Moon, Sun } from 'lucide-react';

type AgentMode = 'react' | 'planner' | 'coding';

function App() {
  const { 
    messages, 
    isLoading, 
    send, 
    sendPlanner, 
    sendCoding, 
    cancel, 
    clear, 
    tools,
    // Coding-specific state
    bddFeatures,
    generatedFiles,
    generatedTree,
    codeSummary,
    projectId,
    loadProject,
  } = useChat();
  const [mode, setMode] = useState<AgentMode>('react');
  const { theme, toggleTheme } = useTheme();

  const handleSend = (input: string) => {
    if (mode === 'planner') {
      sendPlanner(input);
    } else if (mode === 'coding') {
      sendCoding(input);
    } else {
      send(input);
    }
  };

  const handleLoadProject = useCallback((tree: unknown, id: string, name: string, conversation?: StoredMessage[]) => {
    loadProject(tree, id, name, conversation);
    setMode('coding');
  }, [loadProject]);

  return (
    <div className={/* `app ${mode === 'coding' ? 'coding-mode' : ''}` */ "flex flex-col h-screen bg-background"}>
      <header className="flex items-center justify-between px-6 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mr-8">Agent</h1>
          <div className="flex-1 flex justify-center">
            <Tabs value={mode} onValueChange={(v) => setMode(v as AgentMode)} className="w-[400px]">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="react">推理模式</TabsTrigger>
                <TabsTrigger value="planner">规划模式</TabsTrigger>
                <TabsTrigger value="coding">编程模式</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="ml-2 pl-5 border-l border-border">
            <ProjectSelector
              onSelectProject={handleLoadProject}
              currentProjectId={projectId}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={toggleTheme}
            title={theme === 'dark' ? '切换到亮色主题' : '切换到暗色主题'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          {tools.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {tools.length} 个工具
            </Badge>
          )}
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clear} className="ml-2">
              清除
            </Button>
          )}
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden w-full max-w-5xl mx-auto flex flex-col data-[mode=coding]:max-w-none" data-mode={mode}>
        {mode === 'coding' ? (
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
        ) : (
          <ChatContainer messages={messages} isLoading={isLoading} />
        )}
      </main>
      
      {mode !== 'coding' && (
        <footer className="w-full max-w-5xl mx-auto px-6 pb-6">
          <ChatInput 
            onSend={handleSend} 
            isLoading={isLoading} 
            onCancel={cancel}
          />
        </footer>
      )}
    </div>
  );
}

export default App;
