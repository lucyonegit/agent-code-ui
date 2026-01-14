/**
 * App - 路由配置
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChatPage, CodePage } from './pages';
import { useTheme } from './hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';

function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-6">
          <a href="/chat" className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Agent
          </a>
          <nav className="flex items-center gap-2 ml-8">
            <a 
              href="/chat" 
              className="px-3 py-1.5 text-sm rounded-md hover:bg-accent/50 transition-colors"
            >
              💬 聊天
            </a>
            <a 
              href="/code" 
              className="px-3 py-1.5 text-sm rounded-md hover:bg-accent/50 transition-colors"
            >
              💻 编程
            </a>
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
