import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ResizeHandleProps {
  onResize: (deltaX: number) => void;
  className?: string;
}

export function ResizeHandle({ onResize, className }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startXRef.current;
    startXRef.current = e.clientX;
    onResize(deltaX);
  }, [isDragging, onResize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div 
      className={cn(
        "w-2 flex items-center justify-center cursor-col-resize hover:bg-primary/20 transition-all group relative z-50",
        isDragging && "bg-primary/30",
        className
      )}
      onMouseDown={handleMouseDown}
    >
      <div className={cn(
        "h-12 w-1 rounded-full bg-border group-hover:bg-primary transition-all duration-300",
        isDragging && "bg-primary scale-x-125"
      )} />
      
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 blur-md -z-10 transition-all" />
    </div>
  );
}
