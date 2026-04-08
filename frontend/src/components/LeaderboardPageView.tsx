'use client';

import { useLeaderboard } from '../hooks/useLeaderboard';
import { Eyebrow, Panel, StatPill } from './ObsidianPrimitives';
import { shortAddress } from '../utils/bitdrum';

export function LeaderboardPageView() {
  const { rankings, isLoading } = useLeaderboard();

  return (
    <Panel tone="gold" className="surface-lift p-5 sm:p-6">
      <Eyebrow accent="gold">Meritocracy</Eyebrow>
      <h2 className="mt-3 font-heading text-[2rem] font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
        Top traders this week
      </h2>

      <div className="mt-6 flex flex-col gap-3">
        {isLoading && !rankings.length ? (
          <div className="rounded-[1.5rem] border border-dashed border-[color:var(--border-subtle)] px-4 py-12 text-center text-[0.68rem] uppercase tracking-[0.34em] text-[var(--text-muted)]">
            Ranking traders
          </div>
        ) : (
          rankings.map((trader, index) => (
            <div
              key={trader.address}
              className={`grid gap-4 rounded-[1.6rem] border px-5 py-5 lg:grid-cols-[80px_minmax(0,1fr)_260px] ${
                index === 0
                  ? 'border-[rgba(245,185,66,0.24)] bg-[linear-gradient(135deg,rgba(245,185,66,0.08),rgba(255,255,255,0.03))]'
                  : 'border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)]'
              }`}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[color:var(--border-subtle)] bg-[#0c0c0c] font-mono text-lg text-[var(--text-secondary)]">
                #{index + 1}
              </div>
              <div>
                <h3 className="font-heading text-[1.4rem] tracking-[-0.04em] text-[var(--text-primary)]">
                  {shortAddress(trader.address)}
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Ranked by win rate, consistency, and cumulative edge.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <StatPill label="Tier" value={trader.tier} accent={trader.tier === 'ORACLE' ? 'gold' : trader.tier === 'PROPHET' ? 'core' : 'neutral'} />
                <StatPill label="Win Rate" value={`${(Number(trader.win_rate) * 100).toFixed(1)}%`} accent="success" />
                <StatPill label="Score" value={trader.score} accent="neutral" />
              </div>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
