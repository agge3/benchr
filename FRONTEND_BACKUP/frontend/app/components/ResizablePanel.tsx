import React, { useRef, useState, useEffect, useCallback } from 'react';

interface ResizablePanelProps {
  children: React.ReactNode;
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
  position?: 'left' | 'right';
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  minWidth = 200,
  maxWidth = 800,
  defaultWidth = 400,
  position = 'left'
}) => {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);
  
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      
      if (panelRef.current) {
        const newWidth =
          position === 'left'
            ? e.clientX
            : window.innerWidth - e.clientX;
        
        if (newWidth >= minWidth && newWidth <= maxWidth) {
          setWidth(newWidth);
        }
      }
    },
    [isResizing, minWidth, maxWidth, position]
  );
  
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);
  
  useEffect(() => {
    if (isResizing) {
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
  }, [isResizing, handleMouseMove, handleMouseUp]);
  
  return (
    <div
      ref={panelRef}
      className={`relative h-full overflow-hidden ${isResizing ? 'select-none' : ''}`}
      style={{ width: `${width}px` }}
    >
      {children}
      <div
        className={`
          absolute top-0 h-full w-1 bg-benchr-border cursor-col-resize z-[1000] 
          transition-colors hover:bg-blue-500
          ${position === 'left' ? 'right-0' : 'left-0'}
        `}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
};
