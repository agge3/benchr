import React, { useRef, useEffect, useState } from 'react';
import * as monaco from 'monaco-editor';
import { editor } from 'monaco-editor';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'cpp' | 'c' | 'python';
  theme?: string;
  readOnly?: boolean;
  onSave?: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language,
  theme = 'vs-dark',
  readOnly = false,
  onSave
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [diagnostics, setDiagnostics] = useState<monaco.editor.IMarker[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Configure Monaco Editor
    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);

    // Create editor instance
    const editorInstance = monaco.editor.create(containerRef.current, {
      value,
      language,
      theme,
      readOnly,
      automaticLayout: true,
      minimap: {
        enabled: true,
        side: 'right'
      },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      bracketPairColorization: {
        enabled: true
      },
      guides: {
        bracketPairs: true,
        indentation: true
      },
      suggest: {
        snippetsPreventQuickSuggestions: false
      },
      quickSuggestions: true,
      folding: true,
      foldingStrategy: 'indentation',
      showFoldingControls: 'always',
      wordWrap: 'on',
      formatOnPaste: true,
      formatOnType: true,
    });

    editorRef.current = editorInstance;

    // Add save command
    editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave?.();
    });

    // Add find/replace
    editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
      editorInstance.trigger('', 'actions.find', null);
    });

    // Listen for content changes
    editorInstance.onDidChangeModelContent(() => {
      onChange(editorInstance.getValue());
    });

    // Listen for cursor position changes
    editorInstance.onDidChangeCursorPosition((e) => {
      // Update status bar or other UI elements
      console.log('Line:', e.position.lineNumber, 'Column:', e.position.column);
    });

    // Setup markers listener for diagnostics
    const markersListener = monaco.editor.onDidChangeMarkers((uris) => {
      const model = editorInstance.getModel();
      if (model) {
        const markers = monaco.editor.getModelMarkers({ resource: model.uri });
        setDiagnostics(markers);
      }
    });

    return () => {
      markersListener.dispose();
      editorInstance.dispose();
    };
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model && value !== editorRef.current.getValue()) {
        editorRef.current.setValue(value);
      }
    }
  }, [value]);

  useEffect(() => {
    if (editorRef.current) {
      monaco.editor.setModelLanguage(editorRef.current.getModel()!, language);
    }
  }, [language]);

  return (
    <div className="flex flex-col h-full w-full relative">
      <div ref={containerRef} className="flex-1 min-h-0" />
      {diagnostics.length > 0 && (
        <div className="max-h-[150px] overflow-y-auto bg-benchr-bg-main border-t border-benchr-border p-2">
          {diagnostics.map((marker, idx) => (
            <div 
              key={idx} 
              className={`
                p-1 px-2 mb-1 rounded text-xs font-mono
                ${marker.severity === 8 
                  ? 'bg-red-500/10 border-l-[3px] border-red-500' 
                  : 'bg-yellow-500/10 border-l-[3px] border-yellow-500'
                }
              `}
            >
              <span className="text-blue-400 mr-2">Line {marker.startLineNumber}:</span>
              <span className="text-gray-300">{marker.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
