'use client';

import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowUpRight,
  BrainCircuit,
  ExternalLink,
  Loader2,
  Radar,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useBitdrumWallet } from './BitdrumWalletProvider';
import { useMarketDetail } from '../hooks/useMarketDetail';
import { useSignal } from '../hooks/useSignal';
import { usePom } from '../hooks/usePom';
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

function signalDirectionTone(direction: string) {
  if (direction === 'UP') return 'text-[var(--state-up)]';
  if (direction === 'DOWN') return 'text-[var(--state-down)]';
  return 'text-[var(--text-primary)]';
}

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
  const { data: pomData } = usePom(selectedMarket?.id, previewDirection, stake);

  const activeMarket = selectedMarket?.id ? { ...selectedMarket, ...marketDetailData?.market } : null;
  const sttBalance = marketDetailData?.sttBalance ?? null;
  const signal = signalData?.signal;
  const pom = pomData?.pom;

  const currentPomBps = useMemo(() => {
    if (pom?.pom_profit_bps) return Number(pom.pom_profit_bps);
    if (signal?.pom_profit_bps) return Number(signal.pom_profit_bps);
    if (activeMarket?.pom_profit_bps) return Number(activeMarket.pom_profit_bps);
    return 1000;
  }, [activeMarket?.pom_profit_bps, pom?.pom_profit_bps, signal?.pom_profit_bps]);

  const projectedProfit = useMemo(() => {
    const numericStake = Number(stake || '0');
    return numericStake * (currentPomBps / 10_000);
  }, [currentPomBps, stake]);

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
        const resolvedCurrentPrice = currentPrice ?? formatOraclePrice(activeMarket?.entry_price) ?? null;

        if (!resolvedCurrentPrice) {
          throw new Error('Live BTC strike price is unavailable right now.');
        }

        tx = await openMarket({
          wallet,
          direction,
          stake,
          durationSeconds: timeframeSeconds,
          currentPrice: resolvedCurrentPrice,
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

          <div className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="flex justify-center lg:justify-start">
              <div className="core-ring h-[14rem] w-[14rem]">
                <div className="core-ring__inner">
                  <span className={`text-[0.72rem] uppercase tracking-[0.32em] ${signalDirectionTone(coreDirection)}`}>
                    {coreDirection}
                  </span>
                  <strong className="mt-3 font-mono text-4xl font-semibold text-[var(--text-primary)]">
                    {coreConfidence}%
                  </strong>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-[1.45rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                <div className="flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.3em] text-[var(--accent-cyan)]">
                  <BrainCircuit className="h-4 w-4" />
                  Rationale
                </div>
                <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{rationale}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatPill label="Direction" value={coreDirection} accent={coreDirection === 'UP' ? 'success' : 'danger'} />
                <StatPill label="Confidence" value={`${coreConfidence}%`} accent="core" />
                <StatPill label="POM" value={`+${(currentPomBps / 100).toFixed(0)}%`} accent="gold" />
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
          <div className="grid gap-3 sm:grid-cols-3">
            {[30, 60, 300].map((seconds) => (
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

        <div className="grid gap-3 sm:grid-cols-3">
          {(['UP', 'DOWN'] as BitdrumDirection[]).map((direction) => {
            const active = previewDirection === direction;
            const isUp = direction === 'UP';
            return (
              <button
                key={direction}
                onClick={() => setPreviewDirection(direction)}
                className={`cta-press rounded-[1.65rem] border px-5 py-6 text-left transition ${
                  active
                    ? isUp
                      ? 'border-[rgba(22,163,74,0.28)] bg-[radial-gradient(circle_at_top,rgba(22,163,74,0.16),transparent_52%),rgba(22,163,74,0.08)] shadow-[0_0_24px_rgba(22,163,74,0.14)]'
                      : 'border-[rgba(220,38,38,0.28)] bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.16),transparent_52%),rgba(220,38,38,0.08)] shadow-[0_0_24px_rgba(220,38,38,0.12)]'
                    : 'border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(245,185,66,0.18)]'
                }`}
              >
                <div className="text-[0.68rem] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                  {isUp ? 'Call Higher' : 'Call Lower'}
                </div>
                <div className={`mt-3 font-heading text-3xl font-semibold tracking-[-0.05em] ${isUp ? 'text-[var(--state-up)]' : 'text-[var(--state-down)]'}`}>
                  {direction}
                </div>
              </button>
            );
          })}

          <button
            onClick={() => (authenticated ? handleTrade(previewDirection) : handleConnect())}
            disabled={isPending || connecting}
            className="cta-press rounded-[1.8rem] border border-[rgba(245,185,66,0.2)] bg-[linear-gradient(135deg,var(--accent-gold),#d97706)] px-5 py-6 text-left text-[#140c00] shadow-[0_0_30px_rgba(245,185,66,0.18)] disabled:cursor-not-allowed disabled:opacity-65"
          >
            <div className="text-[0.68rem] uppercase tracking-[0.3em] text-[#4d3300]">
              {authenticated ? 'Confirm Order' : 'Wallet Required'}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="font-heading text-2xl font-semibold tracking-[-0.05em]">
                {isPending ? 'Submitting...' : authenticated ? 'Lock Position' : 'Connect Wallet'}
              </span>
              {isPending || connecting ? <Loader2 className="h-5 w-5 animate-spin" /> : authenticated ? <ArrowUpRight className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
            </div>
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] p-4">
            <div className="text-[0.68rem] uppercase tracking-[0.3em] text-[var(--text-muted)]">If You’re Right</div>
            <div className="mt-3 font-mono text-2xl text-[var(--text-primary)]">
              {formatTokenAmount(String(Number(stake || '0') + projectedProfit))} STT
            </div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">You Called It Right</p>
          </div>
          <div className="rounded-[1.35rem] border border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.08)] p-4">
            <div className="text-[0.68rem] uppercase tracking-[0.3em] text-[var(--state-down)]">If Wrong</div>
            <div className="mt-3 font-mono text-2xl text-[var(--text-primary)]">0.00 STT</div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Market Moved Against You</p>
          </div>
          <div className="rounded-[1.35rem] border border-[rgba(59,130,246,0.16)] bg-[rgba(59,130,246,0.07)] p-4">
            <div className="text-[0.68rem] uppercase tracking-[0.3em] text-[var(--accent-core)]">Round</div>
            <div className="mt-3 font-mono text-2xl text-[var(--text-primary)]">{formatTimeframe(activeTimeframeSeconds)}</div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Somnia-settled binary market</p>
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
