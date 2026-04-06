'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  AreaSeries,
  createSeriesMarkers,
} from 'lightweight-charts';
import { HermesClient } from '@pythnetwork/hermes-client';
import { formatTimeframe, type TradeExecutionRecord } from '../utils/bitdrum';

// Pyth Network BTC/USD Configuration
const PYTH_BTC_ID = '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43';
const PYTH_HERMES_URL = 'https://hermes.pyth.network';
const PYTH_BENCHMARK_URL = 'https://benchmarks.pyth.network/v1/shims/tradingview';

export interface TradeMarker {
  time: number; // unix seconds
  price: number;
  direction: 'UP' | 'DOWN';
  label: string;
}

interface PriceChartProps {
  data?: any[];
  tradeMarkers?: TradeMarker[];
  recentExecutions?: TradeExecutionRecord[];
  onPriceUpdate?: (price: number | null) => void;
}

export const PriceChart: React.FC<PriceChartProps> = ({
  data,
  tradeMarkers = [],
  recentExecutions = [],
  onPriceUpdate,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [isLive, setIsLive] = useState(false);
  const visibleExecutions = useMemo(() => recentExecutions.slice(0, 4), [recentExecutions]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 380,
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: '#f97316',
      topColor: 'rgba(249, 115, 22, 0.3)',
      bottomColor: 'rgba(249, 115, 22, 0.0)',
      lineWidth: 2,
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
        if (result.s === 'ok') {
          const formatted = result.t.map((timestamp: number, i: number) => ({
            time: timestamp as any,
            value: result.c[i],
          }));
          series.setData(formatted);
          setCurrentPrice(result.c[result.c.length - 1]);
          onPriceUpdate?.(result.c[result.c.length - 1] ?? null);
        }
      } catch (e) {
        console.error('Failed to fetch Pyth history:', e);
      }
    };

    fetchPythHistory();

    const hermes = new HermesClient(PYTH_HERMES_URL, {});
    let interval: any;

    const startStreaming = async () => {
      try {
        interval = setInterval(async () => {
          const updates = await hermes.getLatestPriceUpdates([PYTH_BTC_ID]);
          if (updates && updates.parsed && updates.parsed.length > 0) {
            const priceData = updates.parsed[0].price;
            const price = Number(priceData.price) * Math.pow(10, priceData.expo);
            if (seriesRef.current) {
              seriesRef.current.update({
                time: Math.floor(Date.now() / 1000) as any,
                value: price,
              });
            }
            setCurrentPrice((prev) => {
              if (prev) setPriceChange(((price - prev) / prev) * 100);
              return price;
            });
            onPriceUpdate?.(price);
            setIsLive(true);
          }
        }, 2000);
      } catch (e) {
        console.error('Pyth Stream Error:', e);
        setIsLive(false);
      }
    };

    startStreaming();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (interval) clearInterval(interval);
      chart.remove();
    };
  }, [onPriceUpdate]);

  // Apply trade markers whenever they change (lightweight-charts v5 API)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersPluginRef = useRef<any>(null);

  useEffect(() => {
    if (!seriesRef.current) return;

    // Destroy previous plugin instance before creating a new one
    if (markersPluginRef.current) {
      markersPluginRef.current.detach?.();
      markersPluginRef.current = null;
    }

    if (!tradeMarkers.length) return;

    const markers = tradeMarkers.map((m) => ({
      time: m.time as any,
      position: m.direction === 'UP' ? 'belowBar' : 'aboveBar',
      color: m.direction === 'UP' ? '#10b981' : '#f43f5e',
      shape: m.direction === 'UP' ? 'arrowUp' : 'arrowDown',
      text: m.label,
    })) as any[];

    markersPluginRef.current = createSeriesMarkers(seriesRef.current, markers);
  }, [tradeMarkers]);

  return (
    <div className="glass-morphism h-[450px] relative overflow-hidden flex flex-col">
      <div className="flex justify-between items-center mb-4 px-2">
        <div className="flex flex-col">
          <h3 className="text-lg font-bold text-white uppercase tracking-tighter italic">BTC / USD</h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">
              Pyth Core Oracle
            </span>
            {isLive && (
              <div className="flex items-center gap-1.5 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping" />
                <span className="text-[8px] text-orange-500 font-black">STREAMING</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xl font-black text-white font-mono tracking-tighter">
            {currentPrice
              ? `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              : '---'}
          </span>
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded ${priceChange >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}
          >
            {priceChange >= 0 ? '▲' : '▼'}
            {Math.abs(priceChange).toFixed(4)}%
          </span>
        </div>
      </div>
      <div ref={chartContainerRef} className="flex-1 w-full" />
      {visibleExecutions.length ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {visibleExecutions.map((execution) => (
            <div
              key={execution.id}
              className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                    {execution.kind === 'OPEN' ? 'Execution Opened' : `Joined ${execution.marketId ?? 'market'}`}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {execution.direction} · {formatTimeframe(execution.timeframeSeconds)}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.22em] ${
                    execution.status === 'confirmed'
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                      : execution.status === 'failed'
                        ? 'border-rose-500/20 bg-rose-500/10 text-rose-200'
                        : 'border-orange-500/20 bg-orange-500/10 text-orange-200'
                  }`}
                >
                  {execution.status}
                </span>
              </div>
              <p className="mt-2 text-[11px] font-mono text-slate-300">
                {execution.entryPrice ? `$${execution.entryPrice.toFixed(2)}` : 'Awaiting price'} · {execution.stake} STT
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
