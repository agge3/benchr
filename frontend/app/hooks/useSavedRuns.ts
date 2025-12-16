import { useState, useEffect, useCallback } from 'react';
import type { SavedRun } from '~/types/savedRun.types';
import { MAX_SAVED_RUNS } from '~/types/savedRun.types';
import { savedRunsService } from '~/services/savedRuns';
import type { JobData } from '~/services/api';

interface UseSavedRunsReturn {
  runs: SavedRun[];
  loading: boolean;
  error: string | null;
  saveRun: (name: string, jobData: JobData) => Promise<SavedRun | null>;
  deleteRun: (id: string) => Promise<void>;
  canSaveMore: boolean;
}

/**
 * Hook for managing saved benchmark runs
 * Fetches on mount and caches locally, updates cache on mutations
 */
export function useSavedRuns(): UseSavedRunsReturn {
  const [runs, setRuns] = useState<SavedRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch saved runs on mount
  useEffect(() => {
    let mounted = true;

    async function fetchRuns() {
      try {
        const savedRuns = await savedRunsService.getAll();
        if (mounted) {
          setRuns(savedRuns);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load saved runs');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchRuns();

    return () => {
      mounted = false;
    };
  }, []);

  const saveRun = useCallback(async (name: string, jobData: JobData): Promise<SavedRun | null> => {
    try {
      const newRun = await savedRunsService.save({ name, jobData });
      // Update cache - add to beginning, enforce max
      setRuns(prev => [newRun, ...prev].slice(0, MAX_SAVED_RUNS));
      return newRun;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save run');
      return null;
    }
  }, []);

  const deleteRun = useCallback(async (id: string): Promise<void> => {
    try {
      await savedRunsService.delete(id);
      // Update cache
      setRuns(prev => prev.filter(run => run.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete run');
    }
  }, []);

  return {
    runs,
    loading,
    error,
    saveRun,
    deleteRun,
    canSaveMore: runs.length < MAX_SAVED_RUNS,
  };
}
