import { formatBytes } from '~/utils/format';
import type { TimeStats, PerfMetrics } from '~/services/api';

/**
 * Configuration for a single metric display
 */
export interface MetricConfig {
  key: string;
  label: string;
  getValue: (data: any) => string | number;
  format?: (value: any) => string;
}

/**
 * Timing metrics configuration
 * These are displayed in a grid at the top of the Performance view
 */
export const TIMING_METRICS: MetricConfig[] = [
  {
    key: 'elapsed_time',
    label: 'Execution Time',
    getValue: (time: TimeStats) => time.elapsed_time_total_seconds ?? 0,
    format: (v) => `${v.toFixed(3)}s`,
  },
  {
    key: 'user_time',
    label: 'User Time',
    getValue: (time: TimeStats) => time.user_time ?? 0,
    format: (v) => `${v.toFixed(3)}s`,
  },
  {
    key: 'system_time',
    label: 'System Time',
    getValue: (time: TimeStats) => time.system_time ?? 0,
    format: (v) => `${v.toFixed(3)}s`,
  },
  {
    key: 'cpu_percent',
    label: 'CPU Usage',
    getValue: (time: TimeStats) => time.cpu_percent ?? 0,
    format: (v) => `${v}%`,
  },
  {
    key: 'memory',
    label: 'Memory (RSS)',
    getValue: (time: TimeStats) => (time.maximum_resident_set_size ?? 0) * 1024,
    format: (v) => formatBytes(v),
  },
  {
    key: 'minor_pagefaults',
    label: 'Minor Page Faults',
    getValue: (time: TimeStats) => time.minor_pagefaults ?? 0,
    format: (v) => v.toLocaleString(),
  },
  {
    key: 'major_pagefaults',
    label: 'Major Page Faults',
    getValue: (time: TimeStats) => time.major_pagefaults ?? 0,
    format: (v) => v.toLocaleString(),
  },
  {
    key: 'voluntary_ctx',
    label: 'Voluntary Ctx Switch',
    getValue: (time: TimeStats) => time.voluntary_context_switches ?? 0,
    format: (v) => v.toLocaleString(),
  },
  {
    key: 'involuntary_ctx',
    label: 'Involuntary Ctx Switch',
    getValue: (time: TimeStats) => time.involuntary_context_switches ?? 0,
    format: (v) => v.toLocaleString(),
  },
];

/**
 * Legacy perf metrics configuration (for backward compatibility)
 * Used when jobData.perf exists but not jobData.result.perf
 */
export const LEGACY_PERF_METRICS: MetricConfig[] = [
  {
    key: 'cpu_cycles',
    label: 'CPU Cycles',
    getValue: (perf: PerfMetrics) => perf.cpu_cycles ?? 'N/A',
    format: (v) => typeof v === 'number' ? v.toLocaleString() : String(v),
  },
  {
    key: 'instructions',
    label: 'Instructions',
    getValue: (perf: PerfMetrics) => perf.instructions ?? 'N/A',
    format: (v) => typeof v === 'number' ? v.toLocaleString() : String(v),
  },
  {
    key: 'cache_references',
    label: 'Cache References',
    getValue: (perf: PerfMetrics) => perf.cache_references ?? 'N/A',
    format: (v) => typeof v === 'number' ? v.toLocaleString() : String(v),
  },
  {
    key: 'cache_misses',
    label: 'Cache Misses',
    getValue: (perf: PerfMetrics) => perf.cache_misses ?? 'N/A',
    format: (v) => typeof v === 'number' ? v.toLocaleString() : String(v),
  },
  {
    key: 'branch_misses',
    label: 'Branch Misses',
    getValue: (perf: PerfMetrics) => perf.branch_misses ?? 'N/A',
    format: (v) => typeof v === 'number' ? v.toLocaleString() : String(v),
  },
];

/**
 * Helper to format metric label from key
 * Converts snake_case to Title Case
 */
export function formatMetricLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Helper to format metric value
 * Handles numbers, strings, and null/undefined
 */
export function formatMetricValue(value: any): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}
