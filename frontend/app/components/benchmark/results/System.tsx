import type { JobData } from '~/services/api';
import { Metric } from '../Metric';
import { SYSTEM_METRICS, getMetricsByCategory } from '~/constants/systemMetrics';

interface SystemViewProps {
  jobData: JobData;
}

export function SystemView({ jobData }: SystemViewProps) {
  // Get the first vmstat snapshot (most recent)
  const vmstat = jobData.result?.vmstat?.[0];

  if (!vmstat) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-gray-400">No system statistics available</p>
      </div>
    );
  }

  // Organize metrics by category
  const processMetrics = getMetricsByCategory('process');
  const memoryMetrics = getMetricsByCategory('memory');
  const ioMetrics = getMetricsByCategory('io');
  const cpuMetrics = getMetricsByCategory('cpu');

  return (
    <div className="space-y-6">
      {/* Process Metrics */}
      {processMetrics.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3 text-gray-200">Process Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {processMetrics.map(metric => {
              const value = metric.getValue(vmstat);
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

      {/* Memory Metrics */}
      {memoryMetrics.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3 text-gray-200">Memory Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {memoryMetrics.map(metric => {
              const value = metric.getValue(vmstat);
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

      {/* I/O Metrics */}
      {ioMetrics.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3 text-gray-200">I/O Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {ioMetrics.map(metric => {
              const value = metric.getValue(vmstat);
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

      {/* CPU Metrics */}
      {cpuMetrics.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3 text-gray-200">CPU Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {cpuMetrics.map(metric => {
              const value = metric.getValue(vmstat);
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
    </div>
  );
}
