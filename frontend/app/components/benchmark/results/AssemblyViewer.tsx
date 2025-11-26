import React from 'react';
import Editor from '@monaco-editor/react';
import { ClientOnly } from '~/components/ui/ClientOnly';

interface AssemblyViewerProps {
  assembly: string;
}

export const AssemblyViewer: React.FC<AssemblyViewerProps> = ({ assembly }) => {
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
          theme="vs-dark"
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
