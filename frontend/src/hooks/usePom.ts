'use client';

import { useQuery } from '@tanstack/react-query';
import { API_BASE } from '../utils/somnia';

export type PomData = {
  pom_profit_bps: number;
};

/**
 * Fetches the POM (Probable Outcome Multiplier) for a market or a preview.
 */
export function usePom(
  marketId: string | null | undefined,
  previewDirection?: string,
  previewStake?: string,
) {
  return useQuery<{ pom: PomData } | null>({
    queryKey: ['pom', marketId ?? 'preview', previewDirection, previewStake],
    queryFn: async () => {
      const url = marketId
        ? `${API_BASE}/pom/${marketId}`
        : `${API_BASE}/pom/preview?direction=${previewDirection}&stake=${previewStake}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      return response.json();
    },
    refetchInterval: 120_000,
  });
}
