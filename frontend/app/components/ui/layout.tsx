import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Menu } from 'lucide-react';

export default function Home() {
  const [code, setCode] = useState('// Write your code here\nconsole.log("Hello, Benchr!");');

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Menu className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold">Benchr</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
              Run Benchmark
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Two Containers */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Container - Monaco Editor */}
        <div className="w-1/2 border-r border-border flex flex-col">
          <div className="px-4 py-2 border-b border-border bg-muted/50">
            <h2 className="text-sm font-medium text-foreground">Code Editor</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>
        </div>

        {/* Right Container - Empty for now */}
        <div className="w-1/2 flex flex-col">
          <div className="px-4 py-2 border-b border-border bg-muted/50">
            <h2 className="text-sm font-medium text-foreground">Results</h2>
          </div>
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">Results will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
}
