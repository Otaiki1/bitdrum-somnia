'use client';

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Clock, ShieldCheck } from 'lucide-react';

export const TradePanel = () => {
  const [stake, setStake] = useState('100');
  const [duration, setDuration] = useState('60');

  return (
    <div className="glass-morphism flex flex-col gap-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 bg-orange-500/20 rounded-lg">
          <ShieldCheck className="w-5 h-5 text-orange-500" />
        </div>
        <h3 className="text-xl font-bold text-white">Execution</h3>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 uppercase tracking-widest">Stake (sBTC)</label>
        <div className="relative">
          <input
            type="number"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-all"
            placeholder="0.00"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-orange-500">MAX</div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 uppercase tracking-widest">Duration</label>
        <div className="grid grid-cols-4 gap-2">
          {['30s', '1m', '5m', '15m'].map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                duration === d 
                  ? 'border-orange-500 bg-orange-500/10 text-orange-500' 
                  : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-2">
        <button className="flex flex-col items-center justify-center gap-2 bg-green-500/80 hover:bg-green-500 py-4 rounded-2xl transition-all group overflow-hidden relative">
            <TrendingUp className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
            <span className="font-bold text-white uppercase tracking-tighter">UP</span>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
        </button>
        <button className="flex flex-col items-center justify-center gap-2 bg-red-500/80 hover:bg-red-500 py-4 rounded-2xl transition-all group overflow-hidden relative">
            <TrendingDown className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
            <span className="font-bold text-white uppercase tracking-tighter">DOWN</span>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
        </button>
      </div>

      <div className="mt-4 p-4 border border-white/5 bg-white/5 rounded-xl flex flex-col gap-2">
         <div className="flex justify-between text-xs">
            <span className="text-gray-400">Payout</span>
            <span className="text-green-400 font-bold">+85.4%</span>
         </div>
         <div className="flex justify-between text-xs">
            <span className="text-gray-400">Potential Profit</span>
            <span className="text-white font-mono">{Number(stake) * 0.854} sBTC</span>
         </div>
      </div>
    </div>
  );
};
