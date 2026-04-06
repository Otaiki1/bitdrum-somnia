'use client';

import React, { useEffect, useState } from 'react';
import { Activity, ArrowUpRight, Radio, Trophy, UserPlus } from 'lucide-react';
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

function tierTone(tier: string) {
  if (tier === 'ORACLE') return 'border-amber-400/30 bg-amber-400/10 text-amber-200';
  if (tier === 'PROPHET') return 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200';
  if (tier === 'TRADER') return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
  return 'border-white/10 bg-white/5 text-slate-300';
}

function directionTone(direction: string) {
  return direction.toUpperCase() === 'LONG' || direction.toUpperCase() === 'UP'
    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
    : 'bg-rose-500/10 text-rose-300 border-rose-500/20';
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
    <div className="glass-morphism flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-orange-400" />
          <div>
            <h3 className="text-lg font-bold uppercase tracking-tight text-white">Live Activity</h3>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">
              Social Flow
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-orange-300">
          <Radio className="h-3 w-3" />
          WebSocket
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(['following', 'oracle', 'trending'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFeedType(type)}
            disabled={type === 'following' && !viewerAddress}
            className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.25em] transition-all ${
              feedType === type
                ? 'border-orange-500/50 bg-orange-500/10 text-orange-200'
                : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {type}
          </button>
        ))}
      </div>

      {viewerAddress ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
            <UserPlus className="h-3 w-3 text-orange-400" />
            Follow Wallet
          </div>
          <div className="flex gap-2">
            <input
              value={followAddress}
              onChange={(event) => setFollowAddress(event.target.value)}
              placeholder="0xabc...def"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none transition focus:border-orange-500/40"
            />
            <button
              onClick={handleFollow}
              className="rounded-xl border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-orange-200 transition hover:bg-orange-500/20"
            >
              Follow
            </button>
          </div>
          {followStatus ? <p className="mt-2 text-[10px] text-slate-400">{followStatus}</p> : null}
        </div>
      ) : null}

      <div className="flex min-h-[220px] flex-col gap-3">
        {isLoading && !feed.length ? (
          <div className="mt-8 text-center text-xs uppercase tracking-[0.3em] text-slate-500">
            Reading protocol flow
          </div>
        ) : feed.length === 0 ? (
          <div className="mt-8 text-center text-xs uppercase tracking-[0.3em] text-slate-500">
            No activity in this lane
          </div>
        ) : (
          feed.map((item) => (
            <article
              key={`${item.market_id}-${item.participant_address}-${item.timestamp}`}
              className={`rounded-2xl border p-4 transition ${
                selectedMarketId === item.market_id
                  ? 'border-orange-500/40 bg-orange-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.24em] ${tierTone(item.tier)}`}
                    >
                      {item.tier}
                    </span>
                    <span className="font-mono text-xs text-slate-300">
                      {shortAddress(item.participant_address)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {item.action === 'OPENED' ? 'Opened' : 'Joined'} market #{item.market_id}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] ${directionTone(item.direction)}`}
                >
                  {item.direction.toUpperCase() === 'UP' ? 'UP' : 'DOWN'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div>
                  Stake
                  <div className="mt-1 font-mono text-white">{formatTokenAmount(item.stake_amount)} WBTC</div>
                </div>
                <div>
                  Pool
                  <div className="mt-1 font-mono text-white">
                    {formatTokenAmount(item.long_pool)} / {formatTokenAmount(item.short_pool)}
                  </div>
                </div>
                {item.duration_seconds ? (
                  <div>
                    Timeframe
                    <div className="mt-1 font-mono text-white">{formatTimeframe(item.duration_seconds)}</div>
                  </div>
                ) : null}
                <div>
                  Window
                  <div className="mt-1 font-mono text-white">{item.state}</div>
                </div>
              </div>

              {item.signal ? (
                <p className="mt-3 text-xs leading-relaxed text-slate-300">
                  AI: {item.signal.direction} ({item.signal.confidence}%)
                </p>
              ) : null}

              <div className="mt-4 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-500">
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
                  className="inline-flex items-center gap-2 rounded-full border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500"
                >
                  Join
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
};

export const LeaderboardCard = () => {
  const { rankings, isLoading } = useLeaderboard();

  return (
    <div className="glass-morphism mt-4">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-300" />
        <div>
          <h3 className="text-lg font-bold uppercase tracking-tight text-white">Leaderboard</h3>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">
            Reputation Tiers
          </p>
        </div>
      </div>

      <div className="flex min-h-[180px] flex-col gap-3">
        {isLoading && !rankings.length ? (
          <div className="mt-6 text-center text-xs uppercase tracking-[0.3em] text-slate-500">
            Computing tiers
          </div>
        ) : rankings.length === 0 ? (
          <div className="mt-6 text-center text-xs uppercase tracking-[0.3em] text-slate-500">
            No ranked traders yet
          </div>
        ) : (
          rankings.slice(0, 5).map((trader, index) => (
            <div
              key={trader.address}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-black text-slate-600">#{index + 1}</span>
                <div>
                  <p className="font-mono text-sm text-white">{shortAddress(trader.address)}</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                    Win rate {(Number(trader.win_rate || 0) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.22em] ${tierTone(trader.tier)}`}
                >
                  {trader.tier}
                </span>
                <p className="mt-2 text-[11px] text-slate-400">Score {trader.score}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
