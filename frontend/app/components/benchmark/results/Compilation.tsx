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
    if (/^\s*\|\s*[~;]+\s*$/.test(line)) return false; // Skip suggestion lines like "      |             ;"
    if (/^\s*~+\s*$/.test(trimmed)) return false; // Skip lines with just tildes
    
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
          <h3 className="text-sm font-medium mb-3 text-gray-200">Compilation Result</h3>
          <div className="space-y-3">
            <div className={`${
              jobData.result.compilation.success ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'
            } border rounded-lg p-4`}>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Status:</span>
                <span className={`text-sm font-medium ${
                  jobData.result.compilation.success ? 'text-green-400' : 'text-red-400'
                }`}>
                  {jobData.result.compilation.success ? 'Success' : 'Failed'}
                </span>
              </div>
            </div>
            {jobData.result.compilation.details && (
              <div>
                <h4 className="text-xs font-medium text-gray-400 mb-2">Details</h4>
                <pre className="bg-[#252526] border border-gray-700 rounded p-3 text-sm text-gray-300 overflow-x-auto whitespace-pre-wrap">
                  {!jobData.result.compilation.success 
                    ? cleanCompilerOutput(jobData.result.compilation.details)
                    : jobData.result.compilation.details
                  }
                </pre>
              </div>
            )}
            {jobData.result.compilation.error && (
              <div>
                <h4 className="text-xs font-medium text-red-400 mb-2">Error Message</h4>
                <div className="bg-[#1e1e1e] p-3 rounded text-xs text-red-400 border border-red-900/50">
                  {jobData.result.compilation.error}
                </div>
              </div>
            )}
            {/* Fallback: Show output if error field is empty but compilation failed */}
            {!jobData.result.compilation.success && !jobData.result.compilation.error && jobData.result.output && (
              <div>
                <h4 className="text-xs font-medium text-red-400 mb-2">Compilation Output</h4>
                <pre className="bg-[#1e1e1e] p-3 rounded text-xs text-red-400 border border-red-900/50 overflow-x-auto whitespace-pre-wrap">
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
