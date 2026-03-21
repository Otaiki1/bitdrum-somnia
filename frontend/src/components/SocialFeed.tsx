'use client';

import React from 'react';
import { Activity, Trophy, Users } from 'lucide-react';

const mockFeed = [
    { id: '0x1', user: '0x32A...F21', type: 'UP', amount: '250', time: '2m ago' },
    { id: '0x2', user: '0x91B...A44', type: 'DOWN', amount: '1,200', time: '5m ago' },
    { id: '0x3', user: '0x77C...E88', type: 'UP', amount: '50', time: '12m ago' },
];

export const MarketFeed = () => {
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

      <div className="flex flex-col gap-3">
        {mockFeed.map((item) => (
          <div key={item.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all">
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 font-mono italic">{item.user}</span>
              <span className="text-sm font-bold text-white">{item.amount} sBTC</span>
            </div>
            <div className={`px-3 py-1 rounded-lg font-bold text-xs ${item.type === 'UP' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {item.type}
            </div>
          </div>
        ))}
      </div>

      <button className="mt-2 text-center text-xs text-orange-500 hover:text-orange-400 transition-colors py-2 border-t border-white/5">
        View All Markets
      </button>
    </div>
  );
};

export const LeaderboardCard = () => {
    return (
        <div className="glass-morphism mt-4">
            <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">Top Oracles</h3>
            </div>
            <div className="flex flex-col gap-3">
                {[
                    { rank: 1, name: 'BitWhale', pnl: '+412%', score: 98 },
                    { rank: 2, name: 'Satoshi_X', pnl: '+385%', score: 94 }
                ].map((trader) => (
                    <div key={trader.rank} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                            <span className="text-lg font-black text-gray-600">#{trader.rank}</span>
                            <span className="text-sm font-bold text-white">{trader.name}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-xs text-green-400 font-bold">{trader.pnl}</span>
                            <span className="text-[10px] text-gray-500">Rep: {trader.score}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
