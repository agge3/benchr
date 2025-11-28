import type { JobData } from '~/services/api';
import { Metric } from './Metric';

interface OverviewViewProps {
  jobData: JobData;
}

/**
 * Clean up error output for better web display
 */
function cleanOutput(output: string): string {
  let cleaned = output.replace(/\x1b\[[0-9;]*m/g, '');
  const lines = cleaned.split('\n');
  const meaningfulLines = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return false;
    if (/^\s*\|\s*[~;]+\s*$/.test(line)) return false;
    if (/^\s*~+\s*$/.test(trimmed)) return false;
    return true;
  });
  return meaningfulLines.join('\n');
}

export function OverviewView({ jobData }: OverviewViewProps) {
  // XXX Nested JSON.....
  const result = jobData.result?.result || jobData.result;
  if (!result) return null;
  console.log('result:', JSON.stringify(result, null, 2));

  // Determine error state
  const hasCompilationError = result.compilation && !result.compilation.success;
  const hasRuntimeError = result.exit_code !== 0 && !hasCompilationError;
  const hasError = hasCompilationError || hasRuntimeError;
  const hasOutput = result.output && result.output.trim().length > 0;

  // Extract key metrics from result.time object
  const executionTime = result.time?.elapsed_time_total_seconds !== undefined
    ? `${(result.time.elapsed_time_total_seconds * 1000).toFixed(2)} ms`
    : 'N/A';
  
  // Memory is in KB, convert to MB
  const memoryUsage = result.time?.maximum_resident_set_size
    ? `${(result.time.maximum_resident_set_size / 1024).toFixed(2)} MB`
    : 'N/A';
  
  const cacheHitRatio = 'Coming Soon'; // Placeholder for future implementation

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div>
        <h3 className="text-sm font-medium mb-3 text-benchr-text-light">Key Metrics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Metric label="Execution Time" value={executionTime} />
          <Metric label="Memory Usage" value={memoryUsage} />
          <Metric label="Cache Hit Ratio" value={cacheHitRatio} />
        </div>
      </div>

      {/* Output or Error Section */}
      <div>
        {hasError ? (
          // Error State
          <>
            <div className="mb-3 bg-benchr-status-error/20 border-benchr-status-error border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-benchr-status-error">
                  {hasCompilationError ? '⚠️ Compilation Failed' : '⚠️ Runtime Error'}
                </span>
                <span className="text-xs text-benchr-text-muted">
                  Exit Code: {result.exit_code}
                </span>
              </div>
            </div>
            
            <h3 className="text-sm font-medium mb-3 text-benchr-text-light">Error Details</h3>
            <pre className="bg-benchr-bg-header border border-benchr-border rounded p-4 text-sm text-benchr-status-error overflow-x-auto whitespace-pre-wrap font-mono">
              {hasCompilationError
                ? cleanOutput(result.compilation.details || result.compilation.error || 'Unknown compilation error')
                : result.output || 'Program exited with non-zero exit code'}
            </pre>
          </>
        ) : hasOutput ? (
          // Success State with Output
          <>
            <h3 className="text-sm font-medium mb-3 text-benchr-text-light">Program Output</h3>
            <pre className="bg-benchr-bg-main border border-benchr-border rounded p-4 text-sm text-benchr-text-light overflow-x-auto whitespace-pre-wrap font-mono">
              {result.output}
            </pre>
          </>
        ) : (
          // Success but No Output
          <div className="text-center py-6 text-benchr-text-muted text-sm">
            Program executed successfully with no output
          </div>
        )}
      </div>

      {/* Execution Context */}
      <div className="bg-benchr-bg-header border border-benchr-border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3 text-benchr-text-light">Execution Details</h3>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt className="text-benchr-text-muted">Status:</dt>
          <dd className={`font-mono ${
            result.exit_code === 0 ? 'text-benchr-status-success' : 'text-benchr-status-error'
          }`}>
            {result.exit_code === 0 ? 'Success' : 'Failed'}
          </dd>

          <dt className="text-benchr-text-muted">Exit Code:</dt>
          <dd className={`font-mono ${
            result.exit_code === 0 ? 'text-benchr-status-success' : 'text-benchr-status-error'
          }`}>
            {result.exit_code}
          </dd>

          <dt className="text-benchr-text-muted">Language:</dt>
          <dd className="font-mono text-benchr-text-light">
            {result.metadata?.language || 'Unknown'}
          </dd>

          {result.metadata?.compiler && (
            <>
              <dt className="text-benchr-text-muted">Compiler:</dt>
              <dd className="font-mono text-benchr-text-light">
                {result.metadata.compiler}
              </dd>
            </>
          )}

          {result.metadata?.interpreter && (
            <>
              <dt className="text-benchr-text-muted">Interpreter:</dt>
              <dd className="font-mono text-benchr-text-light">
                {result.metadata.interpreter}
              </dd>
            </>
          )}

          <dt className="text-benchr-text-muted">CPU Usage:</dt>
          <dd className="font-mono text-benchr-text-light">
            {result.time?.cpu_percent !== undefined ? `${result.time.cpu_percent}%` : 'N/A'}
          </dd>

          <dt className="text-benchr-text-muted">Timestamp:</dt>
          <dd className="text-benchr-text-light">
            {new Date(result.timestamp).toLocaleString()}
          </dd>
        </dl>
      </div>
    </div>
  );
}
