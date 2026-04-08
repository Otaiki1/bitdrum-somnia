'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ExternalLink,
  Waves,
  X,
} from 'lucide-react';
import { PriceChart, type TradeMarker } from './PriceChart';
import { TradePanel } from './TradePanel';
import { MarketFeed } from './SocialFeed';
import { useBitdrumWallet } from './BitdrumWalletProvider';
import { Eyebrow, Panel, StatPill } from './ObsidianPrimitives';
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

  return (
    <div id="live-markets" className="relative">
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

      <div className={`grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] ${showAccount ? 'blur-sm opacity-35' : ''}`}>
        <section className="flex min-w-0 flex-col gap-6">
          {walletError ? (
            <div className="rounded-[1.55rem] border border-[rgba(220,38,38,0.22)] bg-[rgba(220,38,38,0.1)] px-5 py-4 text-sm text-[var(--text-primary)]">
              {walletError}
            </div>
          ) : null}

          <Panel className="surface-lift overflow-hidden p-5 sm:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <Eyebrow accent="gold">Arena Focus</Eyebrow>
                <h2 className="mt-3 font-heading text-[clamp(2rem,4vw,4rem)] font-semibold leading-[0.92] tracking-[-0.07em] text-[var(--text-primary)]">
                  Live price action and execution, without the clutter.
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatPill label="Win Rate" value={`${((positionSummary?.win_rate || 0) * 100).toFixed(1)}%`} accent="gold" />
                <StatPill label="PnL" value={`${livePnL} STT`} accent={Number(positionSummary?.resolved_pnl || 0) >= 0 ? 'success' : 'danger'} />
                <StatPill label="BTC" value={currentBtcPrice ? `$${currentBtcPrice.toFixed(2)}` : '--'} accent="core" />
              </div>
            </div>
          </Panel>

          <PriceChart
            tradeMarkers={tradeMarkers}
            recentExecutions={pendingTrades}
            onPriceUpdate={setCurrentBtcPrice}
          />

          <MarketFeed
            viewerAddress={viewerAddress || undefined}
            selectedMarketId={selectedMarket?.id}
            onJoinMarket={setSelectedMarket}
          />
        </section>

        <aside className="flex min-w-0 flex-col gap-6">
          <TradePanel
            selectedMarket={selectedMarket}
            onClearSelection={() => setSelectedMarket(null)}
            currentPrice={currentBtcPrice}
            onTradeSubmitted={handleTradeSubmitted}
          />
          <Panel className="surface-lift p-5">
            <Eyebrow accent="gold">Next Steps</Eyebrow>
            <div className="mt-4 grid gap-3">
              <a href="/signals" className="rounded-[1.25rem] border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] px-4 py-4 text-sm text-[var(--text-primary)] transition hover:border-[rgba(59,130,246,0.18)]">
                Open The Core
              </a>
              <a href="/portfolio" className="rounded-[1.25rem] border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] px-4 py-4 text-sm text-[var(--text-primary)] transition hover:border-[rgba(245,185,66,0.18)]">
                Review Portfolio
              </a>
              <a href="/leaderboard" className="rounded-[1.25rem] border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] px-4 py-4 text-sm text-[var(--text-primary)] transition hover:border-[rgba(245,185,66,0.18)]">
                Study the Leaderboard
              </a>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
};
