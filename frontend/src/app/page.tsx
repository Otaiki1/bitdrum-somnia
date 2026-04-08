import { LandingPage } from '@/components/LandingPage';
import { TradingDashboard } from "@/components/TradingDashboard";

export default function Home() {
  return (
    <main className="bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <LandingPage />
      <section id="app" className="relative">
        <TradingDashboard />
      </section>
    </main>
  );
}
