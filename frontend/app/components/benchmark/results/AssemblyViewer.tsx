import React from 'react';
import Editor from '@monaco-editor/react';
import { ClientOnly } from '~/components/ui/ClientOnly';
import { defineAndSetBenchrTheme, BENCHR_THEME_NAME } from '~/constants/monacoTheme';
import type { editor } from 'monaco-editor';

interface AssemblyViewerProps {
  assembly: string;
}

export const AssemblyViewer: React.FC<AssemblyViewerProps> = ({ assembly }) => {
  const handleEditorMount = (editor: editor.IStandaloneCodeEditor, monaco: any) => {
    defineAndSetBenchrTheme(monaco);
  };

  return (
    <ClientOnly
      fallback={
        <div className="flex items-center justify-center h-full text-benchr-text-light">
          Loading assembly...
        </div>
      }
    >
      {() => (
        <Editor
          height="100%"
          language="asm"
          value={assembly}
          theme={BENCHR_THEME_NAME}
          onMount={handleEditorMount}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      )}
    </ClientOnly>
  );
};
