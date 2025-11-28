import { useParams, useNavigate } from 'react-router';
import { useRef, useEffect } from 'react';
import { Play, FlaskConical, Upload, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { ProblemEditorPanel } from '~/components/problem/ProblemEditorPanel';
import { ProblemPanel } from '~/components/problem/ProblemPanel';
import { OutputPanel } from '~/components/problem/OutputPanel';
import { ProblemProvider, useProblem } from '~/contexts/ProblemContext';
import { useWebSocketContext } from '~/contexts/WebSocketContext';
import { getProblemById } from '~/constants/problems';
import { ErrorBoundary } from '~/components/ui/ErrorBoundary';
import benchmarkService from '~/services/api';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "~/components/ui/resizable";

function ProblemToolbar() {
  const problem = useProblem();
  const ws = useWebSocketContext();
  const currentJobRef = useRef<{ id: string; type: 'code' | 'test' } | null>(null);

  const isConnecting = !ws.connected;
  const isRunning = problem.isRunningCode || problem.isRunningTests;

  // Handle Run Code - executes user's code as-is
  const handleRunCode = async () => {
    if (!ws.connected) return;

    problem.setIsRunningCode(true);
    try {
      const payload = problem.getRunCodePayload();
      const result = await benchmarkService.submitJob(payload);
      currentJobRef.current = { id: String(result.job_id), type: 'code' };
      ws.subscribe(String(result.job_id));
    } catch (err) {
      problem.setIsRunningCode(false);
    }
  };

  // Handle Run Tests - executes user's function with test harness
  const handleRunTests = async () => {
    if (!ws.connected) return;

    problem.setIsRunningTests(true);
    try {
      const payload = problem.getTestCodePayload();
      const result = await benchmarkService.submitJob(payload);
      currentJobRef.current = { id: String(result.job_id), type: 'test' };
      ws.subscribe(String(result.job_id));
    } catch (err) {
      problem.setIsRunningTests(false);
    }
  };

  // Listen for job completion
  useEffect(() => {
    const unsubscribe = ws.onJobComplete(async (completedJobId: string) => {
      if (!currentJobRef.current || completedJobId !== currentJobRef.current.id) {
        return;
      }

      try {
        const jobData = await benchmarkService.getJobById(completedJobId);
        if (currentJobRef.current.type === 'code') {
          problem.processRunCodeResult(jobData);
        } else {
          problem.processTestResult(jobData);
        }
      } catch (err) {
        problem.setIsRunningCode(false);
        problem.setIsRunningTests(false);
      }

      currentJobRef.current = null;
    });

    return unsubscribe;
  }, [ws, problem]);

  return (
    <div className="px-4 py-2 bg-benchr-bg-header rounded-lg border border-benchr-border shadow-lg flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="text-benchr-text-muted hover:text-benchr-text-light"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <span className="text-benchr-text-light font-medium">{problem.problem.title}</span>
      </div>

      <div className="flex items-center gap-3">
        {isConnecting ? (
          <div className="flex items-center gap-2 text-benchr-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Connecting...</span>
          </div>
        ) : (
          <>
            {/* Run Code - execute user's code as-is */}
            <Button
              onClick={handleRunCode}
              disabled={isRunning}
              variant="secondary"
              className="bg-benchr-bg-elevated border-benchr-border text-benchr-gold-accent hover:bg-benchr-gold-accent hover:text-benchr-bg-main"
            >
              {problem.isRunningCode ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Code
                </>
              )}
            </Button>

            {/* Run Tests - execute with test harness */}
            <Button
              onClick={handleRunTests}
              disabled={isRunning}
              variant="secondary"
              className="bg-benchr-bg-elevated border-benchr-border text-benchr-gold-accent hover:bg-benchr-gold-accent hover:text-benchr-bg-main"
            >
              {problem.isRunningTests ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <FlaskConical className="h-4 w-4 mr-2" />
                  Run Tests
                </>
              )}
            </Button>

            {/* Submit Benchmark - only enabled after tests pass */}
            <Button
              onClick={problem.submitBenchmark}
              disabled={!problem.canSubmit || problem.isSubmitting}
              variant="default"
              className={problem.canSubmit
                ? "bg-benchr-gold text-benchr-text-dark hover:bg-benchr-gold-hover"
                : "bg-benchr-gold/50 text-benchr-text-dark/70 cursor-not-allowed"
              }
            >
              {problem.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Submit Benchmark
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function ProblemWorkspace() {
  return (
    <div className="flex flex-col h-full gap-2">
      <ProblemToolbar />

      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full gap-2">
          {/* Left: Code Editor (full height) */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <ProblemEditorPanel />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right: Problem Panel + Output Panel (stacked vertically) */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <ResizablePanelGroup direction="vertical" className="h-full gap-2">
              <ResizablePanel defaultSize={60} minSize={20}>
                <ProblemPanel />
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={40} minSize={15}>
                <OutputPanel />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

export default function ProblemPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const problemId = parseInt(id || '0', 10);
  const problem = getProblemById(problemId);

  if (!problem) {
    return (
      <div className="h-full flex items-center justify-center bg-benchr-bg-main">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-benchr-text-light mb-2">Problem Not Found</h1>
          <p className="text-benchr-text-muted mb-4">The problem you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/problems')}>
            Back to Problems
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col bg-benchr-bg-main p-4">
        <ProblemProvider problem={problem}>
          <ProblemWorkspace />
        </ProblemProvider>
      </div>
    </ErrorBoundary>
  );
}
