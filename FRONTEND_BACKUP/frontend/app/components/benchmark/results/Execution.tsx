import type { JobData } from '~/services/api';

interface ExecutionViewProps {
  jobData: JobData;
}

export function ExecutionView({ jobData }: ExecutionViewProps) {
  return (
    <div className="space-y-4">
      {/* Program Output */}
      {jobData.result?.output && (
        <div>
          <h3 className="text-sm font-medium mb-3 text-benchr-text-light">Program Output</h3>
          <pre className="bg-benchr-bg-main text-benchr-status-success p-4 rounded overflow-x-auto font-mono text-sm border border-benchr-border">
            {jobData.result.output}
          </pre>
        </div>
      )}

      {/* Execution Summary */}
      {jobData.result && (
        <div className="bg-benchr-bg-header border border-benchr-border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3 text-benchr-text-light">Execution Details</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <dt className="text-benchr-text-muted">Exit Code:</dt>
            <dd className="font-mono text-benchr-text-light">{jobData.result.exit_code}</dd>

            <dt className="text-benchr-text-muted">Success:</dt>
            <dd className={`font-mono ${jobData.result.success ? 'text-benchr-status-success' : 'text-benchr-status-error'}`}>
              {jobData.result.success ? 'Yes' : 'No'}
            </dd>

            <dt className="text-benchr-text-muted">Timestamp:</dt>
            <dd className="text-benchr-text-light">{new Date(jobData.result.timestamp).toLocaleString()}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}
