import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Loader2 } from 'lucide-react';
import { ClientOnly } from '~/components/ClientOnly';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import benchmarkService from '~/services/api';
import type { BenchmarkPayload, JobData } from '~/services/api';

type Language = 'cpp' | 'python' | 'assembly';

interface EditorConfig {
  code: string;
  language: Language;
  compiler: string;
  opts: string;
}

interface LanguageConfig {
  defaultCode: string;
  compiler: string;
  opts: string;
}

interface PanelCardProps {
  title: string;
  children: React.ReactNode;
}

interface LanguageOption {
  id: Language;
  label: string;
}

const LANGUAGE_CONFIGS: Record<Language, LanguageConfig> = {
  python: {
    defaultCode: '# Write your Python code here\nprint("Hello, Benchr!")',
    compiler: 'python3',
    opts: ''
  },
  cpp: {
    defaultCode: '// Write your C++ code here\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, Benchr!" << std::endl;\n    return 0;\n}',
    compiler: 'g++',
    opts: '-O2 -std=c++17'
  },
  assembly: {
    defaultCode: '; Write your Assembly code here\nsection .data\n    msg db "Hello, Benchr!", 0xa\n    len equ $ - msg\n\nsection .text\n    global _start\n\n_start:\n    mov rax, 1\n    mov rdi, 1\n    mov rsi, msg\n    mov rdx, len\n    syscall\n    \n    mov rax, 60\n    xor rdi, rdi\n    syscall',
    compiler: 'nasm',
    opts: '-f elf64'
  }
};

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { id: 'python', label: 'Python' },
  { id: 'cpp', label: 'C++' },
  { id: 'assembly', label: 'Assembly' }
];

/**
 * Custom hook to manage editor state and handlers
 * Encapsulates all editor-related logic
 */
function useEditor() {
  const [editor, setEditor] = useState<EditorConfig>({
    code: LANGUAGE_CONFIGS.python.defaultCode,
    language: 'python',
    compiler: LANGUAGE_CONFIGS.python.compiler,
    opts: LANGUAGE_CONFIGS.python.opts
  });

  const handleLanguageChange = (newLang: Language) => {
    const config = LANGUAGE_CONFIGS[newLang];
    setEditor({
      code: config.defaultCode,
      language: newLang,
      compiler: config.compiler,
      opts: config.opts
    });
  };

  const handleCodeChange = (code: string) => {
    setEditor(prev => ({ ...prev, code }));
  };

  return {
    editor,
    handleLanguageChange,
    handleCodeChange
  };
}

/**
 * Custom hook to handle benchmark operations with polling
 */
function useBenchmark(editorConfig: EditorConfig) {
  const [loading, setLoading] = useState(false);
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [pollAttempts, setPollAttempts] = useState(0);
  const [cancelledRef, setCancelledRef] = useState({ current: false });

  const pollForResults = async (jobId: string, maxAttempts = 30) => {
    let attempts = 0;

    const poll = async (): Promise<JobData | null> => {
      // Check if user cancelled - stop immediately
      if (cancelledRef.current) {
        return null;
      }

      attempts++;
      setPollAttempts(attempts);

      try {
        // Poll the specific job by ID
        const job = await benchmarkService.getJobById(jobId);

        // Check again after async call
        if (cancelledRef.current) {
          return null;
        }

        if (!job) {
          // Job not found yet - keep polling
          console.log(`Polling ${attempts}/${maxAttempts} - Job not found yet, retrying...`);

          if (attempts >= maxAttempts) {
            throw new Error('Polling timeout - job took too long');
          }

          await new Promise(resolve => setTimeout(resolve, 2000));
          return poll();
        }

	if (job) {
	  console.log("ts sucks")
	  console.log(JSON.stringify(job.result))
	}

        if (job.status === 'completed' && job.perf) {
          console.log('Job completed with metrics:', job.perf);
          return job;
        }

        if (job.status === 'failed') {
          throw new Error('Job failed to execute');
        }

        // Still processing - poll again
        if (attempts >= maxAttempts) {
          throw new Error('Polling timeout - job took too long');
        }

        console.log(`Polling ${attempts}/${maxAttempts} - Status: ${job.status}`);

        // Wait 2 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 2000));
        return poll(); // Recursive poll

      } catch (err) {
        // Check if cancelled
        if (cancelledRef.current) {
          return null;
        }

        // If it's an axios error (network/500 error), keep polling
        if (attempts < maxAttempts) {
          console.log(`Polling ${attempts}/${maxAttempts} - Error occurred, retrying...`, err);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return poll(); // Keep polling even on errors
        }

        // Only throw if we've exhausted all attempts
        throw new Error('Polling failed after maximum attempts');
      }
    };

    return poll();
  };

  const handleRunBenchmark = async () => {
    setLoading(true);
    setError(null);
    setCancelled(false);
    setJobData(null);
    setPollAttempts(0);
    setCancelledRef({ current: false });

    try {
      // Step 1: Submit the job
      const payload: BenchmarkPayload = {
        code: editorConfig.code,
        lang: editorConfig.language,
        compiler: editorConfig.compiler,
        opts: editorConfig.opts
      };

      const result = await benchmarkService.submitJob(payload);
      console.log('Job submitted:', result.job_id);

      // Step 2: Poll for results
      const completedJob = await pollForResults(result.job_id);

      // Only set job data if not cancelled and job exists
      if (completedJob && !cancelledRef.current) {
        setJobData(completedJob);
      } else if (cancelledRef.current) {
        // User cancelled - show cancelled state
        setCancelled(true);
      }

    } catch (err) {
      // Only show error if not cancelled
      if (!cancelledRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to run benchmark';
        console.error('Benchmark error:', errorMessage);
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
      setPollAttempts(0);
    }
  };

  const handleCancel = () => {
    console.log('User cancelled benchmark');
    setCancelledRef({ current: true });
    setLoading(false);
    setCancelled(true);
    setPollAttempts(0);
  };

  return {
    handleRunBenchmark,
    handleCancel,
    loading,
    jobData,
    error,
    cancelled,
    pollAttempts
  };
}

function PanelCard({ title, children }: PanelCardProps) {
  return (
    <Card className="h-full rounded-none border-0 border-b">
      <CardHeader className="px-4 py-2 border-b bg-muted/50">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-[calc(100%-3rem)] overflow-hidden">
        {children}
      </CardContent>
    </Card>
  );
}

interface LanguageSelectorProps {
  languages: LanguageOption[];
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

function LanguageSelector({ languages, currentLanguage, onLanguageChange }: LanguageSelectorProps) {
  return (
    <ToggleGroup type="single" value={currentLanguage} onValueChange={(value) => value && onLanguageChange(value as Language)}>
      {languages.map(({ id, label }) => (
        <ToggleGroupItem
          key={id}
          value={id}
          aria-label={`Select ${label}`}
          className="data-[state=on]:bg-[#3a3d41] data-[state=on]:text-[#d4a04c] data-[state=off]:text-gray-500 hover:bg-[#2d2d30] shadow-md !text-xs sm:!text-sm px-2 sm:px-3"
        >
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

interface HeaderProps {
  onRunBenchmark: () => void;
  loading: boolean;
}

function Header({ onRunBenchmark, loading }: HeaderProps) {
  return (
    <header className="border-b border-gray-700 bg-[#252526] shadow-lg">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex-1"></div>

        <h1 className="text-xl font-semibold text-[#f9d262]">benchr</h1>

        <div className="flex-1 flex items-center justify-end gap-3">
          <Button
            onClick={onRunBenchmark}
            disabled={loading}
            className="bg-[#d4a04c] hover:bg-[#e0b05f] text-[#1e1e1e] border-0 shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Benchmark
              </>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-700 bg-[#252526] px-4 py-2">
      <div className="flex items-center justify-center text-xs text-gray-500">
        <span>benchr © 2025</span>
      </div>
    </footer>
  );
}

interface EditorPanelProps {
  code: string;
  language: Language;
  onCodeChange: (code: string) => void;
  onLanguageChange: (lang: Language) => void;
}

function EditorPanel({ code, language, onCodeChange, onLanguageChange }: EditorPanelProps) {
  return (
    <div className="flex flex-col h-full gap-2">
      <div className="px-2 sm:px-4 py-2 bg-[#252526] flex items-center justify-between rounded-lg border border-gray-700 shadow-lg">
        <h2 className="text-xs sm:text-sm font-medium text-[#d4a04c] whitespace-nowrap">Code Editor</h2>
        <LanguageSelector
          languages={LANGUAGE_OPTIONS}
          currentLanguage={language}
          onLanguageChange={onLanguageChange}
        />
      </div>
      <div className="flex-1 overflow-hidden rounded-lg border border-gray-700 shadow-xl">
        <div className="h-full bg-[#1e1e1e] pt-1">
          <ClientOnly
            fallback={
              <div className="flex items-center justify-center h-full text-gray-400">
                Loading editor...
              </div>
            }
          >
            {() => (
              <Editor
                height="100%"
                language={language}
                value={code}
                onChange={(value) => onCodeChange(value || '')}
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
    </div>
  );
}

interface ResultsPanelProps {
  loading: boolean;
  jobData: JobData | null;
  error: string | null;
  cancelled: boolean;
  pollAttempts: number;
  onCancel: () => void;
  language: Language;
}

function ResultsPanel({ loading, jobData, error, cancelled, pollAttempts, onCancel, language }: ResultsPanelProps) {
  const [resultView, setResultView] = useState<'performance' | 'insights' | 'bytecode'>('performance');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([
    {
      role: 'assistant',
      content: 'Hi! I\'m Claude, your performance analysis assistant. Ask me anything about code optimization, performance metrics, or best practices!'
    }
  ]);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: chatInput }]);

    // Clear input
    setChatInput('');

    // Mock AI response (no backend yet)
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'This is a placeholder response. Backend integration coming soon!'
      }]);
    }, 500);
  };

  // Languages that support bytecode/disassembly view
  const supportsBytecode = language === 'python' || language === 'cpp' || language === 'assembly';

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="px-2 sm:px-4 py-2 bg-[#252526] flex items-center justify-between rounded-lg border border-gray-700 shadow-lg">
        <h2 className="text-xs sm:text-sm font-medium text-[#d4a04c] whitespace-nowrap">Analysis</h2>
        <ToggleGroup type="single" value={resultView} onValueChange={(value) => value && setResultView(value as 'performance' | 'insights' | 'bytecode')}>
          <ToggleGroupItem value="performance" aria-label="Performance view" className="data-[state=on]:bg-[#3a3d41] data-[state=on]:text-[#d4a04c] data-[state=off]:text-gray-500 hover:bg-[#2d2d30] shadow-md !text-xs sm:!text-sm px-2 sm:px-3">
            Performance
          </ToggleGroupItem>
          <ToggleGroupItem value="insights" aria-label="AI Insights view" className="data-[state=on]:bg-[#3a3d41] data-[state=on]:text-[#d4a04c] data-[state=off]:text-gray-500 hover:bg-[#2d2d30] shadow-md !text-xs sm:!text-sm px-2 sm:px-3">
            AI Insights
          </ToggleGroupItem>
          {supportsBytecode && (
            <ToggleGroupItem value="bytecode" aria-label="Bytecode view" className="data-[state=on]:bg-[#3a3d41] data-[state=on]:text-[#d4a04c] data-[state=off]:text-gray-500 hover:bg-[#2d2d30] shadow-md !text-xs sm:!text-sm px-2 sm:px-3">
              Bytecode
            </ToggleGroupItem>
          )}
        </ToggleGroup>
      </div>
      <div className="flex-1 overflow-hidden rounded-lg border border-gray-700 bg-[#1e1e1e] shadow-xl">
        <div className="p-6 h-full overflow-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-[#0e639c]" />
              <p className="text-sm text-gray-400">Running benchmark...</p>

              {/* Show cancel button after 10 polling attempts (20 seconds) */}
              {pollAttempts >= 10 && (
                <Button
                  onClick={onCancel}
                  variant="outline"
                  className="mt-4 bg-yellow-500/10 border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/20 hover:text-yellow-700"
                >
                  Cancel?
                </Button>
              )}
            </div>
          )}

          {cancelled && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-400">Benchmark cancelled</p>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-sm font-medium text-red-400 mb-2">Error</p>
                <p className="text-sm text-gray-400">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && !cancelled && jobData && jobData.perf && resultView === 'performance' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-3 text-gray-200">Performance Metrics</h3>
                <div className="rounded-lg border border-gray-700 overflow-hidden bg-[#1e1e1e] shadow-lg">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#252526] border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Metric</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-300">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-700 hover:bg-[#2a2d2e] transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-400">CPU Cycles</td>
                        <td className="py-3 px-4 text-sm font-mono text-right text-gray-200">
                          {jobData.perf.cpu_cycles !== null && jobData.perf.cpu_cycles !== undefined
                            ? jobData.perf.cpu_cycles.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                            : 'N/A'}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-700 hover:bg-[#2a2d2e] transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-400">Instructions</td>
                        <td className="py-3 px-4 text-sm font-mono text-right text-gray-200">
                          {jobData.perf.instructions !== null && jobData.perf.instructions !== undefined
                            ? jobData.perf.instructions.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                            : 'N/A'}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-700 hover:bg-[#2a2d2e] transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-400">Cache References</td>
                        <td className="py-3 px-4 text-sm font-mono text-right text-gray-200">
                          {jobData.perf.cache_references !== null && jobData.perf.cache_references !== undefined
                            ? jobData.perf.cache_references.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                            : 'N/A'}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-700 hover:bg-[#2a2d2e] transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-400">Cache Misses</td>
                        <td className="py-3 px-4 text-sm font-mono text-right text-gray-200">
                          {jobData.perf.cache_misses !== null && jobData.perf.cache_misses !== undefined
                            ? jobData.perf.cache_misses.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                            : 'N/A'}
                        </td>
                      </tr>
                      <tr className="hover:bg-[#2a2d2e] transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-400">Branch Misses</td>
                        <td className="py-3 px-4 text-sm font-mono text-right text-gray-200">
                          {jobData.perf.branch_misses !== null && jobData.perf.branch_misses !== undefined
                            ? jobData.perf.branch_misses.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                            : 'N/A'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs text-gray-500">
                  Job ID: {jobData.job_id}
                </p>
                <p className="text-xs text-gray-500">
                  Status: {jobData.status}
                </p>
              </div>
            </div>
          )}

          {!loading && !error && !cancelled && resultView === 'insights' && (
            <div className="flex flex-col h-full gap-4">
              {/* Chat messages - scrollable */}
              <div className="flex-1 overflow-y-auto space-y-4">
                {messages.map((message, idx) => (
                  <div key={idx} className="flex gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#d4a04c] flex items-center justify-center text-[#1e1e1e] text-xs font-bold shadow-md">
                      {message.role === 'assistant' ? 'AI' : 'You'}
                    </div>

                    {/* Message bubble */}
                    <div className="flex-1">
                      <div className={`rounded-lg p-3 shadow-lg ${
                        message.role === 'assistant'
                          ? 'bg-[#252526]'
                          : 'bg-[#2d2d30]'
                      }`}>
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input box at bottom */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask Claude about performance optimization..."
                  className="flex-1 bg-[#252526] border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#d4a04c] focus:border-transparent shadow-md transition-all"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim()}
                  className="bg-[#d4a04c] hover:bg-[#e0b05f] text-[#1e1e1e] shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed px-6"
                >
                  Send
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && !cancelled && resultView === 'bytecode' && (
            <div className="h-full overflow-y-auto">
              {jobData ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-200">
                    {language === 'python' ? 'Python Bytecode' : 'Assembly Output'}
                  </h3>
                  <div className="rounded-lg border border-gray-700 overflow-hidden bg-[#1e1e1e] shadow-lg">
                    <pre className="p-4 text-xs font-mono text-gray-300 overflow-x-auto leading-relaxed">
{language === 'python' ? `  1           0 LOAD_CONST               0 (<code object main at 0x7f8b9c>)
              2 LOAD_CONST               1 ('main')
              4 MAKE_FUNCTION            0
              6 STORE_NAME               0 (main)

  2           8 LOAD_NAME                0 (main)
             10 CALL_FUNCTION            0
             12 POP_TOP
             14 LOAD_CONST               2 (None)
             16 RETURN_VALUE

Disassembly of <code object main at 0x7f8b9c>:
  3           0 LOAD_GLOBAL              0 (print)
              2 LOAD_CONST               1 ('Hello, Benchr!')
              4 CALL_FUNCTION            1
              6 POP_TOP
              8 LOAD_CONST               0 (None)
             10 RETURN_VALUE` :
`Disassembly of section .text:

0000000000001000 <_start>:
    1000:       b8 01 00 00 00          mov    eax,0x1
    1005:       bf 01 00 00 00          mov    edi,0x1
    100a:       48 be 00 20 00 00       movabs rsi,0x2000
    1010:       00 00 00 00
    1014:       ba 0e 00 00 00          mov    edx,0xe
    1019:       0f 05                   syscall
    101b:       b8 3c 00 00 00          mov    eax,0x3c
    1020:       48 31 ff                xor    rdi,rdi
    1023:       0f 05                   syscall

0000000000001025 <main>:
    1025:       55                      push   rbp
    1026:       48 89 e5                mov    rbp,rsp
    1029:       48 8d 3d d4 0f 00 00    lea    rdi,[rip+0xfd4]
    1030:       e8 cb ff ff ff          call   1000 <_start>
    1035:       b8 00 00 00 00          mov    eax,0x0
    103a:       5d                      pop    rbp
    103b:       c3                      ret`}
                    </pre>
                  </div>
                  <p className="text-xs text-gray-500">
                    Generated from: {jobData.compiler} {jobData.opts}
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-gray-400">Run a benchmark to see bytecode output</p>
                </div>
              )}
            </div>
          )}

          {!loading && !error && !cancelled && !jobData && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-400">Submit code to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { editor, handleLanguageChange, handleCodeChange } = useEditor();
  const { handleRunBenchmark, handleCancel, loading, jobData, error, cancelled, pollAttempts } = useBenchmark(editor);

  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e]">
      <Header onRunBenchmark={handleRunBenchmark} loading={loading} />

      <div className="flex-1 flex overflow-hidden gap-4 p-4">
        <div className="w-1/2">
          <EditorPanel
            code={editor.code}
            language={editor.language}
            onCodeChange={handleCodeChange}
            onLanguageChange={handleLanguageChange}
          />
        </div>

        <div className="w-1/2">
          <ResultsPanel
            loading={loading}
            jobData={jobData}
            error={error}
            cancelled={cancelled}
            pollAttempts={pollAttempts}
            onCancel={handleCancel}
            language={editor.language}
          />
        </div>
      </div>

      <Footer />
    </div>
  );
}
