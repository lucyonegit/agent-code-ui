/**
 * ProjectSelector - Project Selector Component
 * Displays a list of saved projects and allows selecting one for preview
 */

import { useState, useEffect } from 'react';
import { getProjects, getProject, deleteProject, type ProjectInfo, type StoredMessage } from '../services/sseClient';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Folder, ChevronDown, RefreshCw, Trash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectSelectorProps {
  onSelectProject: (tree: unknown, projectId: string, projectName: string, conversation?: StoredMessage[]) => void;
  currentProjectId?: string;
}

export function ProjectSelector({ onSelectProject, currentProjectId }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);

  // Load project list
  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const list = await getProjects();
      setProjects(list);
    } finally {
      setIsLoading(false);
    }
  };

  // Load projects when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  // Select project
  const handleSelectProject = async (project: ProjectInfo) => {
    setLoadingProjectId(project.id);
    try {
      const detail = await getProject(project.id);
      if (detail && detail.tree) {
        onSelectProject(detail.tree, project.id, project.name, detail.conversation);
        setIsOpen(false);
      }
    } finally {
      setLoadingProjectId(null);
    }
  };

  // Delete project
  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个项目吗？')) return;

    const result = await deleteProject(projectId);
    if (result.success) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="w-[140px] justify-between h-9 text-xs"
          title="选择已保存的项目"
        >
          <div className="flex items-center gap-2 truncate">
            <Folder className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">
              {currentProjectId ? projects.find(p => p.id === currentProjectId)?.name || '项目' : '选择项目'}
            </span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 opacity-50 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-[300px]">
        <div className="flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          <span>已保存的项目</span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={(e) => {
              e.preventDefault();
              loadProjects();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>
        </div>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-[300px]">
          {isLoading && projects.length === 0 ? (
             <div className="p-4 text-center text-xs text-muted-foreground">加载中...</div>
          ) : projects.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">暂无保存的项目</div>
          ) : (
            <div className="p-1 space-y-1">
              {projects.map(project => (
                <div
                  key={project.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-sm text-sm cursor-pointer group",
                    project.id === currentProjectId && "bg-primary text-primary-foreground",
                    project.id !== currentProjectId && "hover:bg-accent/30 hover:text-foreground",
                    loadingProjectId === project.id && "opacity-70 pointer-events-none"
                  )}
                  onClick={() => handleSelectProject(project)}
                >
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className="font-medium truncate">{project.name}</span>
                    <span className={cn(
                      "text-[10px] text-muted-foreground flex items-center gap-1",
                      project.id === currentProjectId && "text-primary-foreground",
                    )}>
                      <Clock className="h-3 w-3" />
                      {formatDate(project.updatedAt)}
                    </span>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                    onClick={(e) => handleDeleteProject(e, project.id)}
                    title="删除项目"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
