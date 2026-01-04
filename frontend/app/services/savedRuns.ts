import type { SavedRun, SavedRunsService } from '~/types/savedRun.types';
import { MAX_SAVED_RUNS } from '~/types/savedRun.types';

const STORAGE_KEY = 'benchr_saved_runs';

/**
 * LocalStorage implementation of SavedRunsService
 *
 * TODO: Replace with API implementation:
 * - getAll() -> GET /api/saved-runs
 * - save() -> POST /api/saved-runs
 * - delete() -> DELETE /api/saved-runs/:id
 */
const localStorageService: SavedRunsService = {
  async getAll(): Promise<SavedRun[]> {
    if (typeof window === 'undefined') return [];

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    try {
      return JSON.parse(stored) as SavedRun[];
    } catch {
      return [];
    }
  },

  async save(run: Omit<SavedRun, 'id' | 'savedAt'>): Promise<SavedRun> {
    const runs = await this.getAll();

    // Enforce max limit - remove oldest if at capacity
    if (runs.length >= MAX_SAVED_RUNS) {
      runs.pop(); // Remove oldest (last in array, assuming sorted newest first)
    }

    const newRun: SavedRun = {
      ...run,
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
    };

    // Add to beginning (newest first)
    const updated = [newRun, ...runs];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    return newRun;
  },

  async delete(id: string): Promise<void> {
    const runs = await this.getAll();
    const updated = runs.filter(run => run.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },
};

// Export the current implementation
// When ready for API, create apiService and swap this export
export const savedRunsService: SavedRunsService = localStorageService;
