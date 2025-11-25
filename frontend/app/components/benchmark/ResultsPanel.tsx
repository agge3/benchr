import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import type { JobData } from '~/services/api';
import type { Language, ResultView } from '~/types/benchmark';
import { POLLING_CONFIG } from '~/constants/benchmark';
import { getAvailableViews, getViewConfig } from '~/constants/viewConfig';

interface ResultsPanelProps {
  loading: boolean;
  jobData: JobData | null;
  error: string | null;
  cancelled: boolean;
  pollAttempts: number;
  onCancel: () => void;
  language: Language;
}

export function ResultsPanel({
  loading,
  jobData,
  error,
  cancelled,
  pollAttempts,
  onCancel,
  language
}: ResultsPanelProps) {
  const [resultView, setResultView] = useState<ResultView>('overview');

  // Get available views based on language
  const availableViews = getAvailableViews(language);

  // Auto-switch to compilation tab if compilation failed
  useEffect(() => {
    if (jobData?.result?.compilation && !jobData.result.compilation.success) {
      setResultView('compilation');
    }
  }, [jobData]);

  // Find the current view component
  const currentViewConfig = getViewConfig(resultView);
  const CurrentViewComponent = currentViewConfig?.component;

  // Determine what content to show based on state
  const renderContent = () => {
    // Loading state
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#0e639c]" />
          <p className="text-sm text-gray-400">Running benchmark...</p>

          {pollAttempts > POLLING_CONFIG.CANCEL_BUTTON_DELAY_ATTEMPTS && (
            <Button
              onClick={onCancel}
              variant="outline"
              className="mt-4 bg-yellow-500/10 border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/20 hover:text-yellow-700"
            >
              Cancel?
            </Button>
          )}
        </div>
      );
    }

    // Cancelled state
    if (cancelled) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-gray-400">Benchmark cancelled</p>
        </div>
      );
    }

    // Error state
    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-sm font-medium text-red-400 mb-2">Error</p>
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        </div>
      );
    }

    // No data yet
    if (!jobData) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-gray-400">Submit code to get started</p>
        </div>
      );
    }

    // Render the selected view component dynamically
    if (CurrentViewComponent) {
      return <CurrentViewComponent jobData={jobData} language={language} />;
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Header with view tabs */}
      <div className="px-2 sm:px-4 py-2 bg-[#252526] flex items-center gap-3 rounded-lg border border-gray-700 shadow-lg">
        <h2 className="text-xs sm:text-sm font-medium text-[#d4a04c] whitespace-nowrap flex-shrink-0">
          Analysis
        </h2>
        <div className="flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <ToggleGroup
            type="single"
            value={resultView}
            onValueChange={(value) => value && setResultView(value as ResultView)}
            className="flex-nowrap"
          >
            {/* Map over available views instead of hardcoding */}
            {availableViews.map(view => (
              <ToggleGroupItem
                key={view.id}
                value={view.id}
                aria-label={view.label}
                title={view.description}
                className="data-[state=on]:bg-[#3a3d41] data-[state=on]:text-[#d4a04c] data-[state=off]:text-gray-500 hover:bg-[#2d2d30] shadow-md !text-xs sm:!text-sm px-2 sm:px-3 whitespace-nowrap"
              >
                {view.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden rounded-lg border border-gray-700 bg-[#1e1e1e] shadow-xl">
        <div className="p-6 h-full overflow-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
