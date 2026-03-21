'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, AreaSeries } from 'lightweight-charts';

interface PriceChartProps {
  data?: any[];
}

export const PriceChart: React.FC<PriceChartProps> = ({ data }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

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
      height: 400,
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: '#f97316',
      topColor: 'rgba(249, 115, 22, 0.3)',
      bottomColor: 'rgba(249, 115, 22, 0.0)',
      lineWidth: 2,
    });

    // Mock data for initial render
    const mockData = Array.from({ length: 100 }, (_, i) => ({
      time: (Date.now() / 1000 - (100 - i) * 60) as any,
      value: 65000 + Math.random() * 200 - 100,
    }));

    series.setData(mockData);
    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  return (
    <div className="glass-morphism h-[450px] relative overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white">BTC / USD</h3>
        <span className="text-sm text-green-400 font-mono">$65,124.20 (+0.42%)</span>
      </div>
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
};
