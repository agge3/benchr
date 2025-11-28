import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import { useProblem } from '~/contexts/ProblemContext';
import { DescriptionView } from './views/DescriptionView';
import { LeaderboardView } from './views/LeaderboardView';
import { DiscussionView } from './views/DiscussionView';

const tabs = [
  { id: 'description', label: 'Description' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'discussion', label: 'Discussion' },
] as const;

export function ProblemPanel() {
  const { activeTab, setActiveTab } = useProblem();

  const renderContent = () => {
    switch (activeTab) {
      case 'description':
        return <DescriptionView />;
      case 'leaderboard':
        return <LeaderboardView />;
      case 'discussion':
        return <DiscussionView />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Header with tabs */}
      <div className="px-2 sm:px-4 py-2 bg-benchr-bg-header flex items-center gap-3 rounded-lg border border-benchr-border shadow-lg">
        <h2 className="text-xs sm:text-sm font-medium text-benchr-gold-accent whitespace-nowrap flex-shrink-0">
          Problem
        </h2>
        <div className="flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <ToggleGroup
            type="single"
            value={activeTab}
            onValueChange={(value) => value && setActiveTab(value as typeof activeTab)}
            className="flex-nowrap"
          >
            {tabs.map((tab) => (
              <ToggleGroupItem
                key={tab.id}
                value={tab.id}
                aria-label={tab.label}
                className="data-[state=on]:bg-benchr-bg-elevated data-[state=on]:text-benchr-gold-accent data-[state=off]:text-benchr-text-muted hover:bg-benchr-bg-elevated/80 shadow-md !text-xs sm:!text-sm px-2 sm:px-3 whitespace-nowrap"
              >
                {tab.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden rounded-lg border border-benchr-border bg-benchr-bg-main shadow-xl">
        <div className="p-6 h-full overflow-auto">{renderContent()}</div>
      </div>
    </div>
  );
}
