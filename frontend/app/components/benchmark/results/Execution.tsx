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
          <h3 className="text-sm font-medium mb-3 text-gray-200">Program Output</h3>
          <pre className="bg-[#1e1e1e] text-green-400 p-4 rounded overflow-x-auto font-mono text-sm border border-gray-700">
            {jobData.result.output}
          </pre>
        </div>
      )}

      {/* Execution Summary */}
      {jobData.result && (
        <div className="bg-[#252526] border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium mb-3 text-gray-200">Execution Details</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <dt className="text-gray-400">Exit Code:</dt>
            <dd className="font-mono text-gray-200">{jobData.result.exit_code}</dd>
            
            <dt className="text-gray-400">Success:</dt>
            <dd className={`font-mono ${jobData.result.success ? 'text-green-400' : 'text-red-400'}`}>
              {jobData.result.success ? 'Yes' : 'No'}
            </dd>
            
            <dt className="text-gray-400">Timestamp:</dt>
            <dd className="text-gray-200">{new Date(jobData.result.timestamp).toLocaleString()}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}
