'use client';

import { useQuery } from '@tanstack/react-query';
import { createPublicClient, defineChain, http } from 'viem';
import { ACTIVE_SOMNIA_NETWORK, PREDICTION_MARKET_ADDRESS } from '../utils/somnia';

const PAYOUT_BPS_ABI = [
  {
    name: 'currentPayoutBps',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

/**
 * Reads the vault-computed payout rate (in basis points) from the V2 contract.
 * Refreshes every 30s — same cadence as the keeper's price posts.
 */
export function usePayoutBps() {
  return useQuery<number>({
    queryKey: ['payoutBps'],
    queryFn: async () => {
      const chain = defineChain({
        id: ACTIVE_SOMNIA_NETWORK.chainId,
        name: ACTIVE_SOMNIA_NETWORK.chainName,
        nativeCurrency: ACTIVE_SOMNIA_NETWORK.nativeCurrency,
        rpcUrls: {
          default: { http: ACTIVE_SOMNIA_NETWORK.rpcUrls as string[] },
          public: { http: ACTIVE_SOMNIA_NETWORK.rpcUrls as string[] },
        },
        blockExplorers: {
          default: { name: 'Somnia Explorer', url: ACTIVE_SOMNIA_NETWORK.blockExplorerUrls[0] },
        },
        contracts: {
          multicall3: { address: ACTIVE_SOMNIA_NETWORK.multicall3Address },
        },
      });

      const publicClient = createPublicClient({
        chain,
        transport: http(ACTIVE_SOMNIA_NETWORK.rpcUrls[0]),
      });

      const result = await publicClient.readContract({
        address: PREDICTION_MARKET_ADDRESS as `0x${string}`,
        abi: PAYOUT_BPS_ABI,
        functionName: 'currentPayoutBps',
      });

      return Number(result);
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
