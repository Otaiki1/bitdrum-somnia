'use client';

import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../utils/somnia';
import { readMarketAndBalance, readMarketOnchain, type OnchainMarket } from '../utils/contracts';

/**
 * Reads live market state directly from the contract via viem multicall.
 * When a wallet address is provided the WSTT balance is fetched in the
 * same round-trip. Falls back to the gateway if the contract read fails.
 */
export function useMarketDetail(
  marketId: string | null | undefined,
  walletAddress?: `0x${string}` | null,
) {
  return useQuery<{ market: OnchainMarket; sttBalance: bigint | null }>({
    queryKey: ['market-detail-onchain', marketId, walletAddress],
    queryFn: async () => {
      if (!marketId) return { market: null as any, sttBalance: null };

      try {
        if (walletAddress) {
          const { market, wbtcBalance } = await readMarketAndBalance(marketId, walletAddress);
          return { market, sttBalance: wbtcBalance };
        }
        const market = await readMarketOnchain(marketId);
        return { market, sttBalance: null };
      } catch {
        // Fallback to gateway if RPC is unavailable
        const response = await fetch(`${API_BASE}/markets/${marketId}`);
        if (!response.ok) throw new Error('Unable to load market');
        const data = await response.json();
        return { market: data.market as OnchainMarket, sttBalance: null };
      }
    },
    enabled: Boolean(marketId),
    refetchInterval: false,
  });
}
