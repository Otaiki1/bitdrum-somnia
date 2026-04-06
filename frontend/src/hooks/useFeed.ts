'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE, WS_URL } from '../utils/somnia';
import { useWebSocket } from './useWebSocket';

export type FeedItem = {
  market_id: string;
  participant_address: string;
  action: 'OPENED' | 'JOINED';
  direction: string;
  stake_amount: string;
  timestamp: string;
  tier: string;
  long_pool: string;
  short_pool: string;
  state: string;
  pom_profit_bps: number;
  duration_seconds: number;
  join_deadline: number | null;
  opened_at: string | null;
  settlement_deadline: number | null;
  signal: { direction: string; confidence: number; rationale: string } | null;
};

type FeedPayload = { feed: FeedItem[] };
type WsFrame = { channel: string; payload: FeedPayload };

export type FeedType = 'following' | 'oracle' | 'trending';

export function useFeed(type: FeedType, address?: string) {
  const params = new URLSearchParams({ type });
  if (address) params.set('address', address);

  const wsUrl = `${WS_URL}?channel=feed&${params.toString()}`;
  const frame = useWebSocket<WsFrame>(wsUrl);

  const query = useQuery<FeedPayload>({
    queryKey: ['feed', type, address ?? 'anonymous'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/feed?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load social feed');
      return response.json();
    },
    refetchInterval: 300_000,
  });

  return {
    feed: (frame?.payload?.feed ?? query.data?.feed ?? []) as FeedItem[],
    isLoading: query.isLoading && !frame,
  };
}
