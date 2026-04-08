import { AppShell } from '@/components/AppShell';
import { SignalsPageView } from '@/components/SignalsPageView';

export default function SignalsPage() {
  return (
    <AppShell
      title="The Core"
      description="A dedicated intelligence surface for signal direction, confidence, rationale, and live market inputs."
    >
      <SignalsPageView />
    </AppShell>
  );
}
