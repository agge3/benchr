import { Trash2 } from 'lucide-react';
import type { SavedRun } from '~/types/savedRun.types';
import { cn } from '~/lib/utils';

interface SavedRunsListProps {
  runs: SavedRun[];
  loading: boolean;
  onDelete: (id: string) => void;
  onSelect?: (run: SavedRun) => void;
}

/**
 * Displays a list of saved benchmark runs
 * Only renders boxes for runs that exist (no empty placeholders)
 */
export function SavedRunsList({ runs, loading, onDelete, onSelect }: SavedRunsListProps) {
  if (loading) {
    return (
      <div className="py-4 text-sm text-benchr-gold animate-pulse">
        Loading saved runs...
      </div>
    );
  }

  if (runs.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {runs.map((run) => (
        <SavedRunItem
          key={run.id}
          run={run}
          onDelete={() => onDelete(run.id)}
          onSelect={onSelect ? () => onSelect(run) : undefined}
        />
      ))}
    </div>
  );
}

interface SavedRunItemProps {
  run: SavedRun;
  onDelete: () => void;
  onSelect?: () => void;
}

function SavedRunItem({ run, onDelete, onSelect }: SavedRunItemProps) {
  const formattedDate = new Date(run.savedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={cn(
        "group relative p-3 rounded-md border border-benchr-border bg-benchr-bg-main",
        "hover:border-benchr-gold/50 transition-colors",
        onSelect && "cursor-pointer"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-benchr-gold truncate">
            {run.name}
          </div>
          <div className="text-xs text-benchr-text-secondary mt-1">
            {run.jobData.lang} • {formattedDate}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-benchr-text-secondary hover:text-red-400 transition-all"
          aria-label="Delete saved run"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
