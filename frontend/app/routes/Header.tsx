import { Button } from '~/components/ui/button';
import { Play } from 'lucide-react';

interface HeaderProps {
  isRunning: boolean;
  onRunBenchmark: () => void;
}

export const Header = ({ isRunning, onRunBenchmark }: HeaderProps) => (
  <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold text-gray-900">Code Benchmark</h1>
      <Button
        onClick={onRunBenchmark}
        disabled={isRunning}
        className="flex items-center gap-2"
      >
        <Play className="w-4 h-4" />
        {isRunning ? 'Running...' : 'Run Benchmark'}
      </Button>
    </div>
  </header>
);
