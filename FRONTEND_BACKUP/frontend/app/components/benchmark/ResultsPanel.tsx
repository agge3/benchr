import { useState } from 'react';
  import { Loader2, WifiOff } from 'lucide-react';
  import { Button } from '~/components/ui/button';
  import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
  import type { ResultView } from '~/types/benchmark';
  import { getAvailableViews, getViewConfig } from '~/constants/viewConfig';
  import { useWorkspace } from '~/contexts/WorkspaceContext';

  export function ResultsPanel() {
    const { editor, benchmark } = useWorkspace();
    const [resultView, setResultView] = useState<ResultView>('overview');

    const availableViews = getAvailableViews(editor.editor.language);
    const currentViewConfig = getViewConfig(resultView);
    const CurrentViewComponent = currentViewConfig?.component;

    const renderContent = () => {
      // Loading state
      if (benchmark.loading) {
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-benchr-gold" />
            <p className="text-sm text-benchr-text-muted">Running benchmark...</p>

            {!benchmark.socketConnected && (
              <div className="flex items-center gap-2 text-benchr-status-warning">
                <WifiOff className="h-4 w-4" />
                <p className="text-sm">Connection lost, waiting to reconnect...</p>
              </div>
            )}

            {benchmark.showCancelButton && (
              <Button
                onClick={benchmark.handleCancel}
                variant="outline"
                className="mt-4 bg-benchr-status-warning/10
  border-benchr-status-warning/50 text-benchr-status-warning
  hover:bg-benchr-status-warning/20"
              >
                Cancel?
              </Button>
            )}
          </div>
        );
      }

      // Cancelled state
      if (benchmark.cancelled) {
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-benchr-text-muted">Benchmark cancelled</p>
          </div>
        );
      }

      // Error state
      if (benchmark.error) {
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm font-medium text-benchr-status-error
  mb-2">Error</p>
              <p className="text-sm text-benchr-text-muted">{benchmark.error}</p>
              <Button
                onClick={benchmark.handleRunBenchmark}
                variant="outline"
                className="mt-4"
              >
                Try again
              </Button>
            </div>
          </div>
        );
      }

      // No data yet
      if (!benchmark.jobData) {
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-benchr-text-muted">Submit code to get
  started</p>
          </div>
        );
      }

      // Render the selected view component dynamically
      if (CurrentViewComponent) {
        return <CurrentViewComponent jobData={benchmark.jobData}
  language={editor.editor.language} />;
      }

      return null;
    };

    return (
      <div className="flex flex-col h-full gap-2">
        {/* Header with view tabs */}
        <div className="px-2 sm:px-4 py-2 bg-benchr-bg-header flex items-center gap-3
   rounded-lg border border-benchr-border shadow-lg">
          <h2 className="text-xs sm:text-sm font-medium text-benchr-gold-accent
  whitespace-nowrap flex-shrink-0">
            Analysis
          </h2>
          <div className="flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden
  [-ms-overflow-style:none] [scrollbar-width:none]">
            <ToggleGroup
              type="single"
              value={resultView}
              onValueChange={(value) => value && setResultView(value as ResultView)}
              className="flex-nowrap"
            >
              {availableViews.map((view) => (
                <ToggleGroupItem
                  key={view.id}
                  value={view.id}
                  aria-label={view.label}
                  title={view.description}
                  className="data-[state=on]:bg-benchr-bg-elevated
  data-[state=on]:text-benchr-gold-accent data-[state=off]:text-benchr-text-muted
  hover:bg-benchr-bg-elevated/80 shadow-md !text-xs sm:!text-sm px-2 sm:px-3
  whitespace-nowrap"
                >
                  {view.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden rounded-lg border border-benchr-border
   bg-benchr-bg-main shadow-xl">
          <div className="p-6 h-full overflow-auto">{renderContent()}</div>
        </div>
      </div>
    );
  }
