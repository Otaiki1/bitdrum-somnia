'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  ChevronRight,
  ExternalLink,
  LogOut,
  Shield,
  Sparkles,
  Trophy,
  Wallet,
  Waves,
  X,
} from 'lucide-react';
import { PriceChart, type TradeMarker } from './PriceChart';
import { TradePanel } from './TradePanel';
import { LeaderboardCard, MarketFeed } from './SocialFeed';
import { useBitdrumWallet } from './BitdrumWalletProvider';
import { BrandMark, Eyebrow, Panel, StatPill } from './ObsidianPrimitives';
import {
  claimMarket,
  formatTimeframe,
  formatTokenAmount,
  shortAddress,
  formatOraclePrice,
  type MarketRecord,
  type TradeExecutionRecord,
} from '../utils/bitdrum';
import { SOMNIA_EXPLORER_BASE_URL } from '../utils/somnia';
import { usePositions } from '../hooks/usePositions';

function CountdownTimer({ settlementDeadline }: { settlementDeadline: number | null }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!settlementDeadline) return;

    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      setRemaining(Math.max(0, settlementDeadline - now));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [settlementDeadline]);

  if (remaining === null) return null;

  if (remaining <= 0) {
    return (
      <span className="rounded-full border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.1)] px-3 py-1 text-[0.62rem] uppercase tracking-[0.24em] text-[var(--state-down)]">
        Settling
      </span>
    );
  }

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const label = mins > 0 ? `${mins}m ${secs.toString().padStart(2, '0')}s` : `${secs}s`;
  const urgent = remaining <= 10;

  return (
    <span
      className={`rounded-full border px-3 py-1 text-[0.62rem] uppercase tracking-[0.24em] ${
        urgent
          ? 'border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.1)] text-[var(--state-down)] animate-pulse'
          : 'border-[rgba(245,185,66,0.18)] bg-[rgba(245,185,66,0.08)] text-[var(--accent-gold)]'
      }`}
    >
      {label}
    </span>
  );
}

function OutcomeModal({
  outcome,
  position,
  onClose,
}: {
  outcome: 'WIN' | 'LOSS' | 'DRAW';
  position: any;
  onClose: () => void;
}) {
  const isWin = outcome === 'WIN';
  const isDraw = outcome === 'DRAW';

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4 backdrop-blur-md">
      <Panel className={`relative w-full max-w-md p-7 ${isWin ? 'panel-gold' : isDraw ? 'panel-core' : 'panel-surface'}`}>
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] p-2 text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>

        <Eyebrow accent={isWin ? 'gold' : isDraw ? 'core' : 'danger'}>
          {isWin ? 'You Called It Right' : isDraw ? 'Round Refunded' : 'Market Moved Against You'}
        </Eyebrow>

        <h2 className="mt-4 font-heading text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)]">
          Market #{position.market_id}
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          {isWin
            ? 'Your call landed on the right side of the close. The protocol settled in your favor.'
            : isDraw
              ? 'The market settled flat. Your stake returns unchanged.'
              : 'The direction moved against your position before settlement.'}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.45rem] border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] p-4">
            <div className="text-[0.66rem] uppercase tracking-[0.28em] text-[var(--text-muted)]">Stake</div>
            <div className="mt-3 font-mono text-2xl text-[var(--text-primary)]">
              {formatTokenAmount(position.stake_amount)} STT
            </div>
          </div>
          <div className="rounded-[1.45rem] border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] p-4">
            <div className="text-[0.66rem] uppercase tracking-[0.28em] text-[var(--text-muted)]">PnL</div>
            <div className={`mt-3 font-mono text-2xl ${isWin ? 'text-[var(--state-up)]' : isDraw ? 'text-[var(--accent-core)]' : 'text-[var(--state-down)]'}`}>
              {isWin || isDraw ? '+' : ''}
              {formatTokenAmount(position.net_pnl)} STT
            </div>
          </div>
        </div>

        {(position.entry_price || position.settlement_price) ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <StatPill
              label="Entry"
              value={
                formatOraclePrice(position.entry_price)
                  ? `$${formatOraclePrice(position.entry_price)!.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '--'
              }
            />
            <StatPill
              label="Settlement"
              value={
                formatOraclePrice(position.settlement_price)
                  ? `$${formatOraclePrice(position.settlement_price)!.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '--'
              }
              accent={isWin ? 'success' : isDraw ? 'core' : 'danger'}
            />
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

export const TradingDashboard = () => {
  const queryClient = useQueryClient();
  const {
    wallet,
    address,
    username,
    authenticated,
    connecting,
    error: walletError,
    connect,
    disconnect,
    openProfile,
  } = useBitdrumWallet();

  const [showAccount, setShowAccount] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<MarketRecord | null>(null);
  const [claimingMarketId, setClaimingMarketId] = useState<string | null>(null);
  const [currentBtcPrice, setCurrentBtcPrice] = useState<number | null>(null);
  const [pendingTrades, setPendingTrades] = useState<TradeExecutionRecord[]>([]);
  const [outcomeModal, setOutcomeModal] = useState<{ outcome: 'WIN' | 'LOSS' | 'DRAW'; position: any } | null>(null);
  const seenOutcomes = useRef<Set<string>>(new Set());

  const viewerAddress = address ?? '';
  const { positions, summary: positionSummary, isLoading: positionsLoading } = usePositions(viewerAddress || null);

  useEffect(() => {
    for (const pos of positions) {
      const key = `${pos.market_id}-${pos.direction}`;
      if (seenOutcomes.current.has(key)) continue;
      if (pos.status === 'WIN' || pos.status === 'LOSS' || pos.status === 'DRAW') {
        seenOutcomes.current.add(key);
        setOutcomeModal({ outcome: pos.status as 'WIN' | 'LOSS' | 'DRAW', position: pos });
        break;
      }
    }
  }, [positions]);

  const livePnL = useMemo(() => formatTokenAmount(positionSummary?.resolved_pnl || '0'), [positionSummary?.resolved_pnl]);

  const tradeMarkers = useMemo<TradeMarker[]>(() => {
    const markers: TradeMarker[] = [];

    for (const trade of pendingTrades) {
      if (trade.status === 'failed' || !trade.entryPrice) continue;
      markers.push({
        time: Math.floor(new Date(trade.submittedAt).getTime() / 1000),
        price: trade.entryPrice,
        direction: trade.direction,
        label: `${trade.direction} ${trade.stake} STT`,
      });
    }

    for (const position of positions) {
      if (!position.entry_price) continue;
      const key = `${position.market_id}-${position.direction}`;
      if (markers.some((marker) => marker.label.includes(key))) continue;
      const entryPrice = formatOraclePrice(position.entry_price);
      if (!entryPrice) continue;
      markers.push({
        time: position.opened_at ? Math.floor(new Date(position.opened_at).getTime() / 1000) : Math.floor(Date.now() / 1000),
        price: entryPrice,
        direction: position.direction.toUpperCase() === 'LONG' || position.direction.toUpperCase() === 'UP' ? 'UP' : 'DOWN',
        label: `${position.direction} #${position.market_id}`,
      });
    }

    return markers;
  }, [pendingTrades, positions]);

  const handleTradeSubmitted = (record: TradeExecutionRecord) => {
    setPendingTrades((previous) => {
      const existing = previous.findIndex((trade) => trade.txHash === record.txHash);
      if (existing >= 0) {
        const updated = [...previous];
        updated[existing] = record;
        return updated.slice(0, 8);
      }
      return [record, ...previous].slice(0, 8);
    });
  };

  const handleAuth = async () => {
    if (authenticated) {
      setShowAccount(true);
      return;
    }
    try {
      await connect();
      setShowAccount(true);
    } catch {
      // provider handles error
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    setSelectedMarket(null);
    setShowAccount(false);
  };

  const handleClaim = async (marketId: string) => {
    if (!wallet) return;
    setClaimingMarketId(marketId);
    try {
      const tx = await claimMarket({ wallet, marketId });
      await tx.wait();
      await queryClient.invalidateQueries({ queryKey: ['positions', viewerAddress] });
      await queryClient.invalidateQueries({ queryKey: ['feed'] });
      await queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    } finally {
      setClaimingMarketId(null);
    }
  };

  const shortWallet = viewerAddress ? shortAddress(viewerAddress) : '';
  const identityLabel = username || shortWallet || 'Wallet';

  return (
    <div id="live-markets" className="relative mx-auto max-w-[1520px] px-4 py-8 sm:px-6 lg:px-8">
      {outcomeModal ? (
        <OutcomeModal
          outcome={outcomeModal.outcome}
          position={outcomeModal.position}
          onClose={() => setOutcomeModal(null)}
        />
      ) : null}

      {showAccount ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <Panel className="w-full max-w-2xl p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Eyebrow accent="gold">Wallet Session</Eyebrow>
                <h2 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                  Somnia execution profile
                </h2>
              </div>
              <button
                onClick={() => setShowAccount(false)}
                className="rounded-full border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] p-2 text-[var(--text-secondary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              <Panel className="p-5">
                <Eyebrow accent="neutral">Label</Eyebrow>
                <p className="mt-4 font-heading text-2xl tracking-[-0.04em] text-[var(--text-primary)]">
                  {username || 'Injected Wallet'}
                </p>
                <p className="mt-4 font-mono text-sm text-[var(--text-secondary)]">{viewerAddress || 'Disconnected'}</p>
              </Panel>
              <Panel className="p-5">
                <Eyebrow accent="core">Mode</Eyebrow>
                <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                  Connect an injected EVM wallet on Somnia Shannon or mainnet to manage approvals, positions, and claims.
                </p>
              </Panel>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => void openProfile()}
                className="cta-press rounded-full bg-[linear-gradient(135deg,var(--accent-gold),#d97706)] px-5 py-3 text-sm text-[#140c00]"
              >
                Open Explorer Profile
              </button>
              <button
                onClick={() => void handleDisconnect()}
                className="rounded-full border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] px-5 py-3 text-sm text-[var(--text-primary)]"
              >
                Disconnect
              </button>
            </div>
          </Panel>
        </div>
      ) : null}

      <div className={`grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_420px] ${showAccount ? 'blur-sm opacity-35' : ''}`}>
        <aside className="xl:sticky xl:top-6 xl:h-fit">
          <Panel className="surface-lift p-5 sm:p-6">
            <BrandMark />

            <div className="mt-10 space-y-3">
              {[
                { label: 'Arena', value: 'Live' },
                { label: 'The Core', value: 'Signal' },
                { label: 'Leaderboard', value: 'Top traders' },
              ].map((item, index) => (
                <button
                  key={item.label}
                  className={`flex w-full items-center justify-between rounded-[1.35rem] border px-4 py-3 text-left transition ${
                    index === 0
                      ? 'border-[rgba(245,185,66,0.2)] bg-[rgba(245,185,66,0.08)] text-[var(--text-primary)]'
                      : 'border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>
                    <span className="block text-sm">{item.label}</span>
                    <span className="mt-1 block text-[0.66rem] uppercase tracking-[0.24em]">{item.value}</span>
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ))}
            </div>

            <Panel className="mt-8 p-5">
              <Eyebrow accent="gold">Session</Eyebrow>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--border-subtle)] bg-[#0c0c0c] text-[var(--accent-gold)]">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-heading text-xl tracking-[-0.04em] text-[var(--text-primary)]">{identityLabel}</p>
                  <p className="text-[0.68rem] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                    {authenticated ? 'Connected' : 'Ready to connect'}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {authenticated ? (
                  <>
                    <button
                      onClick={() => setShowAccount(true)}
                      className="rounded-full border border-[rgba(245,185,66,0.18)] bg-[rgba(245,185,66,0.08)] px-4 py-2 text-[0.7rem] uppercase tracking-[0.24em] text-[var(--accent-gold)]"
                    >
                      Open Session
                    </button>
                    <button
                      onClick={() => void handleDisconnect()}
                      className="rounded-full border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-[0.7rem] uppercase tracking-[0.24em] text-[var(--text-secondary)]"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => void handleAuth()}
                    disabled={connecting}
                    className="cta-press rounded-full bg-[linear-gradient(135deg,var(--accent-gold),#d97706)] px-4 py-2 text-[0.72rem] uppercase tracking-[0.24em] text-[#140c00] disabled:opacity-60"
                  >
                    {connecting ? 'Connecting...' : 'Connect Wallet'}
                  </button>
                )}
              </div>
            </Panel>

            <div className="mt-8 grid gap-3">
              <StatPill label="Win Rate" value={`${((positionSummary?.win_rate || 0) * 100).toFixed(1)}%`} accent="gold" />
              <StatPill label="Resolved PnL" value={`${livePnL} STT`} accent={Number(positionSummary?.resolved_pnl || 0) >= 0 ? 'success' : 'danger'} />
              <StatPill label="Live BTC" value={currentBtcPrice ? `$${currentBtcPrice.toFixed(2)}` : '--'} accent="core" />
            </div>
          </Panel>
        </aside>

        <section className="flex min-w-0 flex-col gap-6">
          <Panel className="surface-lift overflow-hidden p-5 sm:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <Eyebrow accent="gold">Trading Arena</Eyebrow>
                <h1 className="mt-3 font-heading text-[clamp(2.4rem,4vw,4.8rem)] font-semibold leading-[0.92] tracking-[-0.07em] text-[var(--text-primary)]">
                  Precision decisions, made at market speed.
                </h1>
                <p className="mt-5 max-w-2xl text-[1rem] leading-8 text-[var(--text-secondary)]">
                  BitDrum turns each round into a clear decision surface: live price action, The Core’s conviction, and your position board in one arena.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatPill label="Chain" value="Somnia Shannon" accent="core" />
                <StatPill label="Markets" value="30s / 1m / 5m" accent="neutral" />
                <StatPill label="Execution" value="STT" accent="gold" />
              </div>
            </div>

            {pendingTrades.length > 0 ? (
              <div className="mt-6 grid gap-3 lg:grid-cols-3">
                {pendingTrades.slice(0, 3).map((trade) => (
                  <div
                    key={trade.id}
                    className={`rounded-[1.4rem] border px-4 py-4 ${
                      trade.status === 'confirmed'
                        ? 'border-[rgba(22,163,74,0.2)] bg-[rgba(22,163,74,0.08)]'
                        : trade.status === 'failed'
                          ? 'border-[rgba(220,38,38,0.22)] bg-[rgba(220,38,38,0.1)]'
                          : 'border-[rgba(245,185,66,0.18)] bg-[rgba(245,185,66,0.08)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[0.66rem] uppercase tracking-[0.28em] text-[var(--text-muted)]">Pending flow</p>
                        <p className="mt-2 font-heading text-xl tracking-[-0.04em] text-[var(--text-primary)]">
                          {trade.direction} · {trade.stake} STT
                        </p>
                      </div>
                      <span className="text-[0.66rem] uppercase tracking-[0.24em] text-[var(--text-primary)]">
                        {trade.status}
                      </span>
                    </div>
                    {trade.explorerUrl ? (
                      <a
                        href={trade.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                      >
                        Explorer
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </Panel>

          {walletError ? (
            <div className="rounded-[1.55rem] border border-[rgba(220,38,38,0.22)] bg-[rgba(220,38,38,0.1)] px-5 py-4 text-sm text-[var(--text-primary)]">
              {walletError}
            </div>
          ) : null}

          <PriceChart
            tradeMarkers={tradeMarkers}
            recentExecutions={pendingTrades}
            onPriceUpdate={setCurrentBtcPrice}
          />

          <Panel className="surface-lift p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <Eyebrow accent="gold">Active Positions</Eyebrow>
                <h3 className="mt-3 font-heading text-[1.8rem] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  Open calls and settled outcomes
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatPill label="Resolved PnL" value={`${livePnL} STT`} accent={Number(positionSummary?.resolved_pnl || 0) >= 0 ? 'success' : 'danger'} />
                <StatPill label="Win Rate" value={`${((positionSummary?.win_rate || 0) * 100).toFixed(1)}%`} accent="gold" />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {positionsLoading && !positions.length ? (
                <div className="rounded-[1.55rem] border border-dashed border-[color:var(--border-subtle)] px-4 py-12 text-center text-[0.68rem] uppercase tracking-[0.34em] text-[var(--text-muted)]">
                  Reading positions
                </div>
              ) : positions.length === 0 ? (
                <div className="rounded-[1.55rem] border border-dashed border-[color:var(--border-subtle)] px-4 py-12 text-center text-[0.68rem] uppercase tracking-[0.34em] text-[var(--text-muted)]">
                  {authenticated ? 'No active stakes yet' : 'Connect wallet to load positions'}
                </div>
              ) : (
                positions.map((position: any) => {
                  const status =
                    position.status === 'WIN'
                      ? 'border-[rgba(245,185,66,0.22)] bg-[rgba(245,185,66,0.08)]'
                      : position.status === 'LOSS'
                        ? 'border-[rgba(220,38,38,0.22)] bg-[rgba(220,38,38,0.1)]'
                        : position.status === 'DRAW'
                          ? 'border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)]'
                          : 'border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)]';

                  return (
                    <article
                      key={`${position.market_id}-${position.direction}`}
                      className={`rounded-[1.75rem] border px-5 py-5 ${status}`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h4 className="font-heading text-[1.45rem] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                              Market #{position.market_id} · {position.direction.toUpperCase()}
                            </h4>
                            {(position.status === 'OPEN' || position.status === 'PENDING') ? (
                              <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] px-3 py-1 text-[0.66rem] uppercase tracking-[0.24em] text-[var(--accent-core)]">
                                <Waves className="h-3.5 w-3.5" />
                                Live
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <StatPill label="Status" value={position.status} accent={position.status === 'WIN' ? 'gold' : position.status === 'LOSS' ? 'danger' : position.status === 'DRAW' ? 'core' : 'neutral'} />
                            {position.duration_seconds ? <StatPill label="Round" value={formatTimeframe(position.duration_seconds)} accent="neutral" /> : null}
                            {position.settlement_deadline ? <CountdownTimer settlementDeadline={position.settlement_deadline} /> : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {(position.status === 'WIN' || position.status === 'LOSS' || position.status === 'DRAW') ? (
                            <button
                              onClick={() => setOutcomeModal({ outcome: position.status, position })}
                              className="rounded-full border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--text-primary)]"
                            >
                              View Outcome
                            </button>
                          ) : null}
                          {position.can_claim ? (
                            <button
                              onClick={() => handleClaim(position.market_id)}
                              disabled={claimingMarketId === position.market_id}
                              className="cta-press rounded-full bg-[linear-gradient(135deg,var(--accent-gold),#d97706)] px-4 py-2 text-[0.72rem] uppercase tracking-[0.24em] text-[#140c00] disabled:opacity-60"
                            >
                              {claimingMarketId === position.market_id ? 'Claiming...' : 'Claim Payout'}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-6 grid gap-3 sm:grid-cols-4">
                        <div className="rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[rgba(0,0,0,0.18)] p-4">
                          <div className="text-[0.66rem] uppercase tracking-[0.28em] text-[var(--text-muted)]">Stake</div>
                          <div className="mt-3 font-mono text-2xl text-[var(--text-primary)]">
                            {formatTokenAmount(position.stake_amount)} STT
                          </div>
                        </div>
                        <div className="rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[rgba(0,0,0,0.18)] p-4">
                          <div className="text-[0.66rem] uppercase tracking-[0.28em] text-[var(--text-muted)]">Expected</div>
                          <div className="mt-3 font-mono text-2xl text-[var(--text-primary)]">
                            {formatTokenAmount(position.expected_payout)} STT
                          </div>
                        </div>
                        <div className="rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[rgba(0,0,0,0.18)] p-4">
                          <div className="text-[0.66rem] uppercase tracking-[0.28em] text-[var(--text-muted)]">Entry</div>
                          <div className="mt-3 font-mono text-xl text-[var(--text-primary)]">
                            {formatOraclePrice(position.entry_price)
                              ? `$${formatOraclePrice(position.entry_price)!.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : '--'}
                          </div>
                        </div>
                        <div className="rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[rgba(0,0,0,0.18)] p-4">
                          <div className="text-[0.66rem] uppercase tracking-[0.28em] text-[var(--text-muted)]">Net PnL</div>
                          <div
                            className={`mt-3 font-mono text-2xl ${
                              Number(position.net_pnl) > 0
                                ? 'text-[var(--state-up)]'
                                : Number(position.net_pnl) < 0
                                  ? 'text-[var(--state-down)]'
                                  : 'text-[var(--text-primary)]'
                            }`}
                          >
                            {formatTokenAmount(position.net_pnl)} STT
                          </div>
                        </div>
                      </div>

                      {position.transaction_hash ? (
                        <a
                          href={`${SOMNIA_EXPLORER_BASE_URL}/tx/${position.transaction_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-5 inline-flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                        >
                          View transaction
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          </Panel>
        </section>

        <aside className="flex min-w-0 flex-col gap-6">
          <TradePanel
            selectedMarket={selectedMarket}
            onClearSelection={() => setSelectedMarket(null)}
            currentPrice={currentBtcPrice}
            onTradeSubmitted={handleTradeSubmitted}
          />
          <MarketFeed
            viewerAddress={viewerAddress || undefined}
            selectedMarketId={selectedMarket?.id}
            onJoinMarket={setSelectedMarket}
          />
          <LeaderboardCard />
        </aside>
      </div>
    </div>
  );
};
