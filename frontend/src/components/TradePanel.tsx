'use client';

import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, ShieldCheck, Loader2, Zap } from 'lucide-react';
import { useAccount, useSendTransaction } from '@starknet-react/core';
import { HermesClient } from '@pythnetwork/hermes-client';
import { ByteBuffer } from '../utils/pyth';

// Configuration
const SBTC_ADDRESS = '0x7fe107c968646cb6dd7bc2887149a126b696dbbd8f310ad5ce2ada2223567f1';
const PREDICTION_MARKET_ADDRESS = '0xe34d84cf5b661f0206d369d9d919b13a13b08ff0eb54e1e3056dd592db4303';
const PYTH_CONTRACT_ADDRESS = '0x07f2b07b6b5365e7ee055bda4c0ecabd867e6d3ee298d73aea32b027667186d6';
const BTC_PRICE_ID = '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43';
const HERMES_URL = 'https://hermes.pyth.network';

export const TradePanel = () => {
  const [stake, setStake] = useState('10');
  const [duration, setDuration] = useState('1m');
  
  const { account, address } = useAccount();
  const { send, isPending, error } = useSendTransaction({});

  const handleTrade = async (directionEnum: number) => {
    if (!account) return alert('Please connect your wallet first!');
    if (!stake || isNaN(Number(stake))) return alert('Invalid stake amount');
    
    const amountBigInt = BigInt(Math.floor(Number(stake) * 1e8));
    
    let durationSeconds = 60;
    if (duration === '30s') durationSeconds = 30;
    if (duration === '1m') durationSeconds = 60;
    if (duration === '5m') durationSeconds = 300;
    if (duration === '15m') durationSeconds = 900;

    try {
        // 1. Fetch Pyth Price Update (Pull Pattern)
        const hermes = new HermesClient(HERMES_URL, {});
        // Request binary VAA data
        const updates = await hermes.getLatestPriceUpdates([BTC_PRICE_ID]);
        
        if (!updates || !updates.binary || updates.binary.data.length === 0) {
            throw new Error("Failed to fetch Pyth price update");
        }

        // Convert VAA to Starknet ByteBuffer format
        const vaaBase64 = updates.binary.data[0];
        const pythUpdate = ByteBuffer.fromBase64(vaaBase64);

        // 2. Construct Multi-call
        const txCalls = [
          // A. Update Pyth Oracle State
          {
            contractAddress: PYTH_CONTRACT_ADDRESS,
            entrypoint: 'update_price_feeds',
            calldata: pythUpdate.toCalldata()
          },
          // B. Approve sBTC usage
          {
            contractAddress: SBTC_ADDRESS,
            entrypoint: 'approve',
            calldata: [PREDICTION_MARKET_ADDRESS, amountBigInt.toString(), "0"]
          },
          // C. Open Market on Protocol
          {
            contractAddress: PREDICTION_MARKET_ADDRESS,
            entrypoint: 'open_market',
            calldata: [directionEnum.toString(), durationSeconds.toString(), amountBigInt.toString(), "0"]
          }
        ];

        console.log("Submitting multicall with Pyth Update...");
        await send(txCalls);
    } catch (e: any) {
        console.error("Trade Execution Error:", e);
        alert(`Execution failed: ${e.message}`);
    }
  };

  return (
    <div className="glass-morphism flex flex-col gap-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 bg-orange-500/20 rounded-lg">
          <ShieldCheck className="w-5 h-5 text-orange-500" />
        </div>
        <div className="flex flex-col">
            <h3 className="text-xl font-bold text-white uppercase italic tracking-tighter">Execution Engine</h3>
            <span className="text-[8px] text-gray-500 font-bold tracking-widest flex items-center gap-1">
                <Zap className="w-2 h-2 text-orange-500" /> POWERED BY PYTH & STARKZAP
            </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 uppercase tracking-widest">Stake (sBTC)</label>
        <div className="relative">
          <input
            type="number"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition-all font-mono"
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

      {error ? <div className="text-red-500 text-xs text-center border p-2 border-red-500/20 bg-red-500/5 rounded-lg">{error.message}</div> : null}

      <div className="grid grid-cols-2 gap-4 mt-2">
        <button 
            disabled={isPending || !address}
            onClick={() => handleTrade(1)} // 1 = UP
            className="flex flex-col items-center justify-center gap-2 bg-green-500/80 hover:bg-green-500 disabled:opacity-50 py-4 rounded-2xl transition-all group overflow-hidden relative cursor-pointer shadow-lg shadow-green-500/10"
        >
            {isPending ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <TrendingUp className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />}
            <span className="font-bold text-white uppercase tracking-tighter">UP</span>
        </button>
        <button 
            disabled={isPending || !address}
            onClick={() => handleTrade(2)} // 2 = DOWN
            className="flex flex-col items-center justify-center gap-2 bg-red-500/80 hover:bg-red-500 disabled:opacity-50 py-4 rounded-2xl transition-all group overflow-hidden relative cursor-pointer shadow-lg shadow-red-500/10"
        >
             {isPending ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <TrendingDown className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />}
            <span className="font-bold text-white uppercase tracking-tighter">DOWN</span>
        </button>
      </div>

      <div className="mt-4 p-4 border border-white/5 bg-white/5 rounded-xl flex flex-col gap-2">
         <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500">
            <span>Protocol Efficiency</span>
            <span className="text-green-400 tracking-normal">+85.4%</span>
         </div>
         <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500">
            <span>Oracle Consistency</span>
            <span className="text-orange-500 tracking-normal">Pyth Network</span>
         </div>
      </div>
    </div>
  );
};
