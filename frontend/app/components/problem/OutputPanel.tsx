import { useState, useEffect } from 'react';
import { useProblem } from '~/contexts/ProblemContext';
import { CheckCircle, XCircle, Terminal, FlaskConical } from 'lucide-react';

type OutputTab = 'output' | 'testcases';

export function OutputPanel() {
  const {
    runCodeOutput,
    testResults,
    isRunningCode,
    isRunningTests,
    problem
  } = useProblem();

  const [activeTab, setActiveTab] = useState<OutputTab>('output');

  const hasRunCodeOutput = runCodeOutput !== null;
  const hasTestResults = testResults.length > 0;
  const allTestsPassed = testResults.length > 0 && testResults.every(r => r.passed);

  // Auto-switch tabs based on what's running
  useEffect(() => {
    if (isRunningCode) {
      setActiveTab('output');
    }
  }, [isRunningCode]);

  useEffect(() => {
    if (isRunningTests) {
      setActiveTab('testcases');
    }
  }, [isRunningTests]);

  return (
    <div className="flex flex-col h-full">
      {/* Header with Tabs */}
      <div className="px-2 py-1 bg-benchr-bg-header flex items-center justify-between rounded-t-lg border border-benchr-border">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('output')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'output'
                ? 'bg-benchr-bg-elevated text-benchr-gold-accent'
                : 'text-benchr-text-muted hover:text-benchr-text-light'
            }`}
          >
            <Terminal className="h-3 w-3" />
            Output
          </button>
          <button
            onClick={() => setActiveTab('testcases')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'testcases'
                ? 'bg-benchr-bg-elevated text-benchr-gold-accent'
                : 'text-benchr-text-muted hover:text-benchr-text-light'
            }`}
          >
            <FlaskConical className="h-3 w-3" />
            Test Cases
            {hasTestResults && (
              <span className={`ml-1 ${allTestsPassed ? 'text-green-400' : 'text-red-400'}`}>
                ({testResults.filter(r => r.passed).length}/{testResults.length})
              </span>
            )}
          </button>
        </div>

        {/* Status indicator */}
        {activeTab === 'testcases' && hasTestResults && !isRunningTests && (
          <div className={`flex items-center gap-1 text-xs ${allTestsPassed ? 'text-green-400' : 'text-red-400'}`}>
            {allTestsPassed ? (
              <>
                <CheckCircle className="h-3 w-3" />
                <span>All passed</span>
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" />
                <span>{testResults.filter(r => !r.passed).length} failed</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-benchr-bg-main rounded-b-lg border border-t-0 border-benchr-border p-3">
        {/* Output Tab */}
        {activeTab === 'output' && (
          <>
            {isRunningCode && (
              <div className="flex items-center gap-2 text-benchr-text-muted">
                <Terminal className="h-4 w-4 animate-pulse" />
                <span>Running code...</span>
              </div>
            )}

            {!isRunningCode && !hasRunCodeOutput && (
              <div className="text-benchr-text-muted text-sm">
                Run your code to see output here.
              </div>
            )}

            {!isRunningCode && hasRunCodeOutput && (
              <pre className="p-3 bg-benchr-bg-elevated rounded-lg border border-benchr-border text-sm font-mono text-benchr-text-light whitespace-pre-wrap">
                {runCodeOutput || '(no output)'}
              </pre>
            )}
          </>
        )}

        {/* Test Cases Tab */}
        {activeTab === 'testcases' && (
          <>
            {isRunningTests && (
              <div className="flex items-center gap-2 text-benchr-text-muted">
                <FlaskConical className="h-4 w-4 animate-pulse" />
                <span>Running tests...</span>
              </div>
            )}

            {!isRunningTests && !hasTestResults && (
              <div className="text-benchr-text-muted text-sm">
                Run tests to see results here.
              </div>
            )}

            {!isRunningTests && hasTestResults && (
              <div className="space-y-2">
                {testResults.map((result, index) => {
                  const example = problem.examples[index];
                  return (
                    <div
                      key={index}
                      className={`p-2 rounded-lg border ${
                        result.passed
                          ? 'bg-green-500/5 border-green-500/30'
                          : 'bg-red-500/5 border-red-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-benchr-text-light">
                          Test Case {index + 1}
                        </span>
                        {result.passed ? (
                          <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-400" />
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex gap-2">
                          <span className="text-benchr-text-muted w-16 shrink-0">Input:</span>
                          <pre className="flex-1 p-1.5 bg-benchr-bg-header rounded font-mono text-benchr-text-light overflow-x-auto">
                            {example?.input}
                          </pre>
                        </div>

                        <div className="flex gap-2">
                          <span className="text-benchr-text-muted w-16 shrink-0">Expected:</span>
                          <pre className="flex-1 p-1.5 bg-benchr-bg-header rounded font-mono text-benchr-text-light overflow-x-auto">
                            {example?.expectedOutput}
                          </pre>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
