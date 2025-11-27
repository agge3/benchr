export interface Job {
  job_id: string;
  language: string;
  compiler: string;
  compiler_opts?: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  code?: string;
  output?: string;
  error?: string;
  metrics?: {
    compile_time?: number;
    execution_time?: number;
    memory_usage?: number;
  };
  created_at: string;
  completed_at?: string;
}

export interface SubmitJobRequest {
  code: string;
  lang: string;
  compiler?: string;
  opts?: string;
}

export interface SubmitJobResponse {
  job_id: string;
  status: string;
}

export interface JobListResponse {
  jobs: Job[];
}

export interface CurrentJobResponse {
  job: Job | null;
}

export interface HealthResponse {
  status: string;
  database: string;
}
