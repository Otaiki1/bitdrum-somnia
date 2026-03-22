'use client';

import React, { useEffect, useState } from 'react';
import { PriceChart } from './PriceChart';
import { TradePanel } from './TradePanel';
import { MarketFeed, LeaderboardCard } from './SocialFeed';
import { Menu, Bell, Wallet, LogOut } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount, useConnect, useDisconnect } from '@starknet-react/core';

export const TradingDashboard = () => {
  const { login, logout, authenticated, user } = usePrivy();
  const { address, status } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Handle Starkzap/Privy sync to Starknet React
  const handleAuth = () => {
    if (authenticated) {
      if (address) disconnect();
      logout();
    } else {
      login();
      // We will assume standard wallet login connects via starknet-react directly 
      // if privy is not fully integrated with starknet in this specific mock version.
      // But starkzap design expects Privy as the Auth gate.
      if (connectors.length > 0 && !address) {
          connect({ connector: connectors[0] });
      }
    }
  };

  const displayAddress = user?.wallet?.address || address;
  const shortAddress = displayAddress ? `${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}` : '';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 selection:bg-orange-500 selection:text-white">
      {/* Header */}
      <nav className="flex justify-between items-center mb-10 px-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <span className="text-2xl font-black text-white italic">BD</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter italic uppercase">BitDrum</h1>
            <p className="text-[10px] text-gray-500 font-bold tracking-[0.2em] uppercase">Intelligence Protocol</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all relative">
            <Bell className="w-5 h-5 text-gray-400" />
            <div className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-[#0a0a0a]" />
          </button>
          
          {authenticated || address ? (
            <button onClick={handleAuth} className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-red-500/20 hover:border-red-500/50 transition-all group">
              <div className="w-8 h-8 rounded-full bg-gradient flex items-center justify-center text-xs font-bold">
                <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${displayAddress}`} alt="avatar" className="w-8 h-8 rounded-full" />
              </div>
              <span className="text-sm font-bold text-gray-300 group-hover:hidden">{shortAddress}</span>
              <span className="text-sm font-bold text-red-500 hidden group-hover:flex items-center gap-2">
                <LogOut className="w-4 h-4" /> Disconnect
              </span>
            </button>
          ) : (
            <button onClick={handleAuth} className="flex items-center gap-3 px-6 py-3 bg-orange-500/10 border border-orange-500/50 rounded-2xl hover:bg-orange-500 hover:text-white transition-all group text-orange-500">
              <Wallet className="w-5 h-5" />
              <span className="text-sm font-bold transition-colors">Connect Wallet</span>
            </button>
          )}
          <button className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all md:hidden">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Main Grid */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] mx-auto">
        {/* Left Column: Chart & Position Tracking */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <PriceChart />
          
          <div className="glass-morphism">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">Active Predictions</h3>
                <div className="flex gap-2">
                    <span className="text-[10px] text-gray-400 border border-white/10 px-2 py-1 rounded-lg">Win Rate: 72%</span>
                    <span className="text-[10px] text-green-400 border border-green-500/20 bg-green-500/5 px-2 py-1 rounded-lg">PnL: +14.2 sBTC</span>
                </div>
            </div>
            <div className="flex items-center justify-center h-48 border-2 border-dashed border-white/5 rounded-2xl text-gray-600 font-bold uppercase tracking-widest text-sm">
                No Active Stakes
            </div>
          </div>
        </div>

        {/* Right Column: Execution & Social */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <TradePanel />
          <MarketFeed />
          <LeaderboardCard />
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="mt-20 py-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700 cursor-default">
         <p className="text-xs font-bold tracking-widest">STARKNET PREDICTION PROTOCOL 2026</p>
         <div className="flex gap-6 text-xs uppercase font-black">
            <span className="hover:text-orange-500 transition-colors">Twitter</span>
            <span className="hover:text-orange-500 transition-colors">Discord</span>
            <span className="hover:text-orange-500 transition-colors">Docs</span>
         </div>
      </footer>
    </div>
  );
};
