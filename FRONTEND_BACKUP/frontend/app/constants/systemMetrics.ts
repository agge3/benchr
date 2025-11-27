import type { VmStat } from '~/services/api';
import { formatBytes } from '~/utils/format';

/**
 * Configuration for a single system metric display
 */
export interface SystemMetricConfig {
  key: string;
  label: string;
  getValue: (vmstat: VmStat) => string | number;
  format?: (value: any) => string;
  category?: 'process' | 'memory' | 'io' | 'cpu';
}

/**
 * System metrics configuration organized by category
 * Uses vmstat data to display system resource usage
 */
export const SYSTEM_METRICS: SystemMetricConfig[] = [
  // Process Metrics
  {
    key: 'runnable_procs',
    label: 'Runnable Processes',
    getValue: (vm) => vm.runnable_procs ?? 0,
    category: 'process',
  },
  {
    key: 'uninterruptible_sleeping_procs',
    label: 'Sleeping Processes',
    getValue: (vm) => vm.uninterruptible_sleeping_procs ?? 0,
    category: 'process',
  },
  
  // Memory Metrics (in KB, convert to human readable)
  {
    key: 'virtual_mem_used',
    label: 'Virtual Memory Used',
    getValue: (vm) => vm.virtual_mem_used ?? 0,
    format: (v) => formatBytes(v * 1024),
    category: 'memory',
  },
  {
    key: 'free_mem',
    label: 'Free Memory',
    getValue: (vm) => vm.free_mem ?? 0,
    format: (v) => formatBytes(v * 1024),
    category: 'memory',
  },
  {
    key: 'buffer_mem',
    label: 'Buffer Memory',
    getValue: (vm) => vm.buffer_mem ?? 0,
    format: (v) => formatBytes(v * 1024),
    category: 'memory',
  },
  {
    key: 'cache_mem',
    label: 'Cache Memory',
    getValue: (vm) => vm.cache_mem ?? 0,
    format: (v) => formatBytes(v * 1024),
    category: 'memory',
  },
  {
    key: 'active_mem',
    label: 'Active Memory',
    getValue: (vm) => vm.active_mem ?? 0,
    format: (v) => v ? formatBytes(v * 1024) : 'N/A',
    category: 'memory',
  },
  {
    key: 'inactive_mem',
    label: 'Inactive Memory',
    getValue: (vm) => vm.inactive_mem ?? 0,
    format: (v) => v ? formatBytes(v * 1024) : 'N/A',
    category: 'memory',
  },
  
  // I/O Metrics
  {
    key: 'swap_in',
    label: 'Swap In',
    getValue: (vm) => vm.swap_in ?? 0,
    format: (v) => `${v} KB/s`,
    category: 'io',
  },
  {
    key: 'swap_out',
    label: 'Swap Out',
    getValue: (vm) => vm.swap_out ?? 0,
    format: (v) => `${v} KB/s`,
    category: 'io',
  },
  {
    key: 'blocks_in',
    label: 'Blocks In',
    getValue: (vm) => vm.blocks_in ?? 0,
    format: (v) => `${v.toLocaleString()}/s`,
    category: 'io',
  },
  {
    key: 'blocks_out',
    label: 'Blocks Out',
    getValue: (vm) => vm.blocks_out ?? 0,
    format: (v) => `${v.toLocaleString()}/s`,
    category: 'io',
  },
  
  // CPU & System Metrics
  {
    key: 'interrupts',
    label: 'Interrupts',
    getValue: (vm) => vm.interrupts ?? 0,
    format: (v) => `${v.toLocaleString()}/s`,
    category: 'cpu',
  },
  {
    key: 'context_switches',
    label: 'Context Switches',
    getValue: (vm) => vm.context_switches ?? 0,
    format: (v) => `${v.toLocaleString()}/s`,
    category: 'cpu',
  },
  {
    key: 'user_time',
    label: 'User Time',
    getValue: (vm) => vm.user_time ?? 0,
    format: (v) => `${v}%`,
    category: 'cpu',
  },
  {
    key: 'system_time',
    label: 'System Time',
    getValue: (vm) => vm.system_time ?? 0,
    format: (v) => `${v}%`,
    category: 'cpu',
  },
  {
    key: 'idle_time',
    label: 'Idle Time',
    getValue: (vm) => vm.idle_time ?? 0,
    format: (v) => `${v}%`,
    category: 'cpu',
  },
  {
    key: 'io_wait_time',
    label: 'I/O Wait Time',
    getValue: (vm) => vm.io_wait_time ?? 0,
    format: (v) => `${v}%`,
    category: 'cpu',
  },
  {
    key: 'stolen_time',
    label: 'Stolen Time',
    getValue: (vm) => vm.stolen_time ?? 0,
    format: (v) => `${v}%`,
    category: 'cpu',
  },
];

/**
 * Get metrics by category for organized display
 */
export function getMetricsByCategory(category: SystemMetricConfig['category']) {
  return SYSTEM_METRICS.filter(m => m.category === category);
}
