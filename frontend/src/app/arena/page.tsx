import { AppShell } from '@/components/AppShell';
import { TradingDashboard } from '@/components/TradingDashboard';

export default function ArenaPage() {
  return (
    <AppShell
      title="The trading arena"
      description="Execution-focused, fast, and stripped of anything that does not help you make a directional Bitcoin call."
    >
      <TradingDashboard />
    </AppShell>
  );
}
