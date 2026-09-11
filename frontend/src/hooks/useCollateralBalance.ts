'use client';
import { useQuery } from '@tanstack/react-query';
import type { Address } from 'viem';
import { readCollateralBalance } from '../lib/dreamdex/trade';

export const COLLATERAL_BALANCE_KEY = 'dream-collateral';

export function useCollateralBalance(address: string | null | undefined) {
  const query = useQuery({
    queryKey: [COLLATERAL_BALANCE_KEY, address?.toLowerCase() ?? null],
    queryFn: () => readCollateralBalance(address as Address),
    enabled: Boolean(address),
    refetchInterval: 5_000,
  });
  return { balance: query.data ?? null, refetch: query.refetch };
}
