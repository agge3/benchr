import type { JobData } from '~/services/api';
import { Metric } from './Metric';
import { MetricsTable } from './MetricsTable';
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
  // Handle double-nested result structure
  const result = jobData.result?.result || jobData.result;

  return (
    <div className="space-y-4">
      {/* Timing Metrics Grid - Config-Driven */}
      {result?.time && (
        <div>
          <h3 className="text-sm font-medium mb-3 text-benchr-text-light">Timing Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TIMING_METRICS.map(metric => {
              const value = metric.getValue(result.time);
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
      {result?.perf && Object.keys(result.perf).length > 0 && (
        <MetricsTable
          title="Hardware Counters"
          data={result.perf}
          formatLabel={formatMetricLabel}
          formatValue={formatMetricValue}
        />
      )}

      {/* Legacy Perf Data - Config-Driven Table */}
      {!result && jobData.perf && (
        <div>
          <h3 className="text-sm font-medium mb-3 text-benchr-text-light">Performance Metrics (Legacy)</h3>
          <div className="rounded-lg border border-benchr-border overflow-hidden bg-benchr-bg-main shadow-lg">
            <table className="w-full">
              <thead>
                <tr className="bg-benchr-bg-header border-b border-benchr-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-benchr-text-light">Metric</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-benchr-text-light">Value</th>
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
                      className={`hover:bg-benchr-bg-elevated transition-colors ${
                        index < LEGACY_PERF_METRICS.length - 1 ? 'border-b border-benchr-border' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-sm text-benchr-text-muted">
                        {metric.label}
                      </td>
                      <td className="py-3 px-4 text-sm font-mono text-right text-benchr-text-light">
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
