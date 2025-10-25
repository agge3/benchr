import Editor from '@monaco-editor/react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { useRef } from 'react';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
}

export const CodeEditor = ({ code, onChange }: CodeEditorProps) => {
  const editorRef = useRef(null);

  return (
    <Card className="h-full border-0 rounded-none shadow-none">
      <CardHeader className="border-b bg-gray-50 px-6 py-3">
        <CardTitle className="text-sm font-semibold">Code Editor</CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-[calc(100%-60px)]">
        <Editor
          ref={editorRef}
          height="100%"
          defaultLanguage="javascript"
          value={code}
          onChange={(value) => onChange(value || '')}
          theme="vs-light"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            padding: { top: 12 }
          }}
        />
      </CardContent>
    </Card>
  );
};
