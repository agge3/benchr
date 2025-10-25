// API Service for Benchr Backend Integration
// Base URL for the Flask API
const API_BASE_URL = '/api/v1';

// Types matching the backend schema
export interface User {
  id: number;
  username: string;
  email: string;
  api_key?: string;
}

export interface CodeProgram {
  id: number;
  user_id: number;
  name: string;
  code_text: string;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface PerfMetrics {
  id: number;
  snapshot_id: number;
  cpu_cycles: number;
  instructions: number;
  cache_references: number;
  cache_misses: number;
  branch_misses: number;
}

export interface VmstatMetrics {
  id: number;
  snapshot_id: number;
  procs_running: number;
  procs_blocked: number;
  memory_free_kb: number;
  memory_used_kb: number;
  swap_used_kb: number;
  io_blocks_in: number;
  io_blocks_out: number;
  cpu_user_percent: number;
  cpu_system_percent: number;
  cpu_idle_percent: number;
}

export interface IostatMetrics {
  id: number;
  snapshot_id: number;
  device: string;
  total_reads: number;
  total_writes: number;
  read_kb_per_sec: number;
  write_kb_per_sec: number;
  cpu_util: number;
  cpu_idle: number;
  await_ms: number;
}

export interface MetricSnapshot {
  id: number;
  code_program_id: number;
  timestamp: string;
  notes: string | null;
  perf_metrics: PerfMetrics;
  vmstat_metrics: VmstatMetrics;
  iostat_metrics: IostatMetrics;
}

export interface ProgramWithMetrics {
  program: CodeProgram;
  latest_snapshot: MetricSnapshot | null;
}

export interface BenchmarkJobRequest {
  code_text: string;
  language: string;
  name?: string;
}

export interface BenchmarkJobResponse {
  job_id: string;
  status: string;
  message: string;
}

export interface SnapshotSubmission {
  notes?: string;
  perf_metrics: Omit<PerfMetrics, 'id' | 'snapshot_id'>;
  vmstat_metrics: Omit<VmstatMetrics, 'id' | 'snapshot_id'>;
  iostat_metrics: Omit<IostatMetrics, 'id' | 'snapshot_id'>;
}

// API Error class
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Storage for API key
class APIKeyStore {
  private static KEY = 'benchr_api_key';

  static set(apiKey: string): void {
    localStorage.setItem(this.KEY, apiKey);
  }

  static get(): string | null {
    return localStorage.getItem(this.KEY);
  }

  static remove(): void {
    localStorage.removeItem(this.KEY);
  }
}

// Helper function to make authenticated requests
async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiKey = APIKeyStore.get();
  
  if (!apiKey) {
    throw new APIError('No API key found. Please login again.', 401);
  }

  const headers = new Headers(options.headers);
  headers.set('X-API-Key', apiKey);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new APIError(
      errorData.error || `Request failed with status ${response.status}`,
      response.status,
      errorData
    );
  }

  return response;
}

// API Service
export const BenchrAPI = {
  // Auth Management
  auth: {
    setApiKey(apiKey: string): void {
      APIKeyStore.set(apiKey);
    },

    getApiKey(): string | null {
      return APIKeyStore.get();
    },

    logout(): void {
      APIKeyStore.remove();
    },

    isAuthenticated(): boolean {
      return !!APIKeyStore.get();
    },
  },

  // Submit code for benchmarking
  async submitBenchmark(request: BenchmarkJobRequest): Promise<BenchmarkJobResponse> {
    const response = await authenticatedFetch('/jobs', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    return response.json();
  },

  // Get all user's programs
  async getPrograms(): Promise<CodeProgram[]> {
    const response = await authenticatedFetch('/programs');
    const data = await response.json();
    return data.programs || [];
  },

  // Get specific program with its latest metrics
  async getProgramWithMetrics(programId: number): Promise<ProgramWithMetrics> {
    const response = await authenticatedFetch(`/programs/${programId}`);
    return response.json();
  },

  // Submit benchmark results for a program
  async submitSnapshot(
    programId: number,
    snapshot: SnapshotSubmission
  ): Promise<MetricSnapshot> {
    const response = await authenticatedFetch(`/programs/${programId}/snapshots`, {
      method: 'POST',
      body: JSON.stringify(snapshot),
    });

    return response.json();
  },

  // Get program's snapshot history
  async getProgramSnapshots(programId: number): Promise<MetricSnapshot[]> {
    const response = await authenticatedFetch(`/programs/${programId}/snapshots`);
    const data = await response.json();
    return data.snapshots || [];
  },

  // Helper: Run benchmark and wait for results
  async runBenchmarkComplete(
    code: string,
    language: string,
    name?: string
  ): Promise<ProgramWithMetrics> {
    // Submit the job
    const jobResponse = await this.submitBenchmark({
      code_text: code,
      language,
      name: name || `Benchmark ${new Date().toISOString()}`,
    });

    // In a real implementation, you would poll for job completion
    // For now, we'll just wait a bit and fetch the latest program
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get all programs and find the most recent one
    const programs = await this.getPrograms();
    if (programs.length === 0) {
      throw new APIError('No programs found after benchmark submission');
    }

    // Sort by created_at and get the most recent
    const latestProgram = programs.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

    // Fetch with metrics
    return this.getProgramWithMetrics(latestProgram.id);
  },
};

// Export for convenience
export { APIKeyStore };
