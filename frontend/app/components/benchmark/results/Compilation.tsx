import type { JobData } from '~/services/api';

interface CompilationViewProps {
  jobData: JobData;
}

/**
 * Clean up compiler error output for better web display
 * Removes ANSI codes and formats multi-line error messages
 */
function cleanCompilerOutput(output: string): string {
  // Remove ANSI escape codes
  let cleaned = output.replace(/\x1b\[[0-9;]*m/g, '');

  // Split by actual newlines
  const lines = cleaned.split('\n');

  const meaningfulLines = lines.filter(line => {
    const trimmed = line.trim();
    // Skip empty lines
    if (trimmed.length === 0) return false;

    // Keep lines with actual content (error messages, code, line numbers with |)
    // Keep lines with ^ caret that shows error position
    // Skip lines that are ONLY | or ~ or ;
    if (/^\s*\|\s*[~;]+\s*$/.test(line)) return false;
    if (/^\s*~+\s*$/.test(trimmed)) return false;

    return true;
  });

  return meaningfulLines.join('\n');
}

export function CompilationView({ jobData }: CompilationViewProps) {
  return (
    <div className="space-y-4">
      {/* Compilation Info */}
      {jobData.result?.compilation && (
        <div>
          <h3 className="text-sm font-medium mb-3 text-benchr-text-light">Compilation Result</h3>
          <div className="space-y-3">
            <div className={`${
              jobData.result.compilation.success 
                ? 'bg-benchr-status-success/20 border-benchr-status-success' 
                : 'bg-benchr-status-error/20 border-benchr-status-error'
            } border rounded-lg p-4`}>
              <div className="flex items-center gap-2">
                <span className="text-xs text-benchr-text-muted">Status:</span>
                <span className={`text-sm font-medium ${
                  jobData.result.compilation.success ? 'text-benchr-status-success' : 'text-benchr-status-error'
                }`}>
                  {jobData.result.compilation.success ? 'Success' : 'Failed'}
                </span>
              </div>
            </div>
            {jobData.result.compilation.details && (
              <div>
                <h4 className="text-xs font-medium text-benchr-text-muted mb-2">Details</h4>
                <pre className="bg-benchr-bg-header border border-benchr-border rounded p-3 text-sm text-benchr-text-light overflow-x-auto whitespace-pre-wrap">
                  {!jobData.result.compilation.success
                    ? cleanCompilerOutput(jobData.result.compilation.details)
                    : jobData.result.compilation.details
                  }
                </pre>
              </div>
            )}
            {jobData.result.compilation.error && (
              <div>
                <h4 className="text-xs font-medium text-benchr-status-error mb-2">Error Message</h4>
                <div className="bg-benchr-bg-main p-3 rounded text-xs text-benchr-status-error border border-benchr-status-error/50">
                  {jobData.result.compilation.error}
                </div>
              </div>
            )}
            {/* Fallback: Show output if error field is empty but compilation failed */}
            {!jobData.result.compilation.success && !jobData.result.compilation.error && jobData.result.output && (
              <div>
                <h4 className="text-xs font-medium text-benchr-status-error mb-2">Compilation Output</h4>
                <pre className="bg-benchr-bg-main p-3 rounded text-xs text-benchr-status-error border border-benchr-status-error/50 overflow-x-auto whitespace-pre-wrap">
                  {cleanCompilerOutput(jobData.result.output)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
