import React, { useRef, useEffect } from 'react';
import * as monaco from 'monaco-editor';

interface AssemblyViewerProps {
  assembly: string;
}

export const AssemblyViewer: React.FC<AssemblyViewerProps> = ({ assembly }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    editorRef.current = monaco.editor.create(containerRef.current, {
      value: assembly,
      language: 'asm',
      theme: 'vs-dark',
      readOnly: true,
      automaticLayout: true,
      minimap: { enabled: false },
      lineNumbers: 'on',
      scrollBeyondLastLine: false
    });

    return () => {
      editorRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setValue(assembly);
    }
  }, [assembly]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};
