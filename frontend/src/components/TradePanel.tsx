'use client';

import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowUpRight,
  ExternalLink,
  Loader2,
  Radar,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useBitdrumWallet } from './BitdrumWalletProvider';
import { useMarketDetail } from '../hooks/useMarketDetail';
import { useSignal } from '../hooks/useSignal';
import { usePayoutBps } from '../hooks/usePayoutBps';
import {
  formatOraclePrice,
  formatTimeframe,
  formatTokenAmount,
  joinMarket,
  openMarket,
  type BitdrumDirection,
  type MarketRecord,
  type TradeExecutionRecord,
} from '../utils/bitdrum';
import { Eyebrow, Panel, StatPill } from './ObsidianPrimitives';

export const TradePanel = ({
  selectedMarket,
  onClearSelection,
  currentPrice,
  onTradeSubmitted,
}: {
  selectedMarket?: MarketRecord | null;
  onClearSelection?: () => void;
  currentPrice?: number | null;
  onTradeSubmitted?: (record: TradeExecutionRecord) => void;
}) => {
  const queryClient = useQueryClient();
  const { wallet, authenticated, connecting, connect } = useBitdrumWallet();

  const [stake, setStake] = useState('1');
  const [previewDirection, setPreviewDirection] = useState<BitdrumDirection>('UP');
  const [durationSeconds, setDurationSeconds] = useState(300);
  const [isPending, setIsPending] = useState(false);
  const [lastRecord, setLastRecord] = useState<TradeExecutionRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mode = selectedMarket ? 'join' : 'open';
  const activeTimeframeSeconds = Number(selectedMarket?.duration_seconds || durationSeconds);

  const { data: marketDetailData } = useMarketDetail(selectedMarket?.id, wallet?.address);
  const { data: signalData, isLoading: signalLoading } = useSignal(selectedMarket?.id, previewDirection, stake);
  const { data: payoutBps } = usePayoutBps();

  const activeMarket = selectedMarket?.id ? { ...selectedMarket, ...marketDetailData?.market } : null;
  const sttBalance = marketDetailData?.sttBalance ?? null;
  const signal = signalData?.signal;

  // Default to 50% (5000 bps) until the contract value loads.
  const effectivePayoutBps = payoutBps ?? 5000;

  const projectedProfit = useMemo(() => {
    const numericStake = Number(stake || '0');
    return numericStake * (effectivePayoutBps / 10_000);
  }, [effectivePayoutBps, stake]);

  const handleConnect = async () => {
    setError(null);
    try {
      await connect();
    } catch (caughtError: any) {
      setError(caughtError?.message || 'Wallet connection failed');
    }
  };

  const handleTrade = async (direction: BitdrumDirection) => {
    if (!authenticated || !wallet) {
      setError('Connect your wallet to lock a position.');
      return;
    }
    if (!stake || Number(stake) <= 0 || Number.isNaN(Number(stake))) {
      setError('Enter a valid STT stake.');
      return;
    }

    setError(null);
    setLastRecord(null);
    setIsPending(true);

    try {
      let tx: any;
      let kind: 'OPEN' | 'JOIN';
      let marketId: string | null = null;
      const timeframeSeconds = selectedMarket?.duration_seconds ?? durationSeconds;

      if (mode === 'open') {
        tx = await openMarket({
          wallet,
          direction,
          stake,
          durationSeconds: timeframeSeconds,
        });
        kind = 'OPEN';
      } else if (activeMarket?.id) {
        tx = await joinMarket({ wallet, marketId: activeMarket.id, direction, stake });
        kind = 'JOIN';
        marketId = activeMarket.id;
        onClearSelection?.();
      } else {
        throw new Error('No market selected');
      }

      const txHash: string = tx?.hash ?? '';
      const record: TradeExecutionRecord = {
        id: txHash || `${Date.now()}-${direction}`,
        kind,
        marketId,
        direction,
        stake,
        timeframeSeconds,
        entryPrice: formatOraclePrice(activeMarket?.entry_price) ?? currentPrice ?? null,
        txHash,
        explorerUrl: tx?.explorerUrl || '',
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        timestamp: Date.now(),
        error: null,
      };

      setLastRecord(record);
      onTradeSubmitted?.(record);

      if (txHash && tx?.wait) {
        tx.wait()
          .then(() => {
            const confirmed = { ...record, status: 'confirmed' as const };
            setLastRecord(confirmed);
            onTradeSubmitted?.(confirmed);
            void Promise.all([
              queryClient.invalidateQueries({ queryKey: ['feed'] }),
              queryClient.invalidateQueries({ queryKey: ['leaderboard'] }),
              queryClient.invalidateQueries({ queryKey: ['positions'] }),
              queryClient.invalidateQueries({ queryKey: ['market-detail-onchain'] }),
            ]);
          })
          .catch(() => {
            const failed = { ...record, status: 'failed' as const, error: 'Transaction reverted' };
            setLastRecord(failed);
            onTradeSubmitted?.(failed);
          });
      }
    } catch (caughtError: any) {
      setError(caughtError?.message || 'Trade execution failed');
    } finally {
      setIsPending(false);
    }
  };

  const coreDirection = signal?.direction || previewDirection;
  const coreConfidence = signal?.confidence ?? 52;
  const rationale = signal?.rationale || 'The Core is calibrating directional conviction from live market structure.';

  return (
    <Panel tone="gold" className="surface-lift overflow-hidden p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Eyebrow accent="gold">Command Module</Eyebrow>
          <h3 className="mt-3 font-heading text-[1.85rem] font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
            {mode === 'open' ? 'Lock a fresh call' : `Join market #${activeMarket?.id}`}
          </h3>
        </div>
        {mode === 'join' ? (
          <button
            onClick={onClearSelection}
            className="rounded-full border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            <span className="inline-flex items-center gap-2">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </span>
          </button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4">
        <div className="rounded-[1.85rem] border border-[rgba(59,130,246,0.16)] bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_42%),linear-gradient(145deg,#0f1218,#0a0d11)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Eyebrow accent="core">The Core</Eyebrow>
              <h4 className="mt-3 font-heading text-[1.45rem] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                Live intelligence pulse
              </h4>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(34,211,238,0.18)] bg-[rgba(34,211,238,0.08)] px-3 py-1.5 text-[0.66rem] uppercase tracking-[0.26em] text-[var(--accent-cyan)]">
              <Radar className="h-3.5 w-3.5" />
              {signalLoading ? 'Syncing' : 'Online'}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-[1.45rem] border border-[rgba(59,130,246,0.14)] bg-[rgba(59,130,246,0.04)] p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-[0.62rem] font-bold uppercase tracking-[0.24em] text-[var(--accent-cyan)]">
                  <Radar className="h-3.5 w-3.5" />
                  {signalLoading ? 'Calibrating...' : 'Core Intel'}
                </div>
                <div className={`rounded-full border px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.16em] ${coreDirection === 'UP' ? 'text-[var(--state-up)] border-[var(--state-up)]/20 bg-[var(--state-up)]/5' : 'text-[var(--state-down)] border-[var(--state-down)]/20 bg-[var(--state-down)]/5'}`}>
                  {coreDirection} {coreConfidence}%
                </div>
              </div>
              <p className="mt-4 text-[0.88rem] leading-6 text-[var(--text-secondary)]">
                {rationale}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <StatPill label="Confidence" value={`${coreConfidence}%`} accent="core" />
                <StatPill label="Payout" value={`+${(effectivePayoutBps / 100).toFixed(0)}%`} accent="gold" />
              </div>
            </div>
          </div>
        </div>

        {mode === 'join' && activeMarket ? (
          <div className="grid gap-3 sm:grid-cols-4">
            <StatPill label="UP Pool" value={`${formatTokenAmount(activeMarket.up_pool ?? activeMarket.long_pool)} STT`} accent="success" />
            <StatPill label="DOWN Pool" value={`${formatTokenAmount(activeMarket.down_pool ?? activeMarket.short_pool)} STT`} accent="danger" />
            <StatPill label="Window" value={activeMarket.duration_seconds ? formatTimeframe(activeMarket.duration_seconds) : 'Live'} accent="neutral" />
            <StatPill label="State" value={activeMarket.state} accent="gold" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {[60, 300].map((seconds) => (
              <button
                key={seconds}
                onClick={() => setDurationSeconds(seconds)}
                className={`rounded-full border px-4 py-3 text-[0.7rem] uppercase tracking-[0.28em] transition ${
                  durationSeconds === seconds
                    ? 'border-[rgba(245,185,66,0.24)] bg-[rgba(245,185,66,0.08)] text-[var(--accent-gold)]'
                    : 'border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)]'
                }`}
              >
                {formatTimeframe(seconds)}
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
          <label className="rounded-[1.45rem] border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] p-4">
            <span className="text-[0.68rem] uppercase tracking-[0.3em] text-[var(--text-muted)]">Stake</span>
            <div className="mt-3 flex items-end justify-between gap-4">
              <input
                value={stake}
                onChange={(event) => setStake(event.target.value)}
                className="w-full bg-transparent font-mono text-3xl font-semibold text-[var(--text-primary)] outline-none"
              />
              <span className="pb-1 text-sm text-[var(--text-secondary)]">STT</span>
            </div>
          </label>

          <div className="rounded-[1.45rem] border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] p-4">
            <span className="text-[0.68rem] uppercase tracking-[0.3em] text-[var(--text-muted)]">Wallet Status</span>
            <div className="mt-4 flex flex-wrap gap-3">
              <StatPill label="Mode" value={authenticated ? 'Connected' : 'Offline'} accent={authenticated ? 'success' : 'neutral'} />
              {sttBalance ? <StatPill label="Balance" value={`${formatTokenAmount(sttBalance.toString())} STT`} accent="neutral" /> : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {(['UP', 'DOWN'] as BitdrumDirection[]).map((direction) => {
            const active = previewDirection === direction;
            const isUp = direction === 'UP';
            return (
              <button
                key={direction}
                onClick={() => setPreviewDirection(direction)}
                className={`cta-press rounded-[2rem] border px-6 py-8 text-left transition-all duration-300 ${
                  active
                    ? isUp
                      ? 'border-[rgba(22,163,74,0.4)] bg-[radial-gradient(circle_at_top,rgba(22,163,74,0.18),transparent_60%),rgba(22,163,74,0.08)] shadow-[0_0_24px_rgba(22,163,74,0.16)]'
                      : 'border-[rgba(220,38,38,0.4)] bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.18),transparent_60%),rgba(220,38,38,0.08)] shadow-[0_0_24px_rgba(220,38,38,0.14)]'
                    : 'border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.05)]'
                }`}
              >
                <div className="text-[0.62rem] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)] opacity-80">
                  {isUp ? 'Bias higher' : 'Bias lower'}
                </div>
                <div className={`mt-4 font-heading text-4xl font-bold tracking-tight ${isUp ? 'text-[var(--state-up)]' : 'text-[var(--state-down)]'}`}>
                  {direction}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => (authenticated ? handleTrade(previewDirection) : handleConnect())}
          disabled={isPending || connecting}
          className="cta-press relative mt-2 flex w-full items-center justify-between overflow-hidden rounded-[2rem] border border-[rgba(245,185,66,0.3)] bg-[linear-gradient(135deg,var(--accent-gold),#d97706)] px-8 py-7 text-left text-[#140c00] shadow-[0_18px_48px_rgba(245,185,66,0.15)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_64px_rgba(245,185,66,0.22)] disabled:cursor-not-allowed disabled:opacity-65"
        >
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)] -translate-x-full animate-[shimmer_2s_infinite]" />
          <div className="relative">
            <div className="text-[0.62rem] font-black uppercase tracking-[0.3em] text-[#4d3300] opacity-60">
              {authenticated ? 'Transaction ready' : 'Security layer'}
            </div>
            <div className="mt-2 font-heading text-2xl font-bold tracking-tight">
              {isPending ? 'Executing order...' : authenticated ? 'Place Trade' : 'Connect Somnia Wallet'}
            </div>
          </div>
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-black/10">
            {isPending || connecting ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : authenticated ? (
              <ArrowUpRight className="h-6 w-6" />
            ) : (
              <Wallet className="h-6 w-6" />
            )}
          </div>
        </button>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.4rem] border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.02)] p-4 text-center">
            <div className="text-[0.58rem] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">Reward</div>
            <div className="mt-3 font-heading text-xl font-bold text-[var(--state-up)]">
              {formatTokenAmount(String(Number(stake || '0') + projectedProfit))}
              <span className="ml-1 text-[0.6rem] font-medium opacity-50">STT</span>
            </div>
          </div>
          <div className="rounded-[1.4rem] border border-[rgba(220,38,38,0.14)] bg-[rgba(220,38,38,0.06)] p-4 text-center">
            <div className="text-[0.58rem] font-bold uppercase tracking-[0.24em] text-[var(--state-down)]">Risk</div>
            <div className="mt-3 font-heading text-xl font-bold text-[var(--text-primary)]">
              {formatTokenAmount(stake || '0')}
              <span className="ml-1 text-[0.6rem] font-medium opacity-50">STT</span>
            </div>
          </div>
          <div className="rounded-[1.4rem] border border-[rgba(59,130,246,0.14)] bg-[rgba(59,130,246,0.06)] p-4 text-center">
            <div className="text-[0.58rem] font-bold uppercase tracking-[0.24em] text-[var(--accent-core)]">Period</div>
            <div className="mt-3 font-heading text-xl font-bold text-[var(--text-primary)]">
              {formatTimeframe(activeTimeframeSeconds)}
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-[1.4rem] border border-[rgba(220,38,38,0.22)] bg-[rgba(220,38,38,0.1)] px-4 py-4 text-sm text-[var(--text-primary)]">
            {error}
          </div>
        ) : null}

        {lastRecord ? (
          <div className="rounded-[1.4rem] border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.3em] text-[var(--text-muted)]">Latest action</p>
                <p className="mt-2 text-sm text-[var(--text-primary)]">
                  {lastRecord.kind} · {lastRecord.direction} · {lastRecord.stake} STT
                </p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-[0.66rem] uppercase tracking-[0.24em] ${
                lastRecord.status === 'confirmed'
                  ? 'border-[rgba(22,163,74,0.22)] bg-[rgba(22,163,74,0.08)] text-[var(--state-up)]'
                  : lastRecord.status === 'failed'
                    ? 'border-[rgba(220,38,38,0.22)] bg-[rgba(220,38,38,0.1)] text-[var(--state-down)]'
                    : 'border-[rgba(245,185,66,0.18)] bg-[rgba(245,185,66,0.08)] text-[var(--accent-gold)]'
              }`}>
                {lastRecord.status}
              </span>
            </div>
            {lastRecord.explorerUrl ? (
              <a
                href={lastRecord.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              >
                View transaction
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        ) : null}

        {!authenticated ? (
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="cta-press inline-flex items-center justify-center gap-3 rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] px-5 py-3 text-sm text-[var(--text-primary)] transition hover:border-[rgba(245,185,66,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4 text-[var(--accent-gold)]" />
            {connecting ? 'Connecting wallet...' : 'Connect wallet to arm the module'}
          </button>
        ) : null}
      </div>
    </Panel>
  );
};
