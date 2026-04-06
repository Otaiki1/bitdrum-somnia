'use client';

import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../utils/somnia';

export type SignalData = {
  direction: string;
  confidence: number;
  rationale: string;
  pom_profit_bps?: number;
};

/**
 * Fetches the precomputed AI signal for a market, or a preview signal when
 * no marketId is provided (used by the open-market flow).
 */
export function useSignal(
  marketId: string | null | undefined,
  previewDirection?: string,
  previewStake?: string,
) {
  return useQuery<{ signal: SignalData } | null>({
    queryKey: ['signal', marketId ?? 'preview', previewDirection, previewStake],
    queryFn: async () => {
      const url = marketId
        ? `${API_BASE}/signal/${marketId}`
        : `${API_BASE}/signal/preview?direction=${previewDirection}&stake=${previewStake}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      return response.json();
    },
    refetchInterval: 120_000,
  });
}
