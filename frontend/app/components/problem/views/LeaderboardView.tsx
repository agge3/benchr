import { Trophy } from 'lucide-react';

export function LeaderboardView() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <Trophy className="h-12 w-12 text-benchr-text-muted mb-4" />
      <h2 className="text-lg font-medium text-benchr-text-light mb-2">Leaderboard</h2>
      <p className="text-sm text-benchr-text-muted">Coming soon</p>
    </div>
  );
}
