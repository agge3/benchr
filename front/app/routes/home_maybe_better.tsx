import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Loader2, Clock, Cpu, HardDrive, Zap } from 'lucide-react';
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

  return { editor, handleLanguageChange, handleCodeChange };
}

function useBenchmark(editorConfig: EditorConfig) {
  const [loading, setLoading] = useState(false);
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [pollAttempts, setPollAttempts] = useState(0);
  
  // ✅ Use useRef instead of useState for cancel flag
  const cancelledRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const pollForResults = async (jobId: string): Promise<JobData | null> => {
    const maxAttempts = 60; // 60 attempts * 1 second = 1 minute max
    const pollInterval = 1000; // Poll every 1 second
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        // Check if cancelled
        if (cancelledRef.current) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          resolve(null);
          return;
        }

        attempts++;
        setPollAttempts(attempts);

        // Check if we've exceeded max attempts
        if (attempts > maxAttempts) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          reject(new Error('Polling timeout - job took too long (60s)'));
          return;
        }

        try {
          console.log(`[Poll ${attempts}/${maxAttempts}] Fetching job ${jobId}...`);
          const job = await benchmarkService.getJobById(jobId).json();

          // Check cancelled again after async call
          if (cancelledRef.current) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            resolve(null);
            return;
          }

          // Job not found in cache yet - keep polling
          if (!job) {
            console.log(`[Poll ${attempts}] Job not in cache yet, continuing...`);
            return; // Continue polling
          }

	  

          console.log(`[Poll ${attempts}] Job status: ${job.status}`);

          // ✅ SUCCESS - Job completed with results
          if (job.status === 'completed' && job.result) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            console.log('✅ Job completed successfully!');
            resolve(job);
            return;
          }

          // ❌ FAILURE - Job failed
          if (job.status === 'failed') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            reject(new Error('Job execution failed'));
            return;
          }

          // Job exists but still processing (queued, running, etc.)
          console.log(`[Poll ${attempts}] Job still processing...`);
          // Continue polling via interval

        } catch (err: any) {
          // Differentiate between retryable and fatal errors
          const isNetworkError = err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT';
          const is404 = err.response?.status === 404;
          const is5xx = err.response?.status >= 500;

          if (is404) {
            // 404 means job doesn't exist yet - this is OK, keep polling
            console.log(`[Poll ${attempts}] Job not found yet (404), continuing...`);
            return; // Continue polling
          }

          if (isNetworkError || is5xx) {
            // Network errors or 5xx - retry a few times
            console.warn(`[Poll ${attempts}] Temporary error (${err.code || err.response?.status}), retrying...`);
            if (attempts >= 5) {
              // After 5 network errors, give up
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              reject(new Error(`Network error persists: ${err.message}`));
              return;
            }
            return; // Continue polling
          }

          // For other errors (400, 401, 403, etc.) - fail immediately
          console.error(`[Poll ${attempts}] Fatal error:`, err);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          reject(new Error(`API error: ${err.message}`));
        }
      };

      // Start polling immediately, then every interval
      poll();
      pollIntervalRef.current = setInterval(poll, pollInterval);
    });
  };

  const handleRunBenchmark = async () => {
    // Reset all state
    setLoading(true);
    setError(null);
    setCancelled(false);
    setJobData(null);
    setPollAttempts(0);
    cancelledRef.current = false;

    // Clear any existing poll interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    try {
      // Step 1: Submit the job
      const payload: BenchmarkPayload = {
        code: editorConfig.code,
        lang: editorConfig.language,
        compiler: editorConfig.compiler,
        opts: editorConfig.opts
      };

      console.log('📤 Submitting job...');
      const submitResult = await benchmarkService.submitJob(payload);
      console.log('✅ Job submitted:', submitResult.job_id);

      // Check if cancelled during submission
      if (cancelledRef.current) {
        setCancelled(true);
        return;
      }

      // Step 2: Poll for results
      console.log('🔄 Starting to poll for results...');
      const completedJob = await pollForResults(submitResult.job_id);

      // Check if cancelled during polling
      if (cancelledRef.current) {
        setCancelled(true);
        return;
      }

      // Step 3: Set results
      if (completedJob) {
        console.log('🎉 Results received!');
        setJobData(completedJob);
      }

    } catch (err) {
      // Only show error if not cancelled
      if (!cancelledRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to run benchmark';
        console.error('❌ Benchmark error:', errorMessage);
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
      setPollAttempts(0);
      
      // Clean up interval
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  };

  const handleCancel = () => {
    console.log('🛑 User cancelled benchmark');
    cancelledRef.current = true;
    setLoading(false);
    setCancelled(true);
    setPollAttempts(0);
    
    // Clear polling interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

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
  const [resultView, setResultView] = useState<'overview' | 'timing' | 'memory' | 'assembly' | 'output'>('overview');

  const result = jobData?.result;

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="px-2 sm:px-4 py-2 bg-[#252526] flex items-center justify-between rounded-lg border border-gray-700 shadow-lg">
        <h2 className="text-xs sm:text-sm font-medium text-[#d4a04c] whitespace-nowrap">Analysis</h2>
        <ToggleGroup type="single" value={resultView} onValueChange={(value) => value && setResultView(value as any)}>
          <ToggleGroupItem value="overview" className="data-[state=on]:bg-[#3a3d41] data-[state=on]:text-[#d4a04c] data-[state=off]:text-gray-500 hover:bg-[#2d2d30] shadow-md !text-xs sm:!text-sm px-2 sm:px-3">
            Overview
          </ToggleGroupItem>
          <ToggleGroupItem value="timing" className="data-[state=on]:bg-[#3a3d41] data-[state=on]:text-[#d4a04c] data-[state=off]:text-gray-500 hover:bg-[#2d2d30] shadow-md !text-xs sm:!text-sm px-2 sm:px-3">
            Timing
          </ToggleGroupItem>
          <ToggleGroupItem value="memory" className="data-[state=on]:bg-[#3a3d41] data-[state=on]:text-[#d4a04c] data-[state=off]:text-gray-500 hover:bg-[#2d2d30] shadow-md !text-xs sm:!text-sm px-2 sm:px-3">
            Memory
          </ToggleGroupItem>
          <ToggleGroupItem value="assembly" className="data-[state=on]:bg-[#3a3d41] data-[state=on]:text-[#d4a04c] data-[state=off]:text-gray-500 hover:bg-[#2d2d30] shadow-md !text-xs sm:!text-sm px-2 sm:px-3">
            Assembly
          </ToggleGroupItem>
          <ToggleGroupItem value="output" className="data-[state=on]:bg-[#3a3d41] data-[state=on]:text-[#d4a04c] data-[state=off]:text-gray-500 hover:bg-[#2d2d30] shadow-md !text-xs sm:!text-sm px-2 sm:px-3">
            Output
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      
      <div className="flex-1 overflow-hidden rounded-lg border border-gray-700 bg-[#1e1e1e] shadow-xl">
        <div className="p-6 h-full overflow-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-[#0e639c]" />
              <p className="text-sm text-gray-400">Running benchmark...</p>
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

          {!loading && !error && !cancelled && result && resultView === 'overview' && (
            <div className="space-y-6">
              {/* Quick Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#252526] rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-[#d4a04c]" />
                    <h3 className="text-xs font-medium text-gray-400">Execution Time</h3>
                  </div>
                  <p className="text-2xl font-bold text-gray-200">{result?.time?.elapsed_time || 'N/A'}</p>
                  <p className="text-xs text-gray-500 mt-1">{result?.time?.elapsed_time_total_seconds?.toFixed(4) || '0'}s total</p>
                </div>

                <div className="bg-[#252526] rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="h-4 w-4 text-[#d4a04c]" />
                    <h3 className="text-xs font-medium text-gray-400">CPU Usage</h3>
                  </div>
                  <p className="text-2xl font-bold text-gray-200">{result?.time?.cpu_percent || 0}%</p>
                  <p className="text-xs text-gray-500 mt-1">User: {result?.time?.user_time || 0}s | Sys: {result?.time?.system_time || 0}s</p>
                </div>

                <div className="bg-[#252526] rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <HardDrive className="h-4 w-4 text-[#d4a04c]" />
                    <h3 className="text-xs font-medium text-gray-400">Max Memory</h3>
                  </div>
                  <p className="text-2xl font-bold text-gray-200">
                    {result?.time?.maximum_resident_set_size 
                      ? (result.time.maximum_resident_set_size / 1024).toFixed(2) 
                      : '0'} MB
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{result?.time?.maximum_resident_set_size || 0} KB</p>
                </div>

                <div className="bg-[#252526] rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-[#d4a04c]" />
                    <h3 className="text-xs font-medium text-gray-400">Exit Code</h3>
                  </div>
                  <p className="text-2xl font-bold text-gray-200">{result?.exit_code ?? 'N/A'}</p>
                  <p className="text-xs text-gray-500 mt-1">{result?.success ? 'Success' : 'Failed'}</p>
                </div>
              </div>

              {/* Hardware Perf Counters (if available) */}
              {result?.perf && Object.keys(result.perf).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3 text-gray-200">Hardware Performance Counters</h3>
                  <div className="rounded-lg border border-gray-700 overflow-hidden bg-[#1e1e1e]">
                    <table className="w-full">
                      <tbody>
                        {result.perf.cpu_cycles && (
                          <tr className="border-b border-gray-700 hover:bg-[#2a2d2e]">
                            <td className="py-2 px-4 text-sm text-gray-400">CPU Cycles</td>
                            <td className="py-2 px-4 text-sm font-mono text-right text-gray-200">
                              {result.perf.cpu_cycles.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                            </td>
                          </tr>
                        )}
                        {result.perf.instructions && (
                          <tr className="border-b border-gray-700 hover:bg-[#2a2d2e]">
                            <td className="py-2 px-4 text-sm text-gray-400">Instructions</td>
                            <td className="py-2 px-4 text-sm font-mono text-right text-gray-200">
                              {result.perf.instructions.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                            </td>
                          </tr>
                        )}
                        {result.perf.cache_misses && (
                          <tr className="hover:bg-[#2a2d2e]">
                            <td className="py-2 px-4 text-sm text-gray-400">Cache Misses</td>
                            <td className="py-2 px-4 text-sm font-mono text-right text-gray-200">
                              {result.perf.cache_misses.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && !error && !cancelled && result && resultView === 'timing' && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-200">Timing Details</h3>
              <div className="rounded-lg border border-gray-700 overflow-hidden bg-[#1e1e1e]">
                <table className="w-full">
                  <tbody>
                    <tr className="border-b border-gray-700 hover:bg-[#2a2d2e]">
                      <td className="py-3 px-4 text-sm text-gray-400">Total Elapsed Time</td>
                      <td className="py-3 px-4 text-sm font-mono text-right text-gray-200">{result?.time?.elapsed_time || 'N/A'}</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-[#2a2d2e]">
                      <td className="py-3 px-4 text-sm text-gray-400">User CPU Time</td>
                      <td className="py-3 px-4 text-sm font-mono text-right text-gray-200">{result?.time?.user_time || 0}s</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-[#2a2d2e]">
                      <td className="py-3 px-4 text-sm text-gray-400">System CPU Time</td>
                      <td className="py-3 px-4 text-sm font-mono text-right text-gray-200">{result?.time?.system_time || 0}s</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-[#2a2d2e]">
                      <td className="py-3 px-4 text-sm text-gray-400">CPU Percentage</td>
                      <td className="py-3 px-4 text-sm font-mono text-right text-gray-200">{result?.time?.cpu_percent || 0}%</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-[#2a2d2e]">
                      <td className="py-3 px-4 text-sm text-gray-400">Voluntary Context Switches</td>
                      <td className="py-3 px-4 text-sm font-mono text-right text-gray-200">{result?.time?.voluntary_context_switches?.toLocaleString() || '0'}</td>
                    </tr>
                    <tr className="hover:bg-[#2a2d2e]">
                      <td className="py-3 px-4 text-sm text-gray-400">Involuntary Context Switches</td>
                      <td className="py-3 px-4 text-sm font-mono text-right text-gray-200">{result?.time?.involuntary_context_switches?.toLocaleString() || '0'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && !error && !cancelled && result && resultView === 'memory' && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-200">Memory & I/O Statistics</h3>
              <div className="rounded-lg border border-gray-700 overflow-hidden bg-[#1e1e1e]">
                <table className="w-full">
                  <tbody>
                    <tr className="border-b border-gray-700 hover:bg-[#2a2d2e]">
                      <td className="py-3 px-4 text-sm text-gray-400">Maximum Resident Set Size</td>
                      <td className="py-3 px-4 text-sm font-mono text-right text-gray-200">{result?.time?.maximum_resident_set_size?.toLocaleString() || '0'} KB</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-[#2a2d2e]">
                      <td className="py-3 px-4 text-sm text-gray-400">Major Page Faults</td>
                      <td className="py-3 px-4 text-sm font-mono text-right text-gray-200">{result?.time?.major_pagefaults?.toLocaleString() || '0'}</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-[#2a2d2e]">
                      <td className="py-3 px-4 text-sm text-gray-400">Minor Page Faults</td>
                      <td className="py-3 px-4 text-sm font-mono text-right text-gray-200">{result?.time?.minor_pagefaults?.toLocaleString() || '0'}</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-[#2a2d2e]">
                      <td className="py-3 px-4 text-sm text-gray-400">Block Input Operations</td>
                      <td className="py-3 px-4 text-sm font-mono text-right text-gray-200">{result?.time?.block_input_operations?.toLocaleString() || '0'}</td>
                    </tr>
                    <tr className="hover:bg-[#2a2d2e]">
                      <td className="py-3 px-4 text-sm text-gray-400">Block Output Operations</td>
                      <td className="py-3 px-4 text-sm font-mono text-right text-gray-200">{result?.time?.block_output_operations?.toLocaleString() || '0'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {result?.vmstat && result.vmstat.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-200 mb-3">Virtual Memory Stats (First Sample)</h3>
                  <div className="rounded-lg border border-gray-700 overflow-hidden bg-[#1e1e1e]">
                    <table className="w-full">
                      <tbody>
                        <tr className="border-b border-gray-700 hover:bg-[#2a2d2e]">
                          <td className="py-2 px-4 text-sm text-gray-400">Free Memory</td>
                          <td className="py-2 px-4 text-sm font-mono text-right text-gray-200">{result.vmstat[0]?.free_mem?.toLocaleString() || '0'} KB</td>
                        </tr>
                        <tr className="border-b border-gray-700 hover:bg-[#2a2d2e]">
                          <td className="py-2 px-4 text-sm text-gray-400">Cache Memory</td>
                          <td className="py-2 px-4 text-sm font-mono text-right text-gray-200">{result.vmstat[0]?.cache_mem?.toLocaleString() || '0'} KB</td>
                        </tr>
                        <tr className="hover:bg-[#2a2d2e]">
                          <td className="py-2 px-4 text-sm text-gray-400">Context Switches</td>
                          <td className="py-2 px-4 text-sm font-mono text-right text-gray-200">{result.vmstat[0]?.context_switches?.toLocaleString() || '0'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && !error && !cancelled && result && resultView === 'assembly' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-200">
                  {language === 'python' ? 'Python Bytecode' : 'Assembly Output'}
                </h3>
                <span className="text-xs text-gray-500">
                  {result?.metadata?.language || ''} - {result?.metadata?.interpreter || ''}
                </span>
              </div>
              <div className="rounded-lg border border-gray-700 overflow-hidden bg-[#1e1e1e]">
                <pre className="p-4 text-xs font-mono text-gray-300 overflow-x-auto leading-relaxed whitespace-pre">
{result?.asm || 'No assembly output available'}
                </pre>
              </div>
            </div>
          )}

          {!loading && !error && !cancelled && result && resultView === 'output' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-200">Program Output</h3>
                <span className="text-xs text-gray-500">Exit Code: {result?.exit_code ?? 'N/A'}</span>
              </div>
              <div className="rounded-lg border border-gray-700 overflow-hidden bg-[#1e1e1e]">
                <pre className="p-4 text-sm font-mono text-gray-300 overflow-x-auto leading-relaxed whitespace-pre">
{result?.output || '(No output)'}
                </pre>
              </div>
              
              <div className="pt-4 border-t border-gray-700">
                <h4 className="text-xs font-medium text-gray-400 mb-2">Compilation Info</h4>
                <div className="bg-[#252526] rounded p-3">
                  <p className="text-xs text-gray-300">
                    <span className="text-gray-500">Status:</span> {result?.compilation?.success ? '✓ Success' : '✗ Failed'}
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    <span className="text-gray-500">Details:</span> {result?.compilation?.details || 'N/A'}
                  </p>
                  {result?.compilation?.error && (
                    <p className="text-xs text-red-400 mt-1">{result.compilation.error}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {!loading && !error && !cancelled && !result && (
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
