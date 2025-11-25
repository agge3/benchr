import type { JobData } from '~/services/api';
import { Metric } from '../Metric';
import { formatBytes } from '~/utils/format';

interface OverviewViewProps {
  jobData: JobData;
}

export function OverviewView({ jobData }: OverviewViewProps) {
  return (
    <div className="space-y-4">
      {/* Quick Summary */}
      {jobData.result && (
        <div className={`${
          jobData.result.success ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'
        } border rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <span className={`text-lg font-medium ${
                jobData.result.success ? 'text-green-400' : 'text-red-400'
              }`}>
                {jobData.result.success ? '✓ Success' : '✗ Failed'}
              </span>
              <span className="text-sm text-gray-400">
                Exit Code: <span className="font-mono text-gray-200">{jobData.result.exit_code}</span>
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {new Date(jobData.result.timestamp).toLocaleString()}
            </div>
          </div>
          
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric
              label="Execution Time"
              value={`${jobData.result.time?.elapsed_time_total_seconds?.toFixed(3) || 'N/A'}s`}
            />
            <Metric
              label="CPU Usage"
              value={`${jobData.result.time?.cpu_percent || 0}%`}
            />
            <Metric
              label="Memory (RSS)"
              value={formatBytes((jobData.result.time?.maximum_resident_set_size || 0) * 1024)}
            />
            <Metric
              label="Language"
              value={jobData.result.metadata?.language || 'N/A'}
            />
          </div>
        </div>
      )}

      {/* Metadata */}
      {jobData.result?.metadata && (
        <div className="bg-[#252526] border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3 text-gray-200">Environment</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <dt className="text-gray-400">Language:</dt>
            <dd className="font-mono text-gray-200">{jobData.result.metadata.language}</dd>

            {jobData.result.metadata.interpreter && (
              <>
                <dt className="text-gray-400">Interpreter:</dt>
                <dd className="font-mono text-gray-200">{jobData.result.metadata.interpreter}</dd>
              </>
            )}

            {jobData.result.metadata.compiler && (
              <>
                <dt className="text-gray-400">Compiler:</dt>
                <dd className="font-mono text-gray-200">{jobData.result.metadata.compiler}</dd>
              </>
            )}

            {jobData.result.metadata.opts && (
              <>
                <dt className="text-gray-400">Options:</dt>
                <dd className="font-mono text-gray-200">{jobData.result.metadata.opts}</dd>
              </>
            )}

            <dt className="text-gray-400">Source Size:</dt>
            <dd className="text-gray-200">{formatBytes(jobData.result.metadata.source_size_bytes)}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}
