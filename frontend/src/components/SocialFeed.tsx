'use client';

import React from 'react';
import { Activity, Trophy, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const MarketFeed = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['markets'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/markets`);
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    },
    refetchInterval: 5000, // Poll every 5s for live effect
  });

  const markets = data?.markets || [];

  return (
    <div className="glass-morphism flex flex-col gap-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">Live Activity</h3>
        </div>
        <span className="flex items-center gap-1 text-[10px] text-orange-500/80 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
            LIVE
        </span>
      </div>

      <div className="flex flex-col gap-3 min-h-[150px]">
        {isLoading ? (
          <div className="text-xs text-center text-gray-500 mt-4 animate-pulse">Scanning Starknet...</div>
        ) : markets.length === 0 ? (
          <div className="text-xs text-center text-gray-500 mt-4">No active markets found</div>
        ) : (
          markets.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all">
              <div className="flex flex-col">
                <span className="text-xs text-gray-400 font-mono italic">Market #{item.id}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">Strike: {Number(item.strike_price) / 1e8}</span>
                  <span className="text-[10px] bg-white/10 px-2 rounded-md">{item.state == 1 ? 'OPEN' : item.state == 2 ? 'LOCKED' : 'SETTLED'}</span>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-lg font-bold text-xs ${item.direction === 1 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {item.direction === 1 ? 'UP' : 'DOWN'}
              </div>
            </div>
          ))
        )}
      </div>

      <button className="mt-2 text-center text-xs text-orange-500 hover:text-orange-400 transition-colors py-2 border-t border-white/5">
        View All Markets
      </button>
    </div>
  );
};

export const LeaderboardCard = () => {
    const { data, isLoading } = useQuery({
      queryKey: ['leaderboard'],
      queryFn: async () => {
        const res = await fetch(`${API_BASE}/leaderboard`);
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      },
      refetchInterval: 10000, // Poll every 10s
    });

    const rankings = data?.rankings || [];

    return (
        <div className="glass-morphism mt-4">
            <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">Top Oracles</h3>
            </div>
            <div className="flex flex-col gap-3 min-h-[120px]">
                {isLoading ? (
                    <div className="text-xs text-center text-gray-500 mt-4 animate-pulse">Fetching ranks...</div>
                ) : rankings.length === 0 ? (
                    <div className="text-xs text-center text-gray-500 mt-4">No ranked traders yet</div>
                ) : (
                  rankings.map((trader: any, idx: number) => (
                      <div key={trader.address} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                          <div className="flex items-center gap-3">
                              <span className="text-lg font-black text-gray-600">#{idx + 1}</span>
                              <span className="text-sm font-bold text-white font-mono">{trader.address.slice(0,6)}...{trader.address.slice(-4)}</span>
                          </div>
                          <div className="flex flex-col items-end">
                              <span className="text-xs text-orange-400 font-bold">{trader.tier}</span>
                              <span className="text-[10px] text-gray-500">Rep: {trader.score}</span>
                          </div>
                      </div>
                  ))
                )}
            </div>
        </div>
    )
}
