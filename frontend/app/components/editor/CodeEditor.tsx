import { useRef } from 'react';
import Editor from '@monaco-editor/react';
import { ClientOnly } from '~/components/ui/ClientOnly';
import { ErrorBoundary } from '~/components/ui/ErrorBoundary';
import type { editor } from 'monaco-editor';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'cpp' | 'c' | 'python' | 'asm';
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

  const handleEditorMount = (editor: editor.IStandaloneCodeEditor, monaco: any) => {
    editorRef.current = editor;
    
    // Add save command
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave?.();
    });
    
    // Add find/replace
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
      editor.trigger('', 'actions.find', null);
    });
  };

  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center h-full bg-benchr-bg-main">
          <p className="text-sm font-medium text-benchr-status-error mb-2">
            Editor failed to load
          </p>
          <p className="text-xs text-benchr-text-muted mb-4">
            Monaco editor encountered an error
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 bg-benchr-gold hover:bg-benchr-gold-hover text-benchr-bg-main rounded text-sm"
          >
            Reload page
          </button>
        </div>
      }
    >
      <div className="h-full bg-benchr-bg-main pt-1">
        <ClientOnly
          fallback={
            <div className="flex items-center justify-center h-full text-benchr-text-light">
              Loading editor...
            </div>
          }
        >
          {() => (
            <Editor
              height="100%"
              language={language}
              value={value}
              theme={theme}
              onChange={(val) => onChange(val || '')}
              onMount={handleEditorMount}
              options={{
                readOnly,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          )}
        </ClientOnly>
      </div>
    </ErrorBoundary>
  );
};
