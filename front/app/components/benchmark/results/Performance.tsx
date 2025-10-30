import type { JobData } from '~/services/api';
import { Metric } from '../Metric';
import { MetricsTable } from '../MetricsTable';
import { 
  TIMING_METRICS, 
  LEGACY_PERF_METRICS,
  formatMetricLabel,
  formatMetricValue 
} from '~/constants/performanceMetrics';

interface PerformanceViewProps {
  jobData: JobData;
}

export function PerformanceView({ jobData }: PerformanceViewProps) {
  return (
    <div className="space-y-4">
      {/* Timing Metrics Grid - Config-Driven */}
      {jobData.result?.time && (
        <div>
          <h3 className="text-sm font-medium mb-3 text-gray-200">Timing Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TIMING_METRICS.map(metric => {
              const value = metric.getValue(jobData.result.time);
              const displayValue = metric.format 
                ? metric.format(value)
                : String(value);
              
              return (
                <Metric
                  key={metric.key}
                  label={metric.label}
                  value={displayValue}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Hardware Counters - Dynamic Table */}
      {jobData.result?.perf && Object.keys(jobData.result.perf).length > 0 && (
        <MetricsTable
          title="Hardware Counters"
          data={jobData.result.perf}
          formatLabel={formatMetricLabel}
          formatValue={formatMetricValue}
        />
      )}

      {/* Legacy Perf Data - Config-Driven Table */}
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
                {LEGACY_PERF_METRICS.map((metric, index) => {
                  const value = metric.getValue(jobData.perf);
                  const displayValue = metric.format 
                    ? metric.format(value)
                    : String(value);
                  
                  return (
                    <tr 
                      key={metric.key}
                      className={`hover:bg-[#2a2d2e] transition-colors ${
                        index < LEGACY_PERF_METRICS.length - 1 ? 'border-b border-gray-700' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {metric.label}
                      </td>
                      <td className="py-3 px-4 text-sm font-mono text-right text-gray-200">
                        {displayValue}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
