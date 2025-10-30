import axios from 'axios';

const api = axios.create({
  baseURL: 'https://www.benchr.cc/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Payload structure matching the database schema
interface BenchmarkPayload {
  code: string;
  lang: string;
  compiler: string;
  opts: string;
}

interface SubmitJobResponse {
  job_id: string;
  status: string;
}

// Performance metrics from perf tool (empty in Python, populated in C/C++)
interface PerfMetrics {
  cpu_cycles?: string | null;
  instructions?: string | null;
  cache_references?: string | null;
  cache_misses?: string | null;
  branch_misses?: string | null;
}

// Time statistics from GNU time
interface TimeStats {
  command_being_timed: string;
  user_time: number;
  system_time: number;
  cpu_percent: number;
  elapsed_time: string;
  maximum_resident_set_size: number;
  major_pagefaults: number;
  minor_pagefaults: number;
  voluntary_context_switches: number;
  involuntary_context_switches: number;
  block_input_operations: number;
  block_output_operations: number;
  elapsed_time_total_seconds: number;
  [key: string]: any;
}

// Virtual memory statistics
interface VmStat {
  runnable_procs: number;
  uninterruptible_sleeping_procs: number;
  virtual_mem_used: number;
  free_mem: number;
  buffer_mem: number;
  cache_mem: number;
  inactive_mem: number | null;
  active_mem: number | null;
  swap_in: number;
  swap_out: number;
  blocks_in: number;
  blocks_out: number;
  interrupts: number;
  context_switches: number;
  user_time: number;
  system_time: number;
  idle_time: number;
  io_wait_time: number;
  stolen_time: number;
  [key: string]: any;
}

// Compilation info
interface CompilationInfo {
  success: boolean;
  error: string | null;
  details: string;
}

// Result metadata
interface ResultMetadata {
  language: string;
  interpreter: string;
  opts: string | null;
  source_size_bytes: number;
}

// Main result object
interface JobResult {
  success: boolean;
  timestamp: string;
  exit_code: number;
  output: string;
  asm: string;
  perf: PerfMetrics;
  time: TimeStats;
  vmstat: VmStat[];
  compilation: CompilationInfo;
  metadata: ResultMetadata;
}

// Job data structure
interface JobData {
  id: number;
  code: string;
  lang: string;
  compiler: string;
  opts: string;
  status: string;
  result: JobResult | null;
  started_at: string;
  completed_at: string | null;
}

const benchmarkService = {
  /**
   * Submit a new benchmark job
   * POST /api/submit
   * Each submit creates a new job_id for the user
   */
  async submitJob(payload: BenchmarkPayload): Promise<SubmitJobResponse> {
    const response = await api.post<SubmitJobResponse>('/submit', payload);
    return response.data;
  },

  /**
   * Get a specific job by ID (checks Redis queue)
   * GET /api/jobs/<job_id>
   * Returns job data with result metrics if completed, null result if still processing
   */
  async getJobById(jobId: string): Promise<JobData> {
    const response = await api.get<JobData>(`/jobs/${jobId}`);
    return response.data;
  },

  /**
   * Health check
   * GET /api/health
   */
  async healthCheck(): Promise<{ status: string; database: string }> {
    const response = await api.get('/health');
    return response.data;
  },

  /**
   * Send a chat message to Claude AI
   * POST /api/chat
   */
  async sendChatMessage(message: string, result: JobResult | null): Promise<{ response: string }> {
    const response = await api.post('/chat', {
      message,
      result
    });
    return response.data;
  }
};

export default benchmarkService;
export type {
  BenchmarkPayload,
  SubmitJobResponse,
  JobData,
  JobResult,
  PerfMetrics,
  TimeStats,
  VmStat,
  CompilationInfo,
  ResultMetadata
};
