import { AppShell } from '@/components/AppShell';
import { LeaderboardPageView } from '@/components/LeaderboardPageView';

export default function LeaderboardPage() {
  return (
    <AppShell
      title="Leaderboard"
      description="A clearer reputation layer with room for rank, tier, and trading edge to breathe."
    >
      <LeaderboardPageView />
    </AppShell>
  );
}
