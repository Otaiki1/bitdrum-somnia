'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import { useBitdrumWallet } from './BitdrumWalletProvider';
import { API_BASE } from '../utils/somnia';
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

function signalTone(direction: string) {
  if (direction === 'UP') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (direction === 'DOWN') return 'border-rose-500/30 bg-rose-500/10 text-rose-200';
  return 'border-white/10 bg-white/5 text-slate-300';
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

  const [stake, setStake] = useState('0.001');
  const [previewDirection, setPreviewDirection] = useState<BitdrumDirection>('UP');
  const [isPending, setIsPending] = useState(false);
  const [lastRecord, setLastRecord] = useState<TradeExecutionRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mode = selectedMarket ? 'join' : 'open';
  const activeTimeframeSeconds = Number(selectedMarket?.duration_seconds || 300);

  const marketDetailQuery = useQuery({
    queryKey: ['market-detail', selectedMarket?.id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/markets/${selectedMarket?.id}`);
      if (!response.ok) throw new Error('Unable to load selected market');
      return response.json();
    },
    enabled: Boolean(selectedMarket?.id),
    refetchInterval: selectedMarket?.id ? 30_000 : false,
  });

  const signalQuery = useQuery({
    queryKey: ['signal', selectedMarket?.id ?? 'preview', previewDirection, stake, activeTimeframeSeconds],
    queryFn: async () => {
      const url = selectedMarket?.id
        ? `${API_BASE}/signal/${selectedMarket.id}`
        : `${API_BASE}/signal/preview?direction=${previewDirection}&stake=${stake}`;
      const response = await fetch(url);
      // Treat non-ok as a soft failure — fall through to undefined data
      if (!response.ok) return null;
      return response.json();
    },
    refetchInterval: selectedMarket?.id ? 30_000 : 30_000,
  });

  const pomQuery = useQuery({
    queryKey: ['pom', selectedMarket?.id ?? 'preview', previewDirection, stake, activeTimeframeSeconds],
    queryFn: async () => {
      const url = selectedMarket?.id
        ? `${API_BASE}/pom/${selectedMarket.id}`
        : `${API_BASE}/pom/preview?direction=${previewDirection}&stake=${stake}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      return response.json();
    },
    refetchInterval: selectedMarket?.id ? 30_000 : 30_000,
  });

  const activeMarket = selectedMarket?.id
    ? { ...selectedMarket, ...marketDetailQuery.data?.market }
    : null;

  const signal = signalQuery.data?.signal;
  const pom = pomQuery.data?.pom;

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
      setError('Connect a Somnia wallet to trade.');
      return;
    }
    if (!stake || Number(stake) <= 0 || Number.isNaN(Number(stake))) {
      setError('Enter a valid WBTC stake.');
      return;
    }

    setError(null);
    setLastRecord(null);
    setIsPending(true);

    try {
      let tx: any;
      let kind: 'OPEN' | 'JOIN';
      let marketId: string | null = null;
      const timeframeSeconds = Number(activeMarket?.duration_seconds || 300);

      if (mode === 'open') {
        const resolvedCurrentPrice =
          currentPrice ?? formatOraclePrice(activeMarket?.entry_price) ?? null;

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

      // Fire-and-forget confirmation tracking
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
              queryClient.invalidateQueries({ queryKey: ['market-detail'] }),
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

  return (
    <div className="glass-morphism flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-orange-500/20 p-2.5">
            <ShieldCheck className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold uppercase italic tracking-tight text-white">
              {mode === 'open' ? 'Execution Engine' : `Join Market #${activeMarket?.id}`}
            </h3>
            <p className="mt-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
              <Zap className="h-3 w-3 text-orange-400" />
              Somnia + Dynamic POM
            </p>
          </div>
        </div>

        {mode === 'join' ? (
          <button
            onClick={onClearSelection}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-300 transition hover:border-white/20"
          >
            <ArrowLeft className="h-3 w-3" />
            Back
          </button>
        ) : null}
      </div>

      {mode === 'join' && activeMarket ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
              Live Pool
            </span>
            <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-orange-200">
              {activeMarket.state}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">UP Pool</p>
              <p className="mt-1 font-mono">{formatTokenAmount(activeMarket.up_pool ?? activeMarket.long_pool)} WBTC</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">DOWN Pool</p>
              <p className="mt-1 font-mono">{formatTokenAmount(activeMarket.down_pool ?? activeMarket.short_pool)} WBTC</p>
            </div>
            {activeMarket.duration_seconds ? (
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Timeframe</p>
                <p className="mt-1 font-mono">{formatTimeframe(activeMarket.duration_seconds)}</p>
              </div>
            ) : null}
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Direction</p>
              <p className="mt-1 font-mono">{activeMarket.direction || 'Live Market'}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/20 p-2">
          {(['UP', 'DOWN'] as BitdrumDirection[]).map((direction) => (
            <button
              key={direction}
              onClick={() => setPreviewDirection(direction)}
              className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.28em] transition ${
                previewDirection === direction
                  ? 'bg-orange-500/10 text-orange-200'
                  : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              Preview {direction}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
          Stake (WBTC)
        </label>
        <input
          type="number"
          min="0"
          value={stake}
          onChange={(event) => setStake(event.target.value)}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-white outline-none transition focus:border-orange-500/40"
          placeholder="0.00"
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange-300" />
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
              Signal Layer
            </span>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] ${signalTone(
              signal?.direction || 'NEUTRAL',
            )}`}
          >
            {signal?.direction || 'NEUTRAL'}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-slate-300">
          {signalQuery.isLoading
            ? 'Synthesizing rationale from the latest protocol context.'
            : signal?.rationale || 'Waiting for the AI agent to return a rationale.'}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-400">
          <div>
            Confidence
            <div className="mt-1 font-mono text-white">{signal?.confidence ?? '--'}%</div>
          </div>
          <div>
            POM
            <div className="mt-1 font-mono text-white">{(currentPomBps / 100).toFixed(2)}%</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.26em] text-slate-500">
          <span>Projected Profit</span>
          <span className="text-emerald-300">+{projectedProfit.toFixed(6)} WBTC</span>
        </div>
        <div className="text-xs text-slate-400">
          If the trade settles in your favour at {(currentPomBps / 100).toFixed(2)}%, your payout
          estimate is {(Number(stake || '0') + projectedProfit).toFixed(6)} WBTC.
        </div>
      </div>

      {/* Transaction Status Card */}
      {lastRecord ? (
        <div
          className={`rounded-2xl border p-3 text-xs transition-all ${
            lastRecord.status === 'confirmed'
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : lastRecord.status === 'failed'
                ? 'border-rose-500/30 bg-rose-500/10'
                : 'border-orange-500/20 bg-orange-500/10'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {lastRecord.status === 'submitted' ? (
                <Loader2 className="h-3 w-3 animate-spin text-orange-400" />
              ) : null}
              <span
                className={`font-black uppercase tracking-widest ${
                  lastRecord.status === 'confirmed'
                    ? 'text-emerald-300'
                    : lastRecord.status === 'failed'
                      ? 'text-rose-300'
                      : 'text-orange-300'
                }`}
              >
                {lastRecord.status === 'submitted'
                  ? 'Submitted — awaiting confirmation'
                  : lastRecord.status === 'confirmed'
                    ? '✓ Transaction confirmed'
                    : '✗ Transaction failed'}
              </span>
            </div>
            {lastRecord.explorerUrl ? (
              <a
                href={lastRecord.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-300 transition hover:text-white"
            >
                Explorer
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            ) : null}
          </div>
          {lastRecord.error ? (
            <p className="mt-1 text-rose-300">{lastRecord.error}</p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-200">
          {error}
        </div>
      ) : null}

      {!authenticated ? (
        <button
          onClick={() => void handleConnect()}
          disabled={connecting}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3 text-[10px] font-black uppercase tracking-[0.28em] text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Wallet className="h-4 w-4" />
          {connecting ? 'Connecting Wallet...' : 'Connect Wallet To Trade'}
        </button>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <button
          disabled={isPending || (mode === 'join' && activeMarket?.state !== 'OPEN')}
          onClick={() => handleTrade('UP')}
          className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/80 px-4 py-4 text-sm font-black uppercase tracking-[0.2em] text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <TrendingUp className="h-5 w-5" />}
          UP
        </button>
        <button
          disabled={isPending || (mode === 'join' && activeMarket?.state !== 'OPEN')}
          onClick={() => handleTrade('DOWN')}
          className="flex items-center justify-center gap-2 rounded-2xl bg-rose-500/80 px-4 py-4 text-sm font-black uppercase tracking-[0.2em] text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <TrendingDown className="h-5 w-5" />}
          DOWN
        </button>
      </div>
    </div>
  );
};
