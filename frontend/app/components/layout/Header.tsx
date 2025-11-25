import { Play, Loader2 } from 'lucide-react';
import { Button } from '~/components/ui/button';

interface HeaderProps {
  onRunBenchmark?: () => void;
  onRunBoth?: () => void;
  loading: boolean;
  loadingBoth?: boolean;
  compareMode: boolean;
  onToggleCompare: () => void;
}

export function Header({ 
  onRunBenchmark, 
  onRunBoth, 
  loading, 
  loadingBoth, 
  compareMode, 
  onToggleCompare 
}: HeaderProps) {
  const runHandler = compareMode ? onRunBoth : onRunBenchmark;
  const isLoading = compareMode ? loadingBoth : loading;
  
  return (
    <header className="border-b border-benchr-border bg-benchr-bg-header shadow-lg">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex-1"></div>
        <h1 className="text-xl font-semibold text-benchr-gold">benchr</h1>
        <div className="flex-1 flex items-center justify-end gap-3">
          <Button
            onClick={onToggleCompare}
            variant="secondary"
          >
            {compareMode ? 'Single View' : 'Compare'}
          </Button>
          
          {runHandler && (
            <Button
              onClick={runHandler}
              disabled={isLoading}
              variant="default"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Benchmark
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
