import { createContext, useContext, type ReactNode } from 'react';
import { useSavedRuns } from '~/hooks/useSavedRuns';

type SavedRunsContextValue = ReturnType<typeof useSavedRuns>;

const SavedRunsContext = createContext<SavedRunsContextValue | null>(null);

export function SavedRunsProvider({ children }: { children: ReactNode }) {
  const savedRuns = useSavedRuns();

  return (
    <SavedRunsContext.Provider value={savedRuns}>
      {children}
    </SavedRunsContext.Provider>
  );
}

export function useSavedRunsContext() {
  const context = useContext(SavedRunsContext);
  if (!context) {
    throw new Error('useSavedRunsContext must be used within SavedRunsProvider');
  }
  return context;
}
