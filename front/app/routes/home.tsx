import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Menu, Play } from 'lucide-react';
import { ClientOnly } from '~/components/ClientOnly';

type Language = 'cpp' | 'python';

export default function Home() {
  const [code, setCode] = useState('# Write your Python code here\nprint("Hello, Benchr!")');
  const [language, setLanguage] = useState<Language>('python');

  const defaultCode: Record<Language, string> = {
    python: '# Write your Python code here\nprint("Hello, Benchr!")',
    cpp: '// Write your C++ code here\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, Benchr!" << std::endl;\n    return 0;\n}'
  };

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    setCode(defaultCode[newLang]);
  };

  const handleRunBenchmark = () => {
    const payload = {
      code: code,
      language: language
    };
    console.log('Benchmark payload:', payload);
    // Future: Send to backend
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Menu className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold">Benchr</h1>
          </div>
          
          {/* Language Selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-muted rounded-md p-1">
              <button
                onClick={() => handleLanguageChange('python')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  language === 'python'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Python
              </button>
              <button
                onClick={() => handleLanguageChange('cpp')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  language === 'cpp'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                C++
              </button>
            </div>
            
            <button 
              onClick={handleRunBenchmark}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Play className="h-4 w-4" />
              Run Benchmark
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Container - Monaco Editor */}
        <div className="w-1/2 border-r border-border flex flex-col">
          <div className="px-4 py-2 border-b border-border bg-muted/50">
            <h2 className="text-sm font-medium text-foreground">Code Editor</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <ClientOnly
              fallback={
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Loading editor...
                </div>
              }
            >
              {() => (
                <Editor
                  height="100%"
                  language={language}
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
              )}
            </ClientOnly>
          </div>
        </div>

        {/* Right Container */}
        <div className="w-1/2 flex flex-col">
          <div className="px-4 py-2 border-b border-border bg-muted/50">
            <h2 className="text-sm font-medium text-foreground">Results</h2>
          </div>
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">Results will appear here</p>
          </div>
        </div>
      </div>

      {/* Footer Bar */}
      <footer className="border-t border-border bg-card px-4 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Ready</span>
        </div>
      </footer>
    </div>
  );
}
