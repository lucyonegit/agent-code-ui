/**
 * App - 路由配置
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChatPage, CodePage } from './pages';
import { useTheme } from './hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Moon, Sun, MessageSquare, Code2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const isChat = location.pathname === '/chat';
  const isCode = location.pathname === '/code';

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-2 bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <Link to="/chat" className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center p-1.5">
              <Code2 className="text-primary w-full h-full" />
            </div>
            <span>Agent</span>
          </Link>
          <nav className="flex items-center gap-1 ml-4 bg-muted/30 p-1 rounded-lg border border-border/50">
            <Link 
              to="/chat" 
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                isChat 
                  ? 'bg-card text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <MessageSquare className={`w-4 h-4 ${isChat ? 'text-primary' : ''}`} />
              聊天
            </Link>
            <Link 
              to="/code" 
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                isCode 
                  ? 'bg-card text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Code2 className={`w-4 h-4 ${isCode ? 'text-primary' : ''}`} />
              编程
            </Link>
          </nav>
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
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route 
          path="/chat" 
          element={
            <AppLayout>
              <ChatPage />
            </AppLayout>
          } 
        />
        <Route 
          path="/code" 
          element={
            <AppLayout>
              <CodePage />
            </AppLayout>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
