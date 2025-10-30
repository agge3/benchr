import React, { useRef, useState, useCallback, useEffect } from 'react';
import './SplitPane.css';

interface SplitPaneProps {
  children: [React.ReactNode, React.ReactNode];
  direction?: 'horizontal' | 'vertical';
  defaultSplit?: number;
  minSize?: number;
}

export const SplitPane: React.FC<SplitPaneProps> = ({
  children,
  direction = 'horizontal',
  defaultSplit = 50,
  minSize = 100
}) => {
  const [split, setSplit] = useState(defaultSplit);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();

      let newSplit;
      if (direction === 'horizontal') {
        newSplit = ((e.clientX - rect.left) / rect.width) * 100;
      } else {
        newSplit = ((e.clientY - rect.top) / rect.height) * 100;
      }

      const minPercent = (minSize / (direction === 'horizontal' ? rect.width : rect.height)) * 100;
      newSplit = Math.max(minPercent, Math.min(100 - minPercent, newSplit));

      setSplit(newSplit);
    },
    [isDragging, direction, minSize]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp, direction]);

  return (
    <div ref={containerRef} className={`split-pane ${direction}`}>
      <div
        className="pane pane-1"
        style={{
          [direction === 'horizontal' ? 'width' : 'height']: `${split}%`
        }}
      >
        {children[0]}
      </div>
      <div
        className={`divider ${direction}`}
        onMouseDown={handleMouseDown}
      />
      <div
        className="pane pane-2"
        style={{
          [direction === 'horizontal' ? 'width' : 'height']: `${100 - split}%`
        }}
      >
        {children[1]}
      </div>
    </div>
  );
};
