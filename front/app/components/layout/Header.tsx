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
    <header className="border-b border-gray-700 bg-[#252526] shadow-lg">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex-1"></div>

        <h1 className="text-xl font-semibold text-[#f9d262]">benchr</h1>

        <div className="flex-1 flex items-center justify-end gap-3">
          <Button
            onClick={onToggleCompare}
            className="bg-[#3a3d41] hover:bg-[#4a4d51] text-gray-200 border-0 shadow-lg font-medium"
          >
            {compareMode ? 'Single View' : 'Compare'}
          </Button>
          
          {runHandler && (
            <Button
              onClick={runHandler}
              disabled={isLoading}
              className="bg-[#d4a04c] hover:bg-[#e0b05f] text-[#1e1e1e] border-0 shadow-lg font-medium"
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
