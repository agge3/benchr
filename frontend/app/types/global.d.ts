export type CompilerInfo = {
  id?: string;
  name?: string;
  version?: string;
  [k: string]: any;
};

export type BenchmarkConfig = {
  compiler?: string;
  flags?: string[];
  [k: string]: any;
};

export type JobPerf = { [k: string]: any };

export type JobData = {
  perf?: JobPerf;
  [k: string]: any;
};

export type ResultMetadata = {
  compiler?: string; //  Overview.tsx
  benchmarkName?: string;
  timestamp?: string;
  [k: string]: any;
};

export type JobResult = {
  result?: any;
  data?: JobData;
  metadata?: ResultMetadata;
  [k: string]: any;
};

export type AllowedLanguage = 'cpp' | 'c' | 'python' | 'asm' | 'java';
