'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, LogOut, Menu, Wallet } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount, useDisconnect } from '@starknet-react/core';
import { PriceChart } from './PriceChart';
import { TradePanel } from './TradePanel';
import { LeaderboardCard, MarketFeed } from './SocialFeed';
import { claimMarket, formatTokenAmount, shortAddress, type MarketRecord } from '../utils/bitdrum';
import { API_BASE } from '../utils/starkzap';

export const TradingDashboard = () => {
  const queryClient = useQueryClient();
  const { login, logout, authenticated, user, getAccessToken, linkWallet, linkEmail, linkGithub, linkTwitter, linkGoogle } =
    usePrivy();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();

  const [showAccount, setShowAccount] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<MarketRecord | null>(null);
  const [claimingMarketId, setClaimingMarketId] = useState<string | null>(null);

  const viewerAddress = user?.wallet?.address || address || '';

  const positionsQuery = useQuery({
    queryKey: ['positions', viewerAddress],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/positions/${viewerAddress}`);
      if (!response.ok) {
        throw new Error('Unable to load positions');
      }

      return response.json();
    },
    enabled: Boolean(viewerAddress),
    refetchInterval: 12_000,
  });

  const positionSummary = positionsQuery.data?.summary;
  const positions = positionsQuery.data?.positions ?? [];

  const livePnL = useMemo(
    () => formatTokenAmount(positionSummary?.resolved_pnl || '0'),
    [positionSummary?.resolved_pnl],
  );

  const handleAuth = () => {
    if (authenticated || address) {
      setShowAccount(true);
    } else {
      login();
    }
  };

  const handleClaim = async (marketId: string) => {
    setClaimingMarketId(marketId);

    try {
      await claimMarket({
        getAccessToken,
        marketId,
      });

      await queryClient.invalidateQueries({ queryKey: ['positions', viewerAddress] });
      await queryClient.invalidateQueries({ queryKey: ['feed'] });
      await queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    } finally {
      setClaimingMarketId(null);
    }
  };

  const shortWallet = viewerAddress ? shortAddress(viewerAddress) : '';

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] p-4 text-white selection:bg-orange-500 selection:text-white md:p-8">
      {showAccount ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="glass-morphism relative w-full max-w-2xl overflow-hidden border border-white/10 p-8 shadow-2xl">
            <div className="absolute right-0 top-0 -z-10 h-40 w-40 bg-orange-500/10 blur-3xl" />

            <div className="mb-8 flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-black uppercase italic tracking-tight text-white">
                  Identity Hub
                </h2>
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.32em] text-slate-500">
                  Linked Access
                </p>
              </div>
              <button
                onClick={() => setShowAccount(false)}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-white/20"
              >
                <LogOut className="h-5 w-5 rotate-180" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-300">
                    Protocol Identifier
                  </p>
                  <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-3 font-mono text-xs text-slate-300">
                    {user?.id || 'ANONYMOUS_SESSION'}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                    Execution Wallet
                  </p>
                  <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-3 font-mono text-xs text-white">
                    {viewerAddress ? shortAddress(viewerAddress) : 'DISCONNECTED'}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => linkWallet()}
                      className="flex-1 rounded-xl bg-orange-500 px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-black transition hover:bg-orange-400"
                    >
                      Manage Wallet
                    </button>
                    <button
                      onClick={() => {
                        disconnect();
                        logout();
                        setShowAccount(false);
                      }}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 transition hover:border-rose-500/40 hover:text-rose-200"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                  Linked Identities
                </p>
                <div className="mt-3 space-y-2">
                  {user?.linkedAccounts?.map((account: any, index: number) => (
                    <div
                      key={`${account.type}-${index}`}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3"
                    >
                      <span className="text-xs font-bold uppercase text-slate-200">
                        {account.type}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {account.address?.slice(0, 10) || account.email || account.username}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {!user?.email ? (
                    <button
                      onClick={() => linkEmail()}
                      className="rounded-xl border border-white/10 bg-white/5 p-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-300 transition hover:border-white/20"
                    >
                      Link Email
                    </button>
                  ) : null}
                  {!user?.twitter ? (
                    <button
                      onClick={() => linkTwitter()}
                      className="rounded-xl border border-white/10 bg-white/5 p-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-300 transition hover:border-white/20"
                    >
                      Link Twitter
                    </button>
                  ) : null}
                  {!user?.google ? (
                    <button
                      onClick={() => linkGoogle()}
                      className="rounded-xl border border-white/10 bg-white/5 p-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-300 transition hover:border-white/20"
                    >
                      Link Google
                    </button>
                  ) : null}
                  {!user?.github ? (
                    <button
                      onClick={() => linkGithub()}
                      className="rounded-xl border border-white/10 bg-white/5 p-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-300 transition hover:border-white/20"
                    >
                      Link Github
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <nav className="mb-10 flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient shadow-lg shadow-orange-500/20">
            <span className="text-2xl font-black italic text-white">BD</span>
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tight">BitDrum</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              Intelligence Protocol
            </p>
          </div>
        </div>

        <div className="hidden flex-1 items-center gap-8 px-10 md:flex">
          <button className="border-b-2 border-orange-500 pb-1 text-xs font-black uppercase italic tracking-tight text-orange-300">
            Trading
          </button>
          <button
            onClick={() => setShowAccount(true)}
            className="border-b-2 border-transparent pb-1 text-xs font-black uppercase italic tracking-tight text-slate-500 transition hover:border-white/20 hover:text-white"
          >
            My Account
          </button>
          <button className="border-b-2 border-transparent pb-1 text-xs font-black uppercase italic tracking-tight text-slate-500 transition hover:border-white/20 hover:text-white">
            Leaderboard
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative rounded-xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10">
            <Bell className="h-5 w-5 text-slate-400" />
            <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-500" />
          </button>

          {authenticated || viewerAddress ? (
            <button
              onClick={handleAuth}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 transition hover:border-orange-500/40 hover:bg-orange-500/10"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-gradient text-xs font-bold text-white">
                {viewerAddress ? viewerAddress.slice(2, 4).toUpperCase() : 'BD'}
              </div>
              <span className="text-sm font-bold tracking-tight text-slate-200">{shortWallet}</span>
            </button>
          ) : (
            <button
              onClick={handleAuth}
              className="flex items-center gap-3 rounded-2xl border border-orange-500/40 bg-orange-500/10 px-6 py-3 text-sm font-black uppercase italic tracking-tight text-orange-200 transition hover:bg-orange-500 hover:text-white"
            >
              <Wallet className="h-5 w-5" />
              Login / Connect
            </button>
          )}

          <button className="rounded-xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10 md:hidden">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>

      <main className={`grid grid-cols-1 gap-6 transition-all lg:grid-cols-12 ${showAccount ? 'blur-xl opacity-20' : 'opacity-100'}`}>
        <div className="flex flex-col gap-6 lg:col-span-8">
          <PriceChart />

          <div className="glass-morphism">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold uppercase tracking-tight text-white">
                  Active Predictions
                </h3>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                  Live Portfolio
                </p>
              </div>

              <div className="flex gap-2">
                <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-300">
                  Win Rate {((positionSummary?.win_rate || 0) * 100).toFixed(1)}%
                </span>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200">
                  PnL {livePnL} STRK
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {positionsQuery.isLoading && !positions.length ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs uppercase tracking-[0.3em] text-slate-500">
                  Reading positions
                </div>
              ) : positions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs uppercase tracking-[0.3em] text-slate-500">
                  No active stakes yet
                </div>
              ) : (
                positions.map((position: any) => (
                  <article
                    key={`${position.market_id}-${position.direction}`}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Market #{position.market_id} · {position.direction.toUpperCase()}
                        </p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.26em] text-slate-500">
                          {position.status}
                        </p>
                      </div>
                      {position.can_claim ? (
                        <button
                          onClick={() => handleClaim(position.market_id)}
                          disabled={claimingMarketId === position.market_id}
                          className="rounded-full border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {claimingMarketId === position.market_id ? 'Claiming' : 'Claim'}
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-400">
                      <div>
                        Stake
                        <div className="mt-1 font-mono text-white">
                          {formatTokenAmount(position.stake_amount)} STRK
                        </div>
                      </div>
                      <div>
                        Payout
                        <div className="mt-1 font-mono text-white">
                          {formatTokenAmount(position.expected_payout)} STRK
                        </div>
                      </div>
                      <div>
                        Net PnL
                        <div className="mt-1 font-mono text-white">
                          {formatTokenAmount(position.net_pnl)} STRK
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <TradePanel
            selectedMarket={selectedMarket}
            onClearSelection={() => setSelectedMarket(null)}
          />
          <MarketFeed
            viewerAddress={viewerAddress || undefined}
            selectedMarketId={selectedMarket?.id}
            onJoinMarket={setSelectedMarket}
          />
          <LeaderboardCard />
        </div>
      </main>

      <footer className={`mt-20 flex flex-col items-center justify-between gap-4 border-t border-white/5 py-8 opacity-30 grayscale transition-all duration-700 hover:opacity-100 hover:grayscale-0 md:flex-row ${showAccount ? 'blur-xl' : ''}`}>
        <p className="text-xs font-bold tracking-widest">STARKNET PREDICTION PROTOCOL 2026</p>
        <div className="flex gap-6 text-xs font-black uppercase">
          <span className="transition-colors hover:text-orange-500">Twitter</span>
          <span className="transition-colors hover:text-orange-500">Discord</span>
          <span className="transition-colors hover:text-orange-500">Docs</span>
        </div>
      </footer>
    </div>
  );
};
