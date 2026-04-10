'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import {
  Loader2,
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
import { readSttBalance } from '../utils/contracts';
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
      <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.1)] px-3 py-1 text-[0.62rem] uppercase tracking-[0.24em] text-[var(--state-down)]">
        <Loader2 className="h-3 w-3 animate-spin" />
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
  const [claimError, setClaimError] = useState<string | null>(null);
  const [currentBtcPrice, setCurrentBtcPrice] = useState<number | null>(null);
  const [pendingTrades, setPendingTrades] = useState<TradeExecutionRecord[]>([]);
  const [outcomeModal, setOutcomeModal] = useState<{ outcome: 'WIN' | 'LOSS' | 'DRAW'; position: any } | null>(null);
  const [selectedTab, setSelectedTab] = useState<'markets' | 'positions'>('markets');
  const [isLockedIn, setIsLockedIn] = useState(false);
  const [sttBalance, setSttBalance] = useState<string | null>(null);
  const seenOutcomes = useRef<Set<string>>(new Set());

  const viewerAddress = address ?? '';
  const { positions, summary: positionSummary, isLoading: positionsLoading } = usePositions(viewerAddress || null);

  const refreshBalance = useCallback(async () => {
    if (!address) { setSttBalance(null); return; }
    try {
      const raw = await readSttBalance(address as `0x${string}`);
      setSttBalance(Number(formatUnits(raw, 18)).toFixed(3));
    } catch {
      // ignore
    }
  }, [address]);

  useEffect(() => {
    refreshBalance();
    const id = setInterval(refreshBalance, 5_000);
    return () => clearInterval(id);
  }, [refreshBalance]);

  // Aggressive refresh when settling: If any position is "Settling", poll faster.
  useEffect(() => {
    const hasSettling = positions.some(p => {
      if (!p.settlement_deadline) return false;
      const deadline = new Date(p.settlement_deadline).getTime();
      const now = Date.now();
      return now >= deadline && p.status !== 'WIN' && p.status !== 'LOSS' && p.status !== 'DRAW';
    });

    if (hasSettling) {
      const id = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['positions', viewerAddress] });
      }, 3000);
      return () => clearInterval(id);
    }
  }, [positions, queryClient, viewerAddress]);

  const [isInitialized, setIsInitialized] = useState(false);

  // Mark existing settled positions as "seen" on mount so we don't pop up old history.
  // Then, watch for NEW settlements.
  useEffect(() => {
    if (positionsLoading) return;

    if (!isInitialized && positions.length > 0) {
      // Initialize seenOutcomes with whatever is already settled.
      for (const pos of positions) {
        const isSettled = pos.status === 'WIN' || pos.status === 'LOSS' || pos.status === 'DRAW';
        if (isSettled) {
          const key = `${pos.market_id}-${pos.direction}`;
          seenOutcomes.current.add(key);
        }
      }
      setIsInitialized(true);
      return;
    }

    if (!isInitialized && positions.length === 0) {
      // If we loaded and have no positions, we are initialized (ready for first trade).
      setIsInitialized(true);
      return;
    }

    // After initialization, watch for NEW settlements.
    for (const pos of positions) {
      const key = `${pos.market_id}-${pos.direction}`;
      const isSettled = pos.status === 'WIN' || pos.status === 'LOSS' || pos.status === 'DRAW';
      
      if (isSettled && !seenOutcomes.current.has(key)) {
        seenOutcomes.current.add(key);
        setOutcomeModal({ outcome: pos.status as 'WIN' | 'LOSS' | 'DRAW', position: pos });
        break; // Show one at a time if multiple settle at once.
      }
    }
  }, [positions, positionsLoading, isInitialized]);

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
      
      // Only show markers for active or settling positions. Clear them once resolved.
      const isResolved = position.status === 'WIN' || position.status === 'LOSS' || position.status === 'DRAW';
      if (isResolved) continue;

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

  const [tradeToast, setTradeToast] = useState<{ message: string; visible: boolean } | null>(null);

  const handleTradeSubmitted = (record: TradeExecutionRecord) => {
    if (record.status === 'confirmed') {
      setTradeToast({ message: `Transaction confirmed for ${record.direction} ${record.stake} STT`, visible: true });
      setTimeout(() => setTradeToast(null), 5000);
    }
    
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
    setClaimError(null);
    try {
      const tx = await claimMarket({ wallet, marketId });
      await tx.wait();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['positions', viewerAddress] }),
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] }),
      ]);
      // Refresh balance immediately after successful claim
      await refreshBalance();
    } catch (err: any) {
      const msg: string = err?.shortMessage ?? err?.message ?? 'Claim failed';
      // Extract the human-readable revert reason if present
      const reasonMatch = msg.match(/reverted with the following reason:\s*([^\n]+)/i);
      setClaimError(reasonMatch ? reasonMatch[1].trim() : msg);
    } finally {
      setClaimingMarketId(null);
    }
  };

  return (
    <div id="live-markets" className="relative">
      {tradeToast && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="rounded-[1rem] border border-[rgba(22,163,74,0.3)] bg-[rgba(10,10,10,0.95)] px-5 py-4 shadow-[0_8px_32px_rgba(22,163,74,0.15)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(22,163,74,0.1)]">
                <div className="h-2 w-2 rounded-full bg-[var(--state-up)] shadow-[0_0_8px_var(--state-up)] animate-pulse" />
              </div>
              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[var(--state-up)]">Tx Confirmed</p>
                <p className="font-heading text-sm text-[var(--text-primary)]">{tradeToast.message}</p>
              </div>
              <button 
                onClick={() => setTradeToast(null)} 
                className="ml-4 rounded-full p-1 text-[var(--text-muted)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

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

      {isLockedIn && (
        <div className="fixed inset-0 z-[9999] bg-[var(--bg-primary)] p-4 sm:p-6 lg:p-8">
          <div className="relative h-full w-full overflow-hidden rounded-[2.5rem] border border-[rgba(245,185,66,0.12)] bg-[rgba(10,10,10,0.8)] shadow-[0_0_100px_rgba(0,0,0,0.8)] backdrop-blur-xl">
            {/* Header Ticker */}
            <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between border-b border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.4)] px-8 py-4 backdrop-blur-md">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--state-up)] shadow-[0_0_12px_var(--state-up)]" />
                  <span className="text-[0.7rem] font-bold uppercase tracking-[0.3em] text-[var(--text-primary)]">Terminal Active</span>
                </div>
                <div className="h-4 w-px bg-[rgba(255,255,255,0.1)]" />
                <div className="flex gap-6">
                  <div className="flex flex-col">
                    <span className="text-[0.55rem] uppercase tracking-widest text-[var(--text-muted)]">Bitcoin Pulse</span>
                    <span className="font-mono text-lg font-bold text-[var(--accent-gold)]">
                      ${currentBtcPrice?.toLocaleString() || '---'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[0.55rem] uppercase tracking-widest text-[var(--text-muted)]">Live PnL</span>
                    <span className={`font-mono text-lg font-bold ${Number(livePnL) >= 0 ? 'text-[var(--state-up)]' : 'text-[var(--state-down)]'}`}>
                      {livePnL} STT
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsLockedIn(false)}
                className="group flex items-center gap-3 rounded-full border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.05)] px-6 py-2 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--state-down)] transition-all hover:bg-[rgba(220,38,38,1)] hover:text-white"
              >
                Abort Focus
              </button>
            </div>

            {/* Immersive Layout */}
            <div className="grid h-full w-full grid-cols-1 pt-20 lg:grid-cols-[1fr_440px]">
              <div className="relative min-h-0 w-full p-4 lg:p-8">
                <PriceChart
                  tradeMarkers={tradeMarkers}
                  recentExecutions={pendingTrades}
                  onPriceUpdate={setCurrentBtcPrice}
                />
              </div>

              <div className="border-l border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.2)] p-4 lg:p-8 overflow-y-auto">
                <div className="flex flex-col gap-6">
                  <div className="rounded-[2rem] border border-[rgba(245,185,66,0.15)] bg-[rgba(245,185,66,0.03)] p-6">
                    <h3 className="text-[0.68rem] uppercase tracking-[0.4em] text-[var(--accent-gold)]">Command Module</h3>
                    <p className="mt-2 text-xl font-semibold tracking-tight text-[var(--text-primary)]">Execute fresh call</p>
                  </div>
                  
                  <TradePanel
                    selectedMarket={selectedMarket}
                    onClearSelection={() => setSelectedMarket(null)}
                    currentPrice={currentBtcPrice}
                    onTradeSubmitted={handleTradeSubmitted}
                  />
                  
                  <div className="rounded-[2rem] border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-6">
                    <h3 className="text-[0.62rem] uppercase tracking-[0.3em] text-[var(--text-muted)] italic">Core Resonance</h3>
                    <div className="mt-4 flex flex-col gap-3">
                      {positions.slice(0, 3).map((pos, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 text-xs">
                          <span className={pos.direction === 'UP' ? 'text-[var(--state-up)]' : 'text-[var(--state-down)]'}>{pos.direction}</span>
                          <span className="font-mono text-[var(--text-secondary)]">{formatTokenAmount(pos.stake_amount)} STT</span>
                          <span className="text-[var(--text-muted)] italic">#{pos.market_id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] ${showAccount || isLockedIn ? 'hidden' : ''}`}>
        <section className="flex min-w-0 flex-col gap-6">
          {walletError && (
            <div className="rounded-[1.55rem] border border-[rgba(220,38,38,0.22)] bg-[rgba(220,38,38,0.1)] px-5 py-4 text-sm text-[var(--text-primary)]">
              {walletError}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.65rem] border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.02)] px-6 py-4 backdrop-blur-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[var(--state-up)] shadow-[0_0_8px_var(--state-up)]" />
                <span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[var(--accent-gold)]">Arena Live</span>
              </div>
              <div className="hidden h-4 w-px bg-[color:var(--border-subtle)] sm:block" />
              <div className="flex gap-4">
                <StatPill label="Win Rate" value={`${((positionSummary?.win_rate || 0) * 100).toFixed(1)}%`} accent="gold" />
                <StatPill label="PnL" value={`${livePnL} STT`} accent={Number(positionSummary?.resolved_pnl || 0) >= 0 ? 'success' : 'danger'} />
                {authenticated && sttBalance !== null && (
                  <StatPill label="Balance" value={`${sttBalance} STT`} accent="gold" />
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsLockedIn(true)}
                className="flex items-center gap-2 rounded-full border border-[rgba(245,185,66,0.3)] bg-[rgba(245,185,66,0.08)] px-3 py-1 text-[0.62rem] uppercase tracking-[0.24em] text-[var(--accent-gold)] transition hover:bg-[var(--accent-gold)] hover:text-black"
              >
                Zen Focus
              </button>
              <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">BTC {currentBtcPrice ? `$${currentBtcPrice.toLocaleString()}` : '--'}</span>
              <div className="rounded-full border border-[rgba(245,185,66,0.18)] bg-[rgba(245,185,66,0.08)] px-3 py-1 text-[0.62rem] uppercase tracking-[0.24em] text-[var(--accent-gold)]">
                Somnia Pulse
              </div>
            </div>
          </div>

          <PriceChart
            tradeMarkers={tradeMarkers}
            recentExecutions={pendingTrades}
            onPriceUpdate={setCurrentBtcPrice}
          />

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-[color:var(--border-subtle)] pb-2">
              <button
                onClick={() => setSelectedTab('markets')}
                className={`px-4 py-2 text-[0.68rem] uppercase tracking-[0.34em] transition ${
                  selectedTab === 'markets' ? 'text-[var(--accent-gold)] border-b-2 border-[var(--accent-gold)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Markets
              </button>
              <button
                onClick={() => setSelectedTab('positions')}
                className={`px-4 py-2 text-[0.68rem] uppercase tracking-[0.34em] transition ${
                  selectedTab === 'positions' ? 'text-[var(--accent-gold)] border-b-2 border-[var(--accent-gold)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                My Positions ({positions.length})
              </button>
            </div>

            {selectedTab === 'markets' ? (
              <MarketFeed
                viewerAddress={viewerAddress || undefined}
                selectedMarketId={selectedMarket?.id}
                onJoinMarket={setSelectedMarket}
              />
            ) : (
              <div className="grid gap-3">
                {claimError && (
                  <div className="rounded-[1.35rem] border border-[rgba(220,38,38,0.25)] bg-[rgba(220,38,38,0.08)] px-5 py-4 text-sm text-[var(--state-down)]">
                    <span className="font-semibold">Claim failed: </span>{claimError}
                    <button onClick={() => setClaimError(null)} className="ml-3 underline opacity-70 hover:opacity-100">Dismiss</button>
                  </div>
                )}
                {positionsLoading ? (
                  <p className="py-10 text-center text-[0.68rem] uppercase tracking-[0.34em] text-[var(--text-muted)]">Loading positions...</p>
                ) : positions.length === 0 ? (
                  <p className="py-10 text-center text-[0.68rem] uppercase tracking-[0.34em] text-[var(--text-muted)]">No active positions</p>
                ) : (
                  positions.map((pos) => {
                    const canClaim = (pos.status === 'WIN' || pos.status === 'DRAW') && !pos.claimed;
                    const isClaiming = claimingMarketId === pos.market_id;
                    return (
                      <Panel key={`${pos.market_id}-${pos.direction}`} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <span className={`rounded-full border px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.24em] ${pos.direction === 'UP' ? 'text-[var(--state-up)] border-[var(--state-up)]/20' : 'text-[var(--state-down)] border-[var(--state-down)]/20'}`}>
                            {pos.direction}
                          </span>
                          <div>
                            <p className="font-heading text-lg tracking-tight text-[var(--text-primary)]">Market #{pos.market_id}</p>
                            <p className="text-[0.62rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">{formatTokenAmount(pos.stake_amount)} STT</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <CountdownTimer settlementDeadline={pos.settlement_deadline ? Math.floor(new Date(pos.settlement_deadline).getTime() / 1000) : null} />
                          {canClaim && (
                            <button
                              disabled={isClaiming}
                              onClick={() => void handleClaim(pos.market_id)}
                              className="rounded-full border border-[rgba(245,185,66,0.3)] bg-[rgba(245,185,66,0.08)] px-3 py-1 text-[0.68rem] uppercase tracking-[0.2em] text-[var(--accent-gold)] transition hover:bg-[var(--accent-gold)] hover:text-black disabled:opacity-50"
                            >
                              {isClaiming ? 'Claiming…' : pos.status === 'DRAW' ? 'Refund' : 'Claim'}
                            </button>
                          )}
                          {pos.claimed && (
                            <span className="text-[0.62rem] uppercase tracking-[0.2em] text-[var(--text-muted)]">Claimed</span>
                          )}
                        </div>
                      </Panel>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </section>

        <aside className="flex min-w-0 flex-col gap-6">
          <TradePanel
            selectedMarket={selectedMarket}
            onClearSelection={() => setSelectedMarket(null)}
            currentPrice={currentBtcPrice}
            onTradeSubmitted={handleTradeSubmitted}
          />
        </aside>
      </div>
    </div>
  );
};
