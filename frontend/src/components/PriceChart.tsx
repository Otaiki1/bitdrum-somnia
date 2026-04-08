'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AreaSeries,
  ColorType,
  IChartApi,
  ISeriesApi,
  LineStyle,
  createChart,
  createSeriesMarkers,
} from 'lightweight-charts';
import { HermesClient } from '@pythnetwork/hermes-client';
import { ArrowDownRight, ArrowUpRight, Waves } from 'lucide-react';
import { Panel, StatPill } from './ObsidianPrimitives';
import { formatTimeframe, type TradeExecutionRecord } from '../utils/bitdrum';

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
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const strikeLineRef = useRef<ReturnType<ISeriesApi<'Area'>['createPriceLine']> | null>(null);
  const markersPluginRef = useRef<any>(null);

  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [isLive, setIsLive] = useState(false);
  const visibleExecutions = useMemo(() => recentExecutions.slice(0, 3), [recentExecutions]);
  const latestStrike = tradeMarkers.length ? tradeMarkers[tradeMarkers.length - 1]?.price ?? null : null;

  useEffect(() => {
    if (!chartContainerRef.current) return;

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

    const series = chart.addSeries(AreaSeries, {
      lineColor: '#f5b942',
      topColor: 'rgba(245, 185, 66, 0.28)',
      bottomColor: 'rgba(59, 130, 246, 0.03)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
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
          const formatted = result.t.map((timestamp: number, index: number) => ({
            time: timestamp as any,
            value: result.c[index],
          }));
          series.setData(formatted);
          const nextPrice = result.c[result.c.length - 1] ?? null;
          setCurrentPrice(nextPrice);
          onPriceUpdate?.(nextPrice);
          chart.timeScale().fitContent();
        }
      } catch (error) {
        console.error('Failed to fetch Pyth history:', error);
      }
    };

    fetchPythHistory();

    const hermes = new HermesClient(PYTH_HERMES_URL, {});
    let interval: NodeJS.Timeout | null = null;

    const startStreaming = async () => {
      interval = setInterval(async () => {
        try {
          const updates = await hermes.getLatestPriceUpdates([PYTH_BTC_ID]);
          if (updates?.parsed?.length) {
            const priceData = updates.parsed[0].price;
            const nextPrice = Number(priceData.price) * Math.pow(10, priceData.expo);

            series.update({
              time: Math.floor(Date.now() / 1000) as any,
              value: nextPrice,
            });

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
          setIsLive(false);
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
      window.removeEventListener('resize', handleResize);
      if (interval) clearInterval(interval);
      chart.remove();
    };
  }, [onPriceUpdate]);

  useEffect(() => {
    if (!seriesRef.current) return;

    if (strikeLineRef.current) {
      seriesRef.current.removePriceLine(strikeLineRef.current);
      strikeLineRef.current = null;
    }

    if (latestStrike) {
      strikeLineRef.current = seriesRef.current.createPriceLine({
        price: latestStrike,
        color: '#22d3ee',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Strike',
      });
    }
  }, [latestStrike]);

  useEffect(() => {
    if (!seriesRef.current) return;

    if (markersPluginRef.current) {
      markersPluginRef.current.detach?.();
      markersPluginRef.current = null;
    }

    if (!tradeMarkers.length) return;

    const markers = tradeMarkers.map((marker) => ({
      time: marker.time as any,
      position: marker.direction === 'UP' ? 'belowBar' : 'aboveBar',
      color: marker.direction === 'UP' ? '#16a34a' : '#dc2626',
      shape: marker.direction === 'UP' ? 'arrowUp' : 'arrowDown',
      text: marker.label,
    })) as any[];

    markersPluginRef.current = createSeriesMarkers(seriesRef.current, markers);
  }, [tradeMarkers]);

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

          <div className="flex flex-col gap-3 lg:items-end">
            <div className="font-mono text-[clamp(1.6rem,2vw,2.5rem)] font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
              {currentPrice
                ? `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '--'}
            </div>
            <div className="flex flex-wrap gap-2">
              <StatPill
                label="Move"
                value={`${priceChange >= 0 ? '+' : '-'}${Math.abs(priceChange).toFixed(3)}%`}
                accent={priceChange >= 0 ? 'success' : 'danger'}
              />
              {latestStrike ? <StatPill label="Strike" value={`$${latestStrike.toFixed(2)}`} accent="core" /> : null}
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-[color:var(--border-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-3 sm:p-4">
          <div ref={chartContainerRef} className="w-full" />
        </div>

        {visibleExecutions.length ? (
          <div className="grid gap-3 md:grid-cols-3">
            {visibleExecutions.map((execution) => {
              const isUp = execution.direction === 'UP';
              return (
                <div
                  key={execution.id}
                  className="rounded-[1.45rem] border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {isUp ? (
                        <ArrowUpRight className="h-4 w-4 text-[var(--state-up)]" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-[var(--state-down)]" />
                      )}
                      <span className="text-[0.7rem] uppercase tracking-[0.28em] text-[var(--text-muted)]">
                        {execution.kind === 'OPEN' ? 'Opened' : 'Joined'}
                      </span>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.24em] ${
                        execution.status === 'confirmed'
                          ? 'border-[rgba(22,163,74,0.2)] bg-[rgba(22,163,74,0.1)] text-[var(--state-up)]'
                          : execution.status === 'failed'
                            ? 'border-[rgba(220,38,38,0.22)] bg-[rgba(220,38,38,0.12)] text-[var(--state-down)]'
                            : 'border-[rgba(245,185,66,0.18)] bg-[rgba(245,185,66,0.08)] text-[var(--accent-gold)]'
                      }`}
                    >
                      {execution.status}
                    </span>
                  </div>
                  <p className="mt-4 font-heading text-xl tracking-[-0.04em] text-[var(--text-primary)]">
                    {execution.direction}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {formatTimeframe(execution.timeframeSeconds)} · {execution.stake} STT
                  </p>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </Panel>
  );
};
