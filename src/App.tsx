import { useState, useCallback } from 'react';
import { ChatContainer } from './components/ChatContainer';
import { ChatInput } from './components/ChatInput';
import { CodingLayout } from './components/CodingLayout';
import { ProjectSelector } from './components/ProjectSelector';
import { useChat } from './hooks/useChat';
import { useTheme } from './hooks/useTheme';
import './App.css';

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

  const handleLoadProject = useCallback((tree: unknown, id: string, name: string) => {
    loadProject(tree, id, name);
    setMode('coding');
  }, [loadProject]);

  return (
    <div className={`app ${mode === 'coding' ? 'coding-mode' : ''}`}>
      <header className="app-header">
        <div className="header-left">
          <h1>Agent</h1>
          <div className="mode-toggle">
            <button 
              className={`mode-btn ${mode === 'react' ? 'active' : ''}`}
              onClick={() => setMode('react')}
            >
              推理模式
            </button>
            <button 
              className={`mode-btn ${mode === 'planner' ? 'active' : ''}`}
              onClick={() => setMode('planner')}
            >
              规划模式
            </button>
            <button 
              className={`mode-btn ${mode === 'coding' ? 'active' : ''}`}
              onClick={() => setMode('coding')}
            >
              编程模式
            </button>
          </div>
          <div className="project-selection">
            <ProjectSelector
              onSelectProject={handleLoadProject}
              currentProjectId={projectId}
            />
          </div>
        </div>
        <div className="header-right">
          <button 
            className="theme-toggle" 
            onClick={toggleTheme}
            title={theme === 'dark' ? '切换到亮色主题' : '切换到暗色主题'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {tools.length > 0 && (
            <div className="tools-badge">
              <span className="tools-icon">●</span>
              <span>{tools.length} 个工具</span>
            </div>
          )}
          {messages.length > 0 && (
            <button className="clear-button" onClick={clear}>
              清除
            </button>
          )}
        </div>
      </header>
      
      <main className="app-main">
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
        <footer className="app-footer">
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
