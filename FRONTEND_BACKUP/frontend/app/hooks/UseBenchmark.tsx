import { useState, useEffect, useRef, useCallback } from 'react';
import benchmarkService from '~/services/api';
import type { BenchmarkPayload, JobData } from '~/services/api';
import type { EditorConfig } from '~/types/benchmark';
import type { WebSocketHook } from './useWebSocket';

const CANCEL_BUTTON_DELAY_MS = 3000;
const JOB_TIMEOUT_MS = 30000;

export function useBenchmark(editorConfig: EditorConfig, ws: WebSocketHook) {
  const [loading, setLoading] = useState(false);
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [showCancelButton, setShowCancelButton] = useState(false);

  // Refs to track current job and timers
  const currentJobId = useRef<string | null>(null);
  const cancelTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Cleanup function to clear timers and reset UI state
  const cleanup = useCallback(() => {
    if (cancelTimerRef.current) {
      clearTimeout(cancelTimerRef.current);
      cancelTimerRef.current = null;
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setShowCancelButton(false);
  }, []);

  // Full reset
  const reset = useCallback(() => {
    currentJobId.current = null;
    cleanup();
  }, [cleanup]);

  const handleRunBenchmark = async () => {
    // Check socket connection before starting
    if (!ws.connected) {
      setError('Connection lost. Please refresh the page.');
      return;
    }

    // Clean up any previous run
    reset();

    // Reset state for new run
    setLoading(true);
    setError(null);
    setCancelled(false);
    setJobData(null);

    // Start timer for cancel button (shows after 3s)
    cancelTimerRef.current = setTimeout(() => {
      setShowCancelButton(true);
    }, CANCEL_BUTTON_DELAY_MS);

    try {
      const payload: BenchmarkPayload = {
        code: editorConfig.code,
        lang: editorConfig.language,
        compiler: editorConfig.compiler,
        opts: editorConfig.opts,
      };

      const result = await benchmarkService.submitJob(payload);
      currentJobId.current = result.job_id;

      // Start timeout timer (fails after 30s)
      timeoutTimerRef.current = setTimeout(() => {
        if (currentJobId.current === result.job_id) {
          setError('Benchmark timed out. The server may be overloaded.');
          cleanup();
          setLoading(false);
          currentJobId.current = null;
        }
      }, JOB_TIMEOUT_MS);

      // Subscribe to WebSocket for this job
      ws.subscribe(result.job_id);

      // Listen for completion
      unsubscribeRef.current = ws.onJobComplete(async (completedJobId: string) => {
        // Ignore if this isn't our current job (stale notification)
        if (completedJobId !== currentJobId.current) {
          return;
        }

        // Clear timeout since we got a response
        if (timeoutTimerRef.current) {
          clearTimeout(timeoutTimerRef.current);
          timeoutTimerRef.current = null;
        }

        try {
          const completedJob = await benchmarkService.getJobById(currentJobId.current!);
          setJobData(completedJob);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to fetch result';
          setError(errorMessage);
        } finally {
          cleanup();
          setLoading(false);
          currentJobId.current = null;
        }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run benchmark';
      setError(errorMessage);
      cleanup();
      setLoading(false);
      currentJobId.current = null;
    }
  };

  const handleCancel = () => {
    reset();
    setLoading(false);
    setCancelled(true);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  return {
    handleRunBenchmark,
    handleCancel,
    loading,
    jobData,
    error,
    cancelled,
    showCancelButton,
    socketConnected: ws.connected,
  };
}
