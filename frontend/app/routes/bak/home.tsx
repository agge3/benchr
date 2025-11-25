import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Loader2 } from 'lucide-react';
import { ClientOnly } from '~/components/ClientOnly';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import benchmarkService from '~/services/api';
import type { BenchmarkPayload, JobData } from '~/services/api';

type Language = 'cpp' | 'python' | 'java' | 'c';

interface ExecutionResult {
  success: boolean;
  exit_code: number;
  output: string;
  asm: string;
  timestamp: string;
  compilation: {
    success: boolean;
    error: string | null;
    details: string | null;
  };
  time: {
    elapsed_time_total_seconds: number;
    cpu_percent: number;
    maximum_resident_set_size: number;
    user_time: number;
    system_time: number;
    minor_pagefaults: number;
    major_pagefaults: number;
    voluntary_context_switches: number;
    involuntary_context_switches: number;
    [key: string]: any;
  };
  perf: Record<string, any>;
  vmstat: Array<any>;
  metadata: {
    language: string;
    interpreter?: string;
    compiler?: string;
    opts?: string | null;
    source_size_bytes: number;
  };
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

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

/**
 * Collapsible section component for organizing result details
 */
function CollapsibleSection({
  title,
  children,
  defaultOpen = true
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden bg-[#252526]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-[#2a2d2e] hover:bg-[#323334] flex items-center justify-between font-medium text-gray-200 transition-colors"
      >
        <span className="text-sm">{title}</span>
        <span className="text-gray-400">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Metric display component
 */
function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[#2a2d2e] rounded p-3 border border-gray-700">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-base font-semibold text-gray-200 font-mono">{value}</div>
    </div>
  );
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
  java: {
    defaultCode: '// Write your Java code here\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Benchr!");\n    }\n}',
    compiler: 'javac',
    opts: ''
  },
  c: {
    defaultCode: '// Write your C code here\n#include <stdio.h>\n\nint main() {\n    printf("Hello, Benchr!\\n");\n    return 0;\n}',
    compiler: 'gcc',
    opts: '-O2 -std=c11'
  }
};

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { id: 'python', label: 'Python' },
  { id: 'cpp', label: 'C++' },
  { id: 'c', label: 'C' }
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

  const pollForResults = async (jobId: int, maxAttempts = 15) => {
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

        // Check if job is complete (has perf metrics or failed)
        if (job.status === 'completed' && job.result) {
          console.log('Job completed with metrics:', job.result);
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
  onRunBenchmark?: () => void;
  loading: boolean;
  compareMode: boolean;
  onToggleCompare: () => void;
}

function Header({ onRunBenchmark, loading, compareMode, onToggleCompare }: HeaderProps) {
  return (
    <header className="border-b border-gray-700 bg-[#252526] shadow-lg">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex-1"></div>

        <h1 className="text-xl font-semibold text-[#f9d262]">benchr</h1>

        <div className="flex-1 flex items-center justify-end gap-3">
          <Button
            onClick={onToggleCompare}
            className="bg-[#3a3d41] hover:bg-[#4a4d51] text-gray-200 border-0 shadow-lg font-medium"
          >
            {compareMode ? 'Single View' : 'Compare'}
          </Button>
          {!compareMode && onRunBenchmark && (
            <Button
              onClick={onRunBenchmark}
              className="bg-[#d4a04c] hover:bg-[#e0b05f] text-[#1e1e1e] border-0 shadow-lg font-medium"
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
          )}
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
  onRunBenchmark?: () => void;
  loading?: boolean;
}

function EditorPanel({ code, language, onCodeChange, onLanguageChange, onRunBenchmark, loading }: EditorPanelProps) {
  return (
    <div className="flex flex-col h-full gap-2">
      <div className="px-2 sm:px-4 py-2 bg-[#252526] flex items-center justify-between rounded-lg border border-gray-700 shadow-lg">
        <h2 className="text-xs sm:text-sm font-medium text-[#d4a04c] whitespace-nowrap">Code Editor</h2>
        <div className="flex items-center gap-2">
          <LanguageSelector
            languages={LANGUAGE_OPTIONS}
            currentLanguage={language}
            onLanguageChange={onLanguageChange}
          />
          {onRunBenchmark && (
            <Button
              onClick={onRunBenchmark}
              size="sm"
              className="bg-[#d4a04c] hover:bg-[#e0b05f] text-[#1e1e1e] border-0 shadow-md font-medium"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-hidden rounded-lg border border-gray-700 shadow-xl">
        <div className="h-full bg-[#1e1e1e] pt-1">
          <ClientOnly
            fallback={
              <div className="flex items-center justify-center h-full text-gray-300">
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
  const [resultView, setResultView] = useState<'overview' | 'execution' | 'performance' | 'compilation' | 'system' | 'insights' | 'bytecode'>('overview');
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
      <div className="px-2 sm:px-4 py-2 bg-[#252526] flex items-center gap-3 rounded-lg border border-gray-700 shadow-lg">
        <h2 className="text-xs sm:text-sm font-medium text-[#d4a04c] whitespace-nowrap flex-shrink-0">Analysis</h2>
        <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
          <ToggleGroup type="single" value={resultView} onValueChange={(value) => value && setResultView(value as typeof resultView)} className="flex-nowrap">
            <ToggleGroupItem value="overview" aria-label="Overview" className="data-[state=on]:bg-[#3a3d41] data-[state=on]:text-[#d4a04c] data-[state=off]:text-gray-500 hover:bg-[#2d2d30] shadow-md !text-xs sm:!text-sm px-2 sm:px-3 whitespace-nowrap">
              Overview
            </ToggleGroupItem>
            <ToggleGroupItem value="execution" aria-label="Execution" className="data-[state=on]:bg-[#3a3d41] data-[state=on]:text-[#d4a04c] data-[state=off]:text-gray-500 hover:bg-[#2d2d30] shadow-md !text-xs sm:!text-sm px-2 sm:px-3 whitespace-nowrap">
              Execution
            </ToggleGroupItem>
            <ToggleGroupItem value="performance" aria-label="Performance" className="data-[state=on]:bg-[#3a3d41] data-[state=on]:text-[#d4a04c] data-[state=off]:text-gray-500 hover:bg-[#2d2d30] shadow-md !text-xs sm:!text-sm px-2 sm:px-3 whitespace-nowrap">
              Performance
            </ToggleGroupItem>
            <ToggleGroupItem value="compilation" aria-label="Compilation" className="data-[state=on]:bg-[#3a3d41] data-[state=on]:text-[#d4a04c] data-[state=off]:text-gray-500 hover:bg-[#2d2d30] shadow-md !text-xs sm:!text-sm px-2 sm:px-3 whitespace-nowrap">
              Compilation
            </ToggleGroupItem>
            <ToggleGroupItem value="system" aria-label="System Stats" className="data-[state=on]:bg-[#3a3d41] data-[state=on]:text-[#d4a04c] data-[state=off]:text-gray-500 hover:bg-[#2d2d30] shadow-md !text-xs sm:!text-sm px-2 sm:px-3 whitespace-nowrap">
              System
            </ToggleGroupItem>
            <ToggleGroupItem value="insights" aria-label="AI Insights" className="data-[state=on]:bg-[#3a3d41] data-[state=on]:text-[#d4a04c] data-[state=off]:text-gray-500 hover:bg-[#2d2d30] shadow-md !text-xs sm:!text-sm px-2 sm:px-3 whitespace-nowrap">
              AI Insights
            </ToggleGroupItem>
            {supportsBytecode && (
              <ToggleGroupItem value="bytecode" aria-label="Bytecode" className="data-[state=on]:bg-[#3a3d41] data-[state=on]:text-[#d4a04c] data-[state=off]:text-gray-500 hover:bg-[#2d2d30] shadow-md !text-xs sm:!text-sm px-2 sm:px-3 whitespace-nowrap">
                Bytecode
              </ToggleGroupItem>
            )}
          </ToggleGroup>
        </div>
      </div>
      <div className="flex-1 overflow-hidden rounded-lg border border-gray-700 bg-[#1e1e1e] shadow-xl">
        <div className="p-6 h-full overflow-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-[#0e639c]" />
              <p className="text-sm text-gray-400">Running benchmark...</p>

              {/* Show cancel button after 10 polling attempts (20 seconds) */}
              {pollAttempts > 1 && (
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

          {!loading && !error && !cancelled && jobData && resultView === 'overview' && (
            <div className="space-y-4">
              {/* Quick Summary */}
              {jobData.result && (
                <div className={`${
                  jobData.result.success ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'
                } border rounded-lg p-4`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <span className={`text-lg font-medium ${
                        jobData.result.success ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {jobData.result.success ? '✓ Success' : '✗ Failed'}
                      </span>
                      <span className="text-sm text-gray-400">
                        Exit Code: <span className="font-mono text-gray-200">{jobData.result.exit_code}</span>
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(jobData.result.timestamp).toLocaleString()}
                    </div>
                  </div>
                  
                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Metric
                      label="Execution Time"
                      value={`${jobData.result.time?.elapsed_time_total_seconds?.toFixed(3) || 'N/A'}s`}
                    />
                    <Metric
                      label="CPU Usage"
                      value={`${jobData.result.time?.cpu_percent || 0}%`}
                    />
                    <Metric
                      label="Memory (RSS)"
                      value={formatBytes((jobData.result.time?.maximum_resident_set_size || 0) * 1024)}
                    />
                    <Metric
                      label="Language"
                      value={jobData.result.metadata?.language || 'N/A'}
                    />
                  </div>
                </div>
              )}

              {/* Metadata */}
              {jobData.result?.metadata && (
                <div className="bg-[#252526] border border-gray-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-3 text-gray-200">Environment</h3>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <dt className="text-gray-400">Language:</dt>
                    <dd className="font-mono text-gray-200">{jobData.result.metadata.language}</dd>

                    {jobData.result.metadata.interpreter && (
                      <>
                        <dt className="text-gray-400">Interpreter:</dt>
                        <dd className="font-mono text-gray-200">{jobData.result.metadata.interpreter}</dd>
                      </>
                    )}

                    {jobData.result.metadata.compiler && (
                      <>
                        <dt className="text-gray-400">Compiler:</dt>
                        <dd className="font-mono text-gray-200">{jobData.result.metadata.compiler}</dd>
                      </>
                    )}

                    {jobData.result.metadata.opts && (
                      <>
                        <dt className="text-gray-400">Options:</dt>
                        <dd className="font-mono text-gray-200">{jobData.result.metadata.opts}</dd>
                      </>
                    )}

                    <dt className="text-gray-400">Source Size:</dt>
                    <dd className="text-gray-200">{formatBytes(jobData.result.metadata.source_size_bytes)}</dd>
                  </dl>
                </div>
              )}
            </div>
          )}

          {!loading && !error && !cancelled && jobData && resultView === 'execution' && (
            <div className="space-y-4">
              {/* Program Output */}
              {jobData.result?.output && (
                <div>
                  <h3 className="text-sm font-medium mb-3 text-gray-200">Program Output</h3>
                  <pre className="bg-[#1e1e1e] text-green-400 p-4 rounded overflow-x-auto font-mono text-sm border border-gray-700">
                    {jobData.result.output}
                  </pre>
                </div>
              )}

              {/* Execution Summary */}
              {jobData.result && (
                <div className="bg-[#252526] border border-gray-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-3 text-gray-200">Execution Details</h3>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <dt className="text-gray-400">Exit Code:</dt>
                    <dd className="font-mono text-gray-200">{jobData.result.exit_code}</dd>
                    
                    <dt className="text-gray-400">Success:</dt>
                    <dd className={`font-mono ${jobData.result.success ? 'text-green-400' : 'text-red-400'}`}>
                      {jobData.result.success ? 'Yes' : 'No'}
                    </dd>
                    
                    <dt className="text-gray-400">Timestamp:</dt>
                    <dd className="text-gray-200">{new Date(jobData.result.timestamp).toLocaleString()}</dd>
                  </dl>
                </div>
              )}
            </div>
          )}

          {!loading && !error && !cancelled && jobData && resultView === 'performance' && (
            <div className="space-y-4">
              {/* Performance Metrics */}
              {jobData.result?.time && (
                <div>
                  <h3 className="text-sm font-medium mb-3 text-gray-200">Timing Metrics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Metric
                      label="Execution Time"
                      value={`${jobData.result.time.elapsed_time_total_seconds?.toFixed(3) || 'N/A'}s`}
                    />
                    <Metric
                      label="User Time"
                      value={`${jobData.result.time.user_time?.toFixed(3) || 'N/A'}s`}
                    />
                    <Metric
                      label="System Time"
                      value={`${jobData.result.time.system_time?.toFixed(3) || 'N/A'}s`}
                    />
                    <Metric
                      label="CPU Usage"
                      value={`${jobData.result.time.cpu_percent || 0}%`}
                    />
                    <Metric
                      label="Memory (RSS)"
                      value={formatBytes((jobData.result.time.maximum_resident_set_size || 0) * 1024)}
                    />
                    <Metric
                      label="Minor Page Faults"
                      value={`${jobData.result.time.minor_pagefaults || 0}`}
                    />
                    <Metric
                      label="Major Page Faults"
                      value={`${jobData.result.time.major_pagefaults || 0}`}
                    />
                    <Metric
                      label="Voluntary Ctx Switch"
                      value={`${jobData.result.time.voluntary_context_switches || 0}`}
                    />
                    <Metric
                      label="Involuntary Ctx Switch"
                      value={`${jobData.result.time.involuntary_context_switches || 0}`}
                    />
                  </div>
                </div>
              )}

              {/* Perf Stats */}
              {jobData.result?.perf && Object.keys(jobData.result.perf).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3 text-gray-200">Hardware Counters</h3>
                  <div className="rounded-lg border border-gray-700 overflow-hidden bg-[#252526] shadow-lg">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-[#2a2d2e] border-b border-gray-700">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Metric</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-gray-300">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(jobData.result.perf).map(([key, value]) => (
                          <tr key={key} className="border-b border-gray-700 hover:bg-[#2a2d2e] transition-colors">
                            <td className="py-3 px-4 text-sm text-gray-400">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                            <td className="py-3 px-4 text-sm font-mono text-right text-gray-200">
                              {typeof value === 'number' ? value.toLocaleString() : String(value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Fallback to old perf data if no result object */}
              {!jobData.result && jobData.perf && (
                <div>
                  <h3 className="text-sm font-medium mb-3 text-gray-200">Performance Metrics (Legacy)</h3>
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
              )}
            </div>
          )}

          {!loading && !error && !cancelled && jobData && resultView === 'compilation' && (
            <div className="space-y-4">
              {/* Compilation Info */}
              {jobData.result?.compilation && (
                <div>
                  <h3 className="text-sm font-medium mb-3 text-gray-200">Compilation Result</h3>
                  <div className="space-y-3">
                    <div className={`${
                      jobData.result.compilation.success ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'
                    } border rounded-lg p-4`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Status:</span>
                        <span className={`text-sm font-medium ${
                          jobData.result.compilation.success ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {jobData.result.compilation.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                    </div>
                    {jobData.result.compilation.details && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-400 mb-2">Details</h4>
                        <div className="bg-[#252526] border border-gray-700 rounded p-3 text-sm text-gray-300">
                          {jobData.result.compilation.details}
                        </div>
                      </div>
                    )}
                    {jobData.result.compilation.error && (
                      <div>
                        <h4 className="text-xs font-medium text-red-400 mb-2">Error</h4>
                        <pre className="bg-[#1e1e1e] p-3 rounded text-xs text-red-400 border border-red-900/50 overflow-x-auto">
                          {jobData.result.compilation.error}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && !error && !cancelled && jobData && resultView === 'system' && (
            <div className="space-y-4">
              {/* System Stats (vmstat) */}
              {jobData.result?.vmstat && jobData.result.vmstat.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3 text-gray-200">System Statistics</h3>
                  <div className="overflow-x-auto">
                    <pre className="bg-[#1e1e1e] p-4 rounded text-xs text-gray-300 font-mono border border-gray-700">
                      {JSON.stringify(jobData.result.vmstat[0], null, 2)}
                    </pre>
                  </div>
                </div>
              )}
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
              {jobData?.result?.asm ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-200">
                    {language === 'python' ? 'Python Bytecode' : 'Assembly Output'}
                  </h3>
                  <div className="rounded-lg border border-gray-700 overflow-hidden bg-[#1e1e1e] shadow-lg">
                    <pre className="p-4 text-xs font-mono text-gray-300 overflow-x-auto leading-relaxed">
                      {jobData.result.asm}
                    </pre>
                  </div>
                  {jobData.result.metadata && (
                    <p className="text-xs text-gray-500">
                      Generated from: {jobData.result.metadata.compiler || jobData.result.metadata.interpreter} {jobData.result.metadata.opts || ''}
                    </p>
                  )}
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
  const [compareMode, setCompareMode] = useState(false);
  
  // Editor 1 (always visible)
  const { editor: editor1, handleLanguageChange: handleLanguageChange1, handleCodeChange: handleCodeChange1 } = useEditor();
  const { handleRunBenchmark: handleRunBenchmark1, handleCancel: handleCancel1, loading: loading1, jobData: jobData1, error: error1, cancelled: cancelled1, pollAttempts: pollAttempts1 } = useBenchmark(editor1);

  // Editor 2 (only in compare mode)
  const { editor: editor2, handleLanguageChange: handleLanguageChange2, handleCodeChange: handleCodeChange2 } = useEditor();
  const { handleRunBenchmark: handleRunBenchmark2, handleCancel: handleCancel2, loading: loading2, jobData: jobData2, error: error2, cancelled: cancelled2, pollAttempts: pollAttempts2 } = useBenchmark(editor2);

  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e]">
      <Header 
        onRunBenchmark={compareMode ? undefined : handleRunBenchmark1} 
        loading={compareMode ? false : loading1}
        compareMode={compareMode}
        onToggleCompare={() => setCompareMode(!compareMode)}
      />

      {!compareMode ? (
        // Default view: side by side
        <div className="flex-1 flex overflow-hidden gap-4 p-4">
          <div className="w-1/2">
            <EditorPanel
              code={editor1.code}
              language={editor1.language}
              onCodeChange={handleCodeChange1}
              onLanguageChange={handleLanguageChange1}
            />
          </div>

          <div className="w-1/2">
            <ResultsPanel
              loading={loading1}
              jobData={jobData1}
              error={error1}
              cancelled={cancelled1}
              pollAttempts={pollAttempts1}
              onCancel={handleCancel1}
              language={editor1.language}
            />
          </div>
        </div>
      ) : (
        // Compare view: 2x2 grid - each row has editor left, results right
        <div className="flex-1 flex flex-col overflow-hidden gap-4 p-4">
          {/* Top half - Language 1 */}
          <div className="flex-1 flex gap-4">
            <div className="w-1/2">
              <EditorPanel
                code={editor1.code}
                language={editor1.language}
                onCodeChange={handleCodeChange1}
                onLanguageChange={handleLanguageChange1}
                onRunBenchmark={handleRunBenchmark1}
                loading={loading1}
              />
            </div>
            <div className="w-1/2">
              <ResultsPanel
                loading={loading1}
                jobData={jobData1}
                error={error1}
                cancelled={cancelled1}
                pollAttempts={pollAttempts1}
                onCancel={handleCancel1}
                language={editor1.language}
              />
            </div>
          </div>

          {/* Bottom half - Language 2 */}
          <div className="flex-1 flex gap-4">
            <div className="w-1/2">
              <EditorPanel
                code={editor2.code}
                language={editor2.language}
                onCodeChange={handleCodeChange2}
                onLanguageChange={handleLanguageChange2}
                onRunBenchmark={handleRunBenchmark2}
                loading={loading2}
              />
            </div>
            <div className="w-1/2">
              <ResultsPanel
                loading={loading2}
                jobData={jobData2}
                error={error2}
                cancelled={cancelled2}
                pollAttempts={pollAttempts2}
                onCancel={handleCancel2}
                language={editor2.language}
              />
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
