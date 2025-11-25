import { useState } from 'react';
import benchmarkService from '~/services/api';
import type { BenchmarkPayload, JobData } from '~/services/api';
import type { EditorConfig } from '~/types/benchmark';
import { POLLING_CONFIG } from '~/constants/benchmark';

/**
 * Custom hook to handle benchmark operations with polling
 */
export function useBenchmark(editorConfig: EditorConfig) {
  const [loading, setLoading] = useState(false);
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [pollAttempts, setPollAttempts] = useState(0);
  const [cancelledRef, setCancelledRef] = useState({ current: false });

  const pollForResults = async (jobId: int, maxAttempts = POLLING_CONFIG.MAX_ATTEMPTS) => {
    let attempts = 0;

    const poll = async (): Promise<JobData | null> => {
      // Check if user cancelled - stop immediately
      if (cancelledRef.current) {
        return null;
      }

      attempts++;
      setPollAttempts(attempts);

      try {
        // Poll the specific job by ID
        const job = await benchmarkService.getJobById(jobId);

        // Check again after async call
        if (cancelledRef.current) {
          return null;
        }

        if (!job) {
          // Job not found yet - keep polling
          console.log(`Polling ${attempts}/${maxAttempts} - Job not found yet, retrying...`);

          if (attempts >= maxAttempts) {
            throw new Error('Polling timeout - job took too long');
          }

          await new Promise(resolve => setTimeout(resolve, POLLING_CONFIG.POLL_INTERVAL_MS));
          return poll();
        }

        // Check if job is complete (has perf metrics or failed)
        if (job.status === 'completed' && job.result) {
          console.log('Job completed with metrics:', job.result);
          return job;
        }

        // Check for compilation failure - stop polling and return the job with error
        if (job.result && job.result.compilation && !job.result.compilation.success) {
          console.log('Compilation failed:', job.result.compilation);
          return job; // Return job even with compilation failure so we can display the error
        }

        if (job.status === 'failed') {
          console.log('Job failed:', job);
          return job; // Return the job so we can show the error details
        }

        // Still processing - poll again
        if (attempts >= maxAttempts) {
          throw new Error('Polling timeout - job took too long');
        }

        console.log(`Polling ${attempts}/${maxAttempts} - Status: ${job.status}`);

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, POLLING_CONFIG.POLL_INTERVAL_MS));
        return poll(); // Recursive poll

      } catch (err) {
        // Check if cancelled
        if (cancelledRef.current) {
          return null;
        }

        // If it's an axios error (network/500 error), keep polling
        if (attempts < maxAttempts) {
          console.log(`Polling ${attempts}/${maxAttempts} - Error occurred, retrying...`, err);
          await new Promise(resolve => setTimeout(resolve, POLLING_CONFIG.POLL_INTERVAL_MS));
          return poll(); // Keep polling even on errors
        }

        // Only throw if we've exhausted all attempts
        throw new Error('Polling failed after maximum attempts');
      }
    };

    return poll();
  };

  const handleRunBenchmark = async () => {
    setLoading(true);
    setError(null);
    setCancelled(false);
    setJobData(null);
    setPollAttempts(0);
    setCancelledRef({ current: false });

    try {
      // Step 1: Submit the job
      const payload: BenchmarkPayload = {
        code: editorConfig.code,
        lang: editorConfig.language,
        compiler: editorConfig.compiler,
        opts: editorConfig.opts
      };

      const result = await benchmarkService.submitJob(payload);
      console.log('Job submitted:', result.job_id);

      // Step 2: Poll for results
      const completedJob = await pollForResults(result.job_id);

      // Only set job data if not cancelled and job exists
      if (completedJob && !cancelledRef.current) {
        setJobData(completedJob);
      } else if (cancelledRef.current) {
        // User cancelled - show cancelled state
        setCancelled(true);
      }

    } catch (err) {
      // Only show error if not cancelled
      if (!cancelledRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to run benchmark';
        console.error('Benchmark error:', errorMessage);
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
      setPollAttempts(0);
    }
  };

  const handleCancel = () => {
    console.log('User cancelled benchmark');
    setCancelledRef({ current: true });
    setLoading(false);
    setCancelled(true);
    setPollAttempts(0);
  };

  return {
    handleRunBenchmark,
    handleCancel,
    loading,
    jobData,
    error,
    cancelled,
    pollAttempts
  };
}
