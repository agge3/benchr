export type Language = 'cpp' | 'python' | 'java' | 'c';

export interface ExecutionResult {
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

export interface EditorConfig {
  code: string;
  language: Language;
  compiler: string;
  opts: string;
}

export interface LanguageConfig {
  defaultCode: string;
  compiler: string;
  opts: string;
}

export interface LanguageOption {
  id: Language;
  label: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type ResultView = 'overview' | 'execution' | 'performance' 
	| 'compilation' | 'system' | 'bytecode';
