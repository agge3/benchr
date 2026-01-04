import type { JobData } from '~/services/api';

export interface SavedRun {
  id: string;
  name: string;
  jobData: JobData;
  savedAt: string;
}

export interface SavedRunsService {
  getAll(): Promise<SavedRun[]>;
  save(run: Omit<SavedRun, 'id' | 'savedAt'>): Promise<SavedRun>;
  delete(id: string): Promise<void>;
}

export const MAX_SAVED_RUNS = 10;
