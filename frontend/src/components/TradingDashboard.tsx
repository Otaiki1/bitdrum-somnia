'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, LogOut, Menu, Wallet, ExternalLink, TrendingUp, TrendingDown, Trophy, X } from 'lucide-react';
import { PriceChart, type TradeMarker } from './PriceChart';
import { TradePanel } from './TradePanel';
import { LeaderboardCard, MarketFeed } from './SocialFeed';
import { useBitdrumWallet } from './BitdrumWalletProvider';
import {
  claimMarket,
  formatTimeframe,
  formatTokenAmount,
  shortAddress,
  formatOraclePrice,
  type MarketRecord,
  type TradeExecutionRecord,
} from '../utils/bitdrum';
import { API_BASE, WS_URL } from '../utils/somnia';

// ─── Win / Lose Modal ───────────────────────────────────────────────────────

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg">
      {/* Animated glow background */}
      <div
        className={`absolute inset-0 pointer-events-none ${
          isWin
            ? 'bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15)_0%,transparent_70%)]'
            : isDraw
              ? 'bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.12)_0%,transparent_70%)]'
              : 'bg-[radial-gradient(ellipse_at_center,rgba(244,63,94,0.15)_0%,transparent_70%)]'
        }`}
      />

      <div
        className={`relative w-full max-w-sm overflow-hidden rounded-3xl border p-8 shadow-2xl ${
          isWin
            ? 'border-emerald-500/30 bg-[#0a120e]'
            : isDraw
              ? 'border-orange-500/20 bg-[#12100a]'
              : 'border-rose-500/30 bg-[#120a0a]'
        }`}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl border border-white/10 bg-white/5 p-1.5 text-slate-400 transition hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-full border-2 ${
              isWin
                ? 'border-emerald-500/40 bg-emerald-500/10'
                : isDraw
                  ? 'border-orange-500/30 bg-orange-500/10'
                  : 'border-rose-500/40 bg-rose-500/10'
            }`}
          >
            {isWin ? (
              <Trophy className="h-10 w-10 text-emerald-400" />
            ) : isDraw ? (
              <span className="text-3xl">🤝</span>
            ) : (
              <span className="text-3xl">💸</span>
            )}
          </div>

          <div className="text-center">
            <h2
              className={`text-3xl font-black uppercase italic tracking-tight ${
                isWin ? 'text-emerald-300' : isDraw ? 'text-orange-300' : 'text-rose-300'
              }`}
            >
              {isWin ? 'You Won!' : isDraw ? 'Draw' : 'You Lost'}
            </h2>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.32em] text-slate-500">
              Market #{position.market_id} · {position.direction.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-500">Stake</p>
            <p className="mt-1 font-mono text-sm font-bold text-white">
              {formatTokenAmount(position.stake_amount)} WBTC
            </p>
          </div>
          <div
            className={`rounded-2xl border p-3 text-center ${
              isWin
                ? 'border-emerald-500/20 bg-emerald-500/10'
                : isDraw
                  ? 'border-orange-500/20 bg-orange-500/10'
                  : 'border-rose-500/20 bg-rose-500/10'
            }`}
          >
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-500">PnL</p>
            <p
              className={`mt-1 font-mono text-sm font-bold ${
                isWin ? 'text-emerald-300' : isDraw ? 'text-orange-300' : 'text-rose-300'
              }`}
            >
              {isWin || isDraw ? '+' : ''}
              {formatTokenAmount(position.net_pnl)} WBTC
            </p>
          </div>
        </div>

        {/* Entry / settlement prices */}
        {(position.entry_price || position.settlement_price) ? (
          <div className="mb-6 rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
              <div>
                Entry
                <div className="mt-0.5 font-mono text-white">
                  ${formatOraclePrice(position.entry_price)?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '--'}
                </div>
              </div>
              <div>
                Settlement
                <div className="mt-0.5 font-mono text-white">
                  ${formatOraclePrice(position.settlement_price)?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '--'}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <button
          onClick={onClose}
          className={`w-full rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.2em] transition ${
            isWin
              ? 'bg-emerald-500 text-white hover:bg-emerald-400'
              : isDraw
                ? 'bg-orange-500 text-white hover:bg-orange-400'
                : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >
          {isWin ? 'Collect Winnings' : isDraw ? 'Close' : 'Trade Again'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

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
  const [livePositionsPayload, setLivePositionsPayload] = useState<any | null>(null);

  // Trade execution records for chart markers
  const [pendingTrades, setPendingTrades] = useState<TradeExecutionRecord[]>([]);

  // Outcome modal
  const [outcomeModal, setOutcomeModal] = useState<{ outcome: 'WIN' | 'LOSS' | 'DRAW'; position: any } | null>(null);
  const seenOutcomes = useRef<Set<string>>(new Set());

  const viewerAddress = address ?? '';

  const positionsQuery = useQuery({
    queryKey: ['positions', viewerAddress],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/positions/${viewerAddress}`);
      if (!response.ok) throw new Error('Unable to load positions');
      return response.json();
    },
    enabled: Boolean(viewerAddress),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!viewerAddress) {
      setLivePositionsPayload(null);
      return;
    }

    const params = new URLSearchParams({
      channel: 'positions',
      address: viewerAddress,
    });

    const socket = new WebSocket(`${WS_URL}?${params.toString()}`);
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data?.payload?.positions) {
        setLivePositionsPayload(data.payload);
      }
    };

    socket.onerror = () => setLivePositionsPayload(null);

    return () => socket.close();
  }, [viewerAddress]);

  const positionSummary = livePositionsPayload?.summary ?? positionsQuery.data?.summary;
  const positions = livePositionsPayload?.positions ?? positionsQuery.data?.positions ?? [];

  // ── Show win/lose modal when a position resolves ───────────────────────────
  useEffect(() => {
    for (const pos of positions) {
      const key = `${pos.market_id}-${pos.direction}`;
      if (seenOutcomes.current.has(key)) continue;
      if (pos.status === 'WIN' || pos.status === 'LOSS' || pos.status === 'DRAW') {
        seenOutcomes.current.add(key);
        setOutcomeModal({ outcome: pos.status as 'WIN' | 'LOSS' | 'DRAW', position: pos });
        break; // show one at a time
      }
    }
  }, [positions]);

  const livePnL = useMemo(
    () => formatTokenAmount(positionSummary?.resolved_pnl || '0'),
    [positionSummary?.resolved_pnl],
  );

  // ── Trade markers for PriceChart ──────────────────────────────────────────
  const tradeMarkers = useMemo<TradeMarker[]>(() => {
    const markers: TradeMarker[] = [];

    // From pending/confirmed local trades
    for (const t of pendingTrades) {
      if (t.status === 'failed') continue;
      if (!t.entryPrice) continue;

      markers.push({
        time: Math.floor(new Date(t.submittedAt).getTime() / 1000),
        price: t.entryPrice,
        direction: t.direction,
        label: `${t.direction} ${t.stake} WBTC`,
      });
    }

    // From settled positions with a known entry price
    for (const pos of positions) {
      if (!pos.entry_price) continue;
      const key = `${pos.market_id}-${pos.direction}`;
      if (markers.some((m) => m.label.includes(key))) continue;
      const entryPrice = formatOraclePrice(pos.entry_price);
      if (!entryPrice) continue;
      markers.push({
        time: pos.opened_at ? Math.floor(new Date(pos.opened_at).getTime() / 1000) : Math.floor(Date.now() / 1000),
        price: entryPrice,
        direction: pos.direction.toUpperCase() === 'LONG' || pos.direction.toUpperCase() === 'UP' ? 'UP' : 'DOWN',
        label: `${pos.direction} #${pos.market_id}`,
      });
    }

    return markers;
  }, [pendingTrades, positions]);

  const handleTradeSubmitted = (record: TradeExecutionRecord) => {
    setPendingTrades((prev) => {
      const existing = prev.findIndex((t) => t.txHash === record.txHash);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = record;
        return updated.slice(0, 8);
      }
      return [record, ...prev].slice(0, 8);
    });
  };

  const handleAuth = async () => {
    if (authenticated) { setShowAccount(true); return; }
    try { await connect(); setShowAccount(true); } catch { /* surfaced by provider */ }
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
    <div className="relative min-h-screen bg-[#0a0a0a] p-4 text-white selection:bg-orange-500 selection:text-white md:p-8">

      {/* Win / Lose Modal */}
      {outcomeModal ? (
        <OutcomeModal
          outcome={outcomeModal.outcome}
          position={outcomeModal.position}
          onClose={() => setOutcomeModal(null)}
        />
      ) : null}

      {/* Account Modal */}
      {showAccount ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="glass-morphism relative w-full max-w-2xl overflow-hidden border border-white/10 p-8 shadow-2xl">
            <div className="absolute right-0 top-0 -z-10 h-40 w-40 bg-orange-500/10 blur-3xl" />
            <div className="mb-8 flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-black uppercase italic tracking-tight text-white">
                  Somnia Wallet Session
                </h2>
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.32em] text-slate-500">
                  Wallet Access
                </p>
              </div>
              <button
                onClick={() => setShowAccount(false)}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-white/20"
              >
                <LogOut className="h-5 w-5 rotate-180" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-300">Wallet Label</p>
                  <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-3 font-mono text-xs text-slate-200">
                    {username || 'Injected Wallet'}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Execution Wallet</p>
                  <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-3 font-mono text-xs text-white">
                    {viewerAddress || 'DISCONNECTED'}
                  </div>
                </div>
              </div>
              <div className="space-y-5">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Session Mode</p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">
                    Connect an injected EVM wallet on Somnia Shannon or mainnet to manage approvals and trades.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => void openProfile()}
                    className="rounded-xl bg-orange-500 px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-black transition hover:bg-orange-400"
                  >
                    Open Explorer Profile
                  </button>
                  <button
                    onClick={() => void handleDisconnect()}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 transition hover:border-rose-500/40 hover:text-rose-200"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Nav */}
      <nav className="mb-10 flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient shadow-lg shadow-orange-500/20">
            <span className="text-2xl font-black italic text-white">BD</span>
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tight">BitDrum</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Intelligence Protocol</p>
          </div>
        </div>

        <div className="hidden flex-1 items-center gap-8 px-10 md:flex">
          <button className="border-b-2 border-orange-500 pb-1 text-xs font-black uppercase italic tracking-tight text-orange-300">
            Trading
          </button>
          <button
            onClick={() => authenticated && setShowAccount(true)}
            className="border-b-2 border-transparent pb-1 text-xs font-black uppercase italic tracking-tight text-slate-500 transition hover:border-white/20 hover:text-white"
          >
            Wallet
          </button>
          <button className="border-b-2 border-transparent pb-1 text-xs font-black uppercase italic tracking-tight text-slate-500 transition hover:border-white/20 hover:text-white">
            Leaderboard
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative rounded-xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10">
            <Bell className="h-5 w-5 text-slate-400" />
            <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-500" />
          </button>

          {authenticated ? (
            <button
              onClick={() => setShowAccount(true)}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 transition hover:border-orange-500/40 hover:bg-orange-500/10"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-gradient text-xs font-bold text-white">
                {viewerAddress ? viewerAddress.slice(2, 4).toUpperCase() : 'BD'}
              </div>
              <span className="text-sm font-bold tracking-tight text-slate-200">{identityLabel}</span>
            </button>
          ) : (
            <button
              onClick={() => void handleAuth()}
              disabled={connecting}
              className="flex items-center gap-3 rounded-2xl border border-orange-500/40 bg-orange-500/10 px-6 py-3 text-sm font-black uppercase italic tracking-tight text-orange-200 transition hover:bg-orange-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Wallet className="h-5 w-5" />
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}

          <button className="rounded-xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10 md:hidden">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {walletError ? (
        <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          {walletError}
        </div>
      ) : null}

      {/* Pending trades banner */}
      {pendingTrades.length > 0 ? (
        <div className="mb-6 flex flex-col gap-2">
          {pendingTrades.slice(0, 3).map((t) => (
            <div
              key={t.id}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-xs transition ${
                t.status === 'confirmed'
                  ? 'border-emerald-500/20 bg-emerald-500/10'
                  : t.status === 'failed'
                    ? 'border-rose-500/20 bg-rose-500/10'
                    : 'border-orange-500/20 bg-orange-500/10'
              }`}
            >
              <div className="flex items-center gap-3">
                {t.direction === 'UP' ? (
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-rose-400" />
                )}
                <span className="font-black uppercase tracking-widest text-white">
                  {t.direction} · {t.stake} WBTC
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                    t.status === 'confirmed'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : t.status === 'failed'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-orange-500/20 text-orange-300'
                  }`}
                >
                  {t.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {t.explorerUrl ? (
                  <a
                    href={t.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-300 transition hover:text-white"
                  >
                    Explorer <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ) : null}
                <button
                  onClick={() => setPendingTrades((p) => p.filter((x) => x.id !== t.id))}
                  className="rounded-full p-1 text-slate-500 transition hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <main
        className={`grid grid-cols-1 gap-6 transition-all lg:grid-cols-12 ${showAccount ? 'blur-xl opacity-20' : 'opacity-100'}`}
      >
        <div className="flex flex-col gap-6 lg:col-span-8">
          <PriceChart
            tradeMarkers={tradeMarkers}
            recentExecutions={pendingTrades}
            onPriceUpdate={setCurrentBtcPrice}
          />

          {/* Active Positions */}
          <div className="glass-morphism">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold uppercase tracking-tight text-white">Active Predictions</h3>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Live Portfolio</p>
              </div>
              <div className="flex gap-2">
                <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-300">
                  Win Rate {((positionSummary?.win_rate || 0) * 100).toFixed(1)}%
                </span>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200">
                  PnL {livePnL} WBTC
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {positionsQuery.isLoading && !positions.length ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs uppercase tracking-[0.3em] text-slate-500">
                  Reading positions
                </div>
              ) : positions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs uppercase tracking-[0.3em] text-slate-500">
                  {authenticated ? 'No active stakes yet' : 'Connect wallet to load positions'}
                </div>
              ) : (
                positions.map((position: any) => (
                  <article
                    key={`${position.market_id}-${position.direction}`}
                    className={`rounded-2xl border p-4 transition ${
                      position.status === 'WIN'
                        ? 'border-emerald-500/20 bg-emerald-500/5'
                        : position.status === 'LOSS'
                          ? 'border-rose-500/20 bg-rose-500/5'
                          : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Market #{position.market_id} · {position.direction.toUpperCase()}
                        </p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.26em] text-slate-500">
                          {position.status}
                        </p>
                        {position.duration_seconds ? (
                          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.24em] text-orange-300">
                            {formatTimeframe(position.duration_seconds)}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        {(position.status === 'WIN' || position.status === 'LOSS' || position.status === 'DRAW') ? (
                          <button
                            onClick={() => setOutcomeModal({ outcome: position.status, position })}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-300 transition hover:text-white"
                          >
                            Details
                          </button>
                        ) : null}
                        {position.can_claim ? (
                          <button
                            onClick={() => handleClaim(position.market_id)}
                            disabled={claimingMarketId === position.market_id}
                            className="rounded-full border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {claimingMarketId === position.market_id ? 'Claiming' : 'Claim'}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-400">
                      <div>
                        Stake
                        <div className="mt-1 font-mono text-white">{formatTokenAmount(position.stake_amount)} WBTC</div>
                      </div>
                      <div>
                        Payout
                        <div className="mt-1 font-mono text-white">{formatTokenAmount(position.expected_payout)} WBTC</div>
                      </div>
                      <div>
                        Net PnL
                        <div className={`mt-1 font-mono ${Number(position.net_pnl) > 0 ? 'text-emerald-300' : Number(position.net_pnl) < 0 ? 'text-rose-300' : 'text-white'}`}>
                          {formatTokenAmount(position.net_pnl)} WBTC
                        </div>
                      </div>
                    </div>
                    {position.transaction_hash ? (
                      <a
                        href={`https://sepolia.voyager.online/tx/${position.transaction_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 transition hover:text-white"
                      >
                        View Transaction
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-4">
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
        </div>
      </main>

      <footer
        className={`mt-20 flex flex-col items-center justify-between gap-4 border-t border-white/5 py-8 opacity-30 grayscale transition-all duration-700 hover:opacity-100 hover:grayscale-0 md:flex-row ${showAccount ? 'blur-xl' : ''}`}
      >
        <p className="text-xs font-bold tracking-widest">STARKNET PREDICTION PROTOCOL 2026</p>
        <div className="flex gap-6 text-xs font-black uppercase">
          <span className="transition-colors hover:text-orange-500">Twitter</span>
          <span className="transition-colors hover:text-orange-500">Discord</span>
          <span className="transition-colors hover:text-orange-500">Docs</span>
        </div>
      </footer>
    </div>
  );
};
