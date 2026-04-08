'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpRight, Crown, Radio, UserPlus, Waves } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '../utils/somnia';
import { useFeed, type FeedType } from '../hooks/useFeed';
import { useLeaderboard } from '../hooks/useLeaderboard';
import {
  formatTimeframe,
  formatTokenAmount,
  shortAddress,
  type MarketRecord,
} from '../utils/bitdrum';
import { Eyebrow, Panel, StatPill } from './ObsidianPrimitives';

function tierTone(tier: string) {
  if (tier === 'ORACLE') return 'border-[rgba(245,185,66,0.24)] bg-[rgba(245,185,66,0.08)] text-[var(--accent-gold)]';
  if (tier === 'PROPHET') return 'border-[rgba(59,130,246,0.22)] bg-[rgba(59,130,246,0.08)] text-[var(--accent-core)]';
  if (tier === 'TRADER') return 'border-[rgba(22,163,74,0.22)] bg-[rgba(22,163,74,0.08)] text-[var(--state-up)]';
  return 'border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)]';
}

function directionTone(direction: string) {
  return direction.toUpperCase() === 'LONG' || direction.toUpperCase() === 'UP'
    ? 'border-[rgba(22,163,74,0.22)] bg-[rgba(22,163,74,0.08)] text-[var(--state-up)]'
    : 'border-[rgba(220,38,38,0.22)] bg-[rgba(220,38,38,0.1)] text-[var(--state-down)]';
}

export const MarketFeed = ({
  viewerAddress,
  selectedMarketId,
  onJoinMarket,
}: {
  viewerAddress?: string;
  selectedMarketId?: string | null;
  onJoinMarket?: (market: MarketRecord) => void;
}) => {
  const queryClient = useQueryClient();
  const [feedType, setFeedType] = useState<FeedType>(viewerAddress ? 'following' : 'oracle');
  const [followAddress, setFollowAddress] = useState('');
  const [followStatus, setFollowStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!viewerAddress && feedType === 'following') {
      setFeedType('oracle');
    }
  }, [feedType, viewerAddress]);

  const { feed, isLoading } = useFeed(feedType, viewerAddress);

  const whaleThreshold = 5;

  const handleFollow = async () => {
    if (!viewerAddress || !followAddress) return;
    setFollowStatus(null);

    const response = await fetch(`${API_BASE}/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        followerAddress: viewerAddress,
        followingAddress: followAddress,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setFollowStatus(payload.error || 'Unable to follow trader');
      return;
    }

    setFollowAddress('');
    setFollowStatus('Following wallet');
    queryClient.invalidateQueries({ queryKey: ['feed', feedType, viewerAddress] });
  };

  return (
    <Panel className="surface-lift p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Eyebrow accent="core">Intelligence Feed</Eyebrow>
          <h3 className="mt-3 font-heading text-[1.7rem] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            Live markets and trader flow
          </h3>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] px-3 py-1.5 text-[0.66rem] uppercase tracking-[0.26em] text-[var(--accent-core)]">
          <Radio className="h-3.5 w-3.5" />
          Reactive
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        {(['following', 'oracle', 'trending'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFeedType(type)}
            disabled={type === 'following' && !viewerAddress}
            className={`rounded-full border px-3 py-2 text-[0.66rem] uppercase tracking-[0.28em] transition ${
              feedType === type
                ? 'border-[rgba(245,185,66,0.22)] bg-[rgba(245,185,66,0.08)] text-[var(--accent-gold)]'
                : 'border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            } disabled:cursor-not-allowed disabled:opacity-35`}
          >
            {type}
          </button>
        ))}
      </div>

      {viewerAddress ? (
        <div className="mt-5 rounded-[1.55rem] border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] p-4">
          <div className="mb-3 flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.3em] text-[var(--text-muted)]">
            <UserPlus className="h-4 w-4 text-[var(--accent-gold)]" />
            Follow Wallet
          </div>
          <div className="flex gap-2">
            <input
              value={followAddress}
              onChange={(event) => setFollowAddress(event.target.value)}
              placeholder="0xabc...def"
              className="min-w-0 flex-1 rounded-full border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[rgba(245,185,66,0.2)]"
            />
            <button
              onClick={handleFollow}
              className="cta-press rounded-full bg-[linear-gradient(135deg,var(--accent-gold),#d97706)] px-5 py-3 text-sm font-medium text-[#140c00]"
            >
              Follow
            </button>
          </div>
          {followStatus ? <p className="mt-3 text-sm text-[var(--text-secondary)]">{followStatus}</p> : null}
        </div>
      ) : null}

      <div className="mt-5 flex min-h-[320px] flex-col gap-3">
        {isLoading && !feed.length ? (
          <div className="rounded-[1.6rem] border border-dashed border-[color:var(--border-subtle)] px-4 py-10 text-center text-[0.68rem] uppercase tracking-[0.34em] text-[var(--text-muted)]">
            Reading protocol flow
          </div>
        ) : feed.length === 0 ? (
          <div className="rounded-[1.6rem] border border-dashed border-[color:var(--border-subtle)] px-4 py-10 text-center text-[0.68rem] uppercase tracking-[0.34em] text-[var(--text-muted)]">
            No activity in this lane
          </div>
        ) : (
          feed.map((item) => {
            const stakeValue = Number(item.stake_amount || 0);
            const whale = Number.isFinite(stakeValue) && stakeValue >= whaleThreshold;
            const isSelected = selectedMarketId === item.market_id;

            return (
              <article
                key={`${item.market_id}-${item.participant_address}-${item.timestamp}`}
                className={`rounded-[1.75rem] border px-4 py-4 transition ${
                  isSelected
                    ? 'border-[rgba(245,185,66,0.22)] bg-[rgba(245,185,66,0.06)]'
                    : 'border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)]'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.24em] ${tierTone(item.tier)}`}>
                        {item.tier}
                      </span>
                      <span className="font-mono text-sm text-[var(--text-secondary)]">
                        {shortAddress(item.participant_address)}
                      </span>
                      {whale ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.1)] px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.24em] text-[var(--state-down)]">
                          <AlertTriangle className="h-3 w-3" />
                          Whale Alert
                        </span>
                      ) : null}
                    </div>
                    <h4 className="mt-4 font-heading text-xl tracking-[-0.04em] text-[var(--text-primary)]">
                      {item.action === 'OPENED' ? 'Opened' : 'Joined'} market #{item.market_id}
                    </h4>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[0.68rem] uppercase tracking-[0.28em] ${directionTone(item.direction)}`}>
                    {item.direction.toUpperCase() === 'UP' ? 'UP' : 'DOWN'}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <StatPill label="Stake" value={`${formatTokenAmount(item.stake_amount)} STT`} accent={whale ? 'danger' : 'neutral'} />
                  <StatPill label="Window" value={item.duration_seconds ? formatTimeframe(item.duration_seconds) : 'Live'} accent="neutral" />
                  <StatPill label="Pool" value={`${formatTokenAmount(item.long_pool)}/${formatTokenAmount(item.short_pool)}`} accent="core" />
                </div>

                {item.signal ? (
                  <div className="mt-4 rounded-[1.35rem] border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.07)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[0.68rem] uppercase tracking-[0.3em] text-[var(--accent-cyan)]">The Core</p>
                        <p className="mt-2 text-sm text-[var(--text-primary)]">
                          {item.signal.direction} bias with {item.signal.confidence}% confidence
                        </p>
                      </div>
                      <Waves className="h-5 w-5 text-[var(--accent-core)]" />
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="text-[0.66rem] uppercase tracking-[0.28em] text-[var(--text-muted)]">
                    {item.state}
                  </span>
                  <button
                    disabled={item.state !== 'OPEN'}
                    onClick={() =>
                      onJoinMarket?.({
                        id: item.market_id,
                        state: item.state,
                        long_pool: item.long_pool,
                        short_pool: item.short_pool,
                        pom_profit_bps: item.pom_profit_bps,
                        duration_seconds: item.duration_seconds,
                        join_deadline: item.join_deadline,
                        opened_at: item.opened_at,
                        settlement_deadline: item.settlement_deadline,
                        signal: item.signal,
                      })
                    }
                    className="cta-press inline-flex items-center gap-2 rounded-full border border-[rgba(245,185,66,0.2)] bg-[rgba(245,185,66,0.08)] px-4 py-2 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--accent-gold)] transition hover:bg-[rgba(245,185,66,0.14)] disabled:cursor-not-allowed disabled:border-[color:var(--border-subtle)] disabled:bg-[rgba(255,255,255,0.03)] disabled:text-[var(--text-muted)]"
                  >
                    Join Market
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </Panel>
  );
};

export const LeaderboardCard = () => {
  const { rankings, isLoading } = useLeaderboard();

  const topThree = useMemo(() => rankings.slice(0, 5), [rankings]);

  return (
    <Panel tone="gold" className="surface-lift p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow accent="gold">Leaderboard</Eyebrow>
          <h3 className="mt-3 font-heading text-[1.7rem] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            Top traders this week
          </h3>
        </div>
        <Crown className="h-5 w-5 text-[var(--accent-gold)]" />
      </div>

      <div className="mt-5 flex min-h-[220px] flex-col gap-3">
        {isLoading && !topThree.length ? (
          <div className="rounded-[1.55rem] border border-dashed border-[color:var(--border-subtle)] px-4 py-10 text-center text-[0.68rem] uppercase tracking-[0.34em] text-[var(--text-muted)]">
            Ranking traders
          </div>
        ) : topThree.length === 0 ? (
          <div className="rounded-[1.55rem] border border-dashed border-[color:var(--border-subtle)] px-4 py-10 text-center text-[0.68rem] uppercase tracking-[0.34em] text-[var(--text-muted)]">
            No ranked traders yet
          </div>
        ) : (
          topThree.map((trader, index) => (
            <div
              key={trader.address}
              className={`flex items-center justify-between rounded-[1.45rem] border px-4 py-4 ${
                index === 0
                  ? 'border-[rgba(245,185,66,0.24)] bg-[linear-gradient(135deg,rgba(245,185,66,0.08),rgba(255,255,255,0.03))] shadow-[0_0_32px_rgba(245,185,66,0.08)]'
                  : 'border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)]'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--border-subtle)] bg-[#0c0c0c] font-mono text-sm text-[var(--text-secondary)]">
                  #{index + 1}
                </div>
                <div>
                  <p className="font-heading text-xl tracking-[-0.04em] text-[var(--text-primary)]">
                    {shortAddress(trader.address)}
                  </p>
                  <p className="mt-1 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                    Win rate {(Number(trader.win_rate || 0) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`rounded-full border px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.24em] ${tierTone(trader.tier)}`}>
                  {trader.tier}
                </span>
                <p className="mt-2 font-mono text-sm text-[var(--text-secondary)]">Score {trader.score}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
};
