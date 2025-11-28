import { useRef } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { EditorPanel } from '~/components/editor/EditorPanel';
import { ResultsPanel } from '~/components/benchmark/ResultsPanel';
import { useWorkspace } from '~/contexts/WorkspaceContext';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "~/components/ui/resizable";
import type { ImperativePanelHandle } from 'react-resizable-panels';

interface WorkspaceRowProps {
  /** Show toolbar with Run Benchmark and Compare toggle */
  showToolbar?: boolean;
  /** Callback when Run Benchmark is clicked */
  onRunBenchmark?: () => void;
  /** Loading state for benchmark */
  loading?: boolean;
  /** Callback when Compare/Single View is toggled */
  onToggleCompare?: () => void;
  /** Current compare mode state */
  compareMode?: boolean;
  /** Callback for Run Both (in compare mode) */
  onRunBoth?: () => void;
  /** Loading state for Run Both */
  loadingBoth?: boolean;
}

/**
 * Reusable component representing a single workspace row
 * Contains an editor panel and results panel side by side
 * Now includes optional toolbar for benchmark controls
 */
export function WorkspaceRow({
  showToolbar = false,
  onRunBenchmark,
  loading = false,
  onToggleCompare,
  compareMode = false,
  onRunBoth,
  loadingBoth = false
}: WorkspaceRowProps) {
  const workspace = useWorkspace();
  const editorPanelRef = useRef<ImperativePanelHandle>(null);
  const resultsPanelRef = useRef<ImperativePanelHandle>(null);

  const resetPanels = () => {
    editorPanelRef.current?.resize(50);
    resultsPanelRef.current?.resize(50);
  };

  // Determine which run handler and loading state to use
  const runHandler = compareMode ? onRunBoth : onRunBenchmark;
  const isLoading = compareMode ? loadingBoth : loading;
  const isConnecting = !workspace.benchmark.socketConnected;

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Optional Toolbar */}
      {showToolbar && (
        <div className="px-4 py-2 bg-benchr-bg-header rounded-lg border border-benchr-border shadow-lg flex items-center justify-end gap-3">
          {onToggleCompare && (
            <Button
              onClick={onToggleCompare}
              variant="secondary"
            >
              {compareMode ? 'Single View' : 'Compare'}
            </Button>
          )}

          {runHandler && (
            <Button
              onClick={runHandler}
              disabled={isLoading || isConnecting}
              variant="default"
              className={isConnecting
                ? "bg-benchr-gold/50 text-benchr-text-dark/70 cursor-not-allowed"
                : "bg-benchr-gold text-benchr-text-dark hover:bg-benchr-gold-hover"
              }
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  {compareMode ? 'Run Both' : 'Run Benchmark'}
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Editor and Results Panels */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full gap-4">
          <ResizablePanel ref={editorPanelRef} defaultSize={50} minSize={30}>
            <EditorPanel />
          </ResizablePanel>

          <ResizableHandle withHandle onDoubleClick={resetPanels} />

          <ResizablePanel ref={resultsPanelRef} defaultSize={50} minSize={30}>
            <ResultsPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
