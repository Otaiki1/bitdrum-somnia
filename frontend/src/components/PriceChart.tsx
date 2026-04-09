'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AreaSeries, CandlestickSeries, ColorType, IChartApi, ISeriesApi, LineStyle, createChart, createSeriesMarkers } from 'lightweight-charts';
import { HermesClient } from '@pythnetwork/hermes-client';
import { ArrowDownRight, ArrowUpRight, ExternalLink, LayoutPanelLeft, LineChart, Waves } from 'lucide-react';
import { Panel, StatPill } from './ObsidianPrimitives';
import { formatTimeframe, type TradeExecutionRecord } from '../utils/bitdrum';

const ExecutionCard: React.FC<{ execution: TradeExecutionRecord }> = ({ execution }) => {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(execution.timeframeSeconds);
  const isUp = execution.direction === 'UP';

  useEffect(() => {
    if (execution.status !== 'confirmed') return;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - execution.timestamp) / 1000;
      const p = Math.min((elapsed / execution.timeframeSeconds) * 100, 100);
      setProgress(p);
      setTimeLeft(Math.max(execution.timeframeSeconds - elapsed, 0));
      
      if (p >= 100) clearInterval(interval);
    }, 100);

    return () => clearInterval(interval);
  }, [execution.timestamp, execution.timeframeSeconds, execution.status]);

  return (
    <div className="group relative overflow-hidden rounded-[1.65rem] border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] p-5 transition-all hover:border-[rgba(245,185,66,0.18)]">
      {/* Progress Bar Background */}
      <div className="absolute bottom-0 left-0 h-1 w-full bg-[rgba(255,255,255,0.02)]">
        <div 
          className={`h-full transition-all duration-100 ${isUp ? 'bg-[var(--state-up)] shadow-[0_0_8px_var(--state-up)]' : 'bg-[var(--state-down)] shadow-[0_0_8px_var(--state-down)]'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full ${isUp ? 'bg-[var(--state-up)]/10 text-[var(--state-up)]' : 'bg-[var(--state-down)]/10 text-[var(--state-down)]'}`}>
            {isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          </div>
          <span className="text-[0.62rem] font-black uppercase tracking-[0.28em] text-[var(--text-muted)]">
            {execution.direction}
          </span>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.22em] ${
            execution.status === 'confirmed'
              ? 'border-[rgba(22,163,74,0.2)] bg-[rgba(22,163,74,0.1)] text-[var(--state-up)]'
              : execution.status === 'failed'
                ? 'border-[rgba(220,38,38,0.22)] bg-[rgba(220,38,38,0.12)] text-[var(--state-down)]'
                : 'border-[rgba(245,185,66,0.18)] bg-[rgba(245,185,66,0.08)] text-[var(--accent-gold)] animate-pulse'
          }`}
        >
          {execution.status}
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between">
        <div>
          <div className="text-[1.2rem] font-semibold tracking-tight text-[var(--text-primary)]">
            {execution.stake} <span className="text-[0.68rem] font-normal text-[var(--text-muted)] tracking-widest">STT</span>
          </div>
          <div className="mt-1 text-[0.6rem] uppercase tracking-widest text-[var(--text-muted)]">
            {execution.kind === 'OPEN' ? 'Primary Call' : 'Satellite Join'}
          </div>
        </div>
        
        <div className="text-right">
          <div className="font-mono text-sm font-bold text-[var(--text-primary)]">
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toFixed(0).padStart(2, '0')}
          </div>
          <div className="text-[0.55rem] uppercase tracking-widest text-[var(--text-muted)]">Settling</div>
        </div>
      </div>
    </div>
  );
};

const PYTH_BTC_ID = '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43';
const PYTH_HERMES_URL = 'https://hermes.pyth.network';
const PYTH_BENCHMARK_URL = 'https://benchmarks.pyth.network/v1/shims/tradingview';

export interface TradeMarker {
  time: number;
  price: number;
  direction: 'UP' | 'DOWN';
  label: string;
}

interface PriceChartProps {
  tradeMarkers?: TradeMarker[];
  recentExecutions?: TradeExecutionRecord[];
  onPriceUpdate?: (price: number | null) => void;
}



export const PriceChart: React.FC<PriceChartProps> = ({
  tradeMarkers = [],
  recentExecutions = [],
  onPriceUpdate,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | ISeriesApi<'Candlestick'> | null>(null);
  const strikeLineRef = useRef<ReturnType<ISeriesApi<'Area'>['createPriceLine']> | null>(null);
  const markersPluginRef = useRef<any>(null);
 
  const [chartMode, setChartMode] = useState<'basic' | 'advanced'>('basic');

  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [isLive, setIsLive] = useState(false);
  const visibleExecutions = useMemo(() => recentExecutions.slice(0, 3), [recentExecutions]);
  const latestStrike = tradeMarkers.length ? tradeMarkers[tradeMarkers.length - 1]?.price ?? null : null;

  useEffect(() => {
    if (!chartContainerRef.current) return;
    let active = true;
    const currentMode = chartMode;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 390,
      crosshair: {
        vertLine: { color: 'rgba(245, 185, 66, 0.18)', width: 1, style: LineStyle.Solid },
        horzLine: { color: 'rgba(245, 185, 66, 0.18)', width: 1, style: LineStyle.Solid },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.06)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.06)',
      },
    });

    const series = currentMode === 'basic' 
      ? chart.addSeries(AreaSeries, {
          lineColor: '#f5b942',
          topColor: 'rgba(245, 185, 66, 0.28)',
          bottomColor: 'rgba(59, 130, 246, 0.03)',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        })
      : chart.addSeries(CandlestickSeries, {
          upColor: '#16a34a',
          downColor: '#dc2626',
          borderVisible: false,
          wickUpColor: '#16a34a',
          wickDownColor: '#dc2626',
        });

    seriesRef.current = series;
    chartRef.current = chart;

    const fetchPythHistory = async () => {
      try {
        const to = Math.floor(Date.now() / 1000);
        const from = to - 60 * 60 * 4;
        const symbol = 'Crypto.BTC/USD';
        const response = await fetch(
          `${PYTH_BENCHMARK_URL}/history?symbol=${symbol}&resolution=1&from=${from}&to=${to}`,
        );
        const result = await response.json();
        if (result.s === 'ok' && active) {
          const formatted = result.t.map((timestamp: number, index: number) => {
            if (currentMode === 'advanced') {
              return {
                time: timestamp as any,
                open: Number(result.o[index] || result.c[index]),
                high: Number(result.h[index] || result.c[index]),
                low: Number(result.l[index] || result.c[index]),
                close: Number(result.c[index]),
              };
            }
            return {
              time: timestamp as any,
              value: Number(result.c[index]),
            };
          });
          series.setData(formatted);
          const nextPrice = result.c[result.c.length - 1] ?? null;
          setCurrentPrice(nextPrice);
          onPriceUpdate?.(nextPrice);
          chart.timeScale().fitContent();
        }
      } catch (error) {
        if (active) console.error('Failed to fetch Pyth history:', error);
      }
    };

    fetchPythHistory();

    const hermes = new HermesClient(PYTH_HERMES_URL, {});
    let interval: NodeJS.Timeout | null = null;

    const startStreaming = async () => {
      interval = setInterval(async () => {
        if (!active) return;
        try {
          const updates = await hermes.getLatestPriceUpdates([PYTH_BTC_ID]);
          if (updates?.parsed?.length) {
            const priceData = updates.parsed[0].price;
            const nextTime = Math.floor(Date.now() / 1000) as any;
            const nextPrice = Number(priceData.price) * Math.pow(10, priceData.expo);

            if (currentMode === 'basic') {
              (series as ISeriesApi<'Area'>).update({
                time: nextTime,
                value: nextPrice,
              });
            } else {
              (series as unknown as ISeriesApi<'Candlestick'>).update({
                time: nextTime,
                open: nextPrice,
                high: nextPrice,
                low: nextPrice,
                close: nextPrice,
              });
            }

            setCurrentPrice((previous) => {
              if (previous) {
                setPriceChange(((nextPrice - previous) / previous) * 100);
              }
              return nextPrice;
            });

            onPriceUpdate?.(nextPrice);
            setIsLive(true);
          }
        } catch (error) {
          console.error('Pyth stream error:', error);
          if (active) setIsLive(false);
        }
      }, 2000);
    };

    void startStreaming();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      active = false;
      window.removeEventListener('resize', handleResize);
      if (interval) clearInterval(interval);
      chart.remove();
      seriesRef.current = null;
      chartRef.current = null;
    };
  }, [chartMode]);

  // Secondary effect to sync overlays without destroying the whole chart/canvas
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    // Strike Line
    if (strikeLineRef.current) {
      try { (series as any).removePriceLine(strikeLineRef.current); } catch (e) {}
      strikeLineRef.current = null;
    }
    if (latestStrike) {
      strikeLineRef.current = series.createPriceLine({
        price: latestStrike,
        color: '#22d3ee',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Strike',
      });
    }

    // Markers
    if (markersPluginRef.current) {
      try { markersPluginRef.current.detach?.(); } catch (e) {}
      markersPluginRef.current = null;
    }
    if (tradeMarkers.length) {
      const markers = tradeMarkers.map((marker) => ({
        time: marker.time as any,
        position: marker.direction === 'UP' ? 'belowBar' : 'aboveBar',
        color: marker.direction === 'UP' ? '#16a34a' : '#dc2626',
        shape: marker.direction === 'UP' ? 'arrowUp' : 'arrowDown',
        text: marker.label,
      })) as any[];
      markersPluginRef.current = createSeriesMarkers(series as any, markers);
    }
  }, [latestStrike, tradeMarkers]);

  return (
    <Panel className="surface-lift p-5 sm:p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="text-[0.68rem] uppercase tracking-[0.34em] text-[var(--accent-gold)]">
              Bitcoin Market Pulse
            </div>
            <div className="mt-3 flex items-end gap-3">
              <h2 className="font-heading text-[clamp(2rem,3vw,3.5rem)] font-semibold tracking-[-0.06em] text-[var(--text-primary)]">
                BTC / USD
              </h2>
              {isLive ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(245,185,66,0.16)] bg-[rgba(245,185,66,0.08)] px-3 py-1 text-[0.66rem] uppercase tracking-[0.26em] text-[var(--accent-gold)]">
                  <Waves className="h-3.5 w-3.5" />
                  Live
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:items-end">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setChartMode(chartMode === 'basic' ? 'advanced' : 'basic')}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-[0.62rem] uppercase tracking-[0.24em] text-[var(--text-secondary)] transition hover:border-[rgba(245,185,66,0.18)] hover:text-[var(--text-primary)]"
              >
                {chartMode === 'basic' ? <LayoutPanelLeft className="h-3.5 w-3.5" /> : <LineChart className="h-3.5 w-3.5" />}
                {chartMode === 'basic' ? 'Advanced' : 'Basic'}
              </button>
              <a
                href="https://www.tradingview.com/chart/?symbol=PYTH:BTCUSD"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)] transition hover:border-[rgba(59,130,246,0.18)] hover:text-[var(--text-primary)]"
                title="Open in TradingView"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
 
            <div className="mt-2 text-right">
              <div className="font-mono text-[clamp(1.6rem,2vw,2.5rem)] font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                {currentPrice
                  ? `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '--'}
              </div>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <StatPill
                  label="Move"
                  value={`${priceChange >= 0 ? '+' : '-'}${Math.abs(priceChange).toFixed(3)}%`}
                  accent={priceChange >= 0 ? 'success' : 'danger'}
                />
                {latestStrike ? <StatPill label="Strike" value={`$${latestStrike.toFixed(2)}`} accent="core" /> : null}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-[color:var(--border-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-3 sm:p-4">
          <div ref={chartContainerRef} className="w-full" />
        </div>

        {visibleExecutions.length ? (
          <div className="grid gap-3 md:grid-cols-3">
            {visibleExecutions.map((execution) => (
              <ExecutionCard key={execution.id} execution={execution} />
            ))}
          </div>
        ) : null}
      </div>
    </Panel>
  );
};
