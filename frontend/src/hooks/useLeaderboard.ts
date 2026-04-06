'use client';

import { useQuery } from '@tanstack/react-query';
import { API_BASE, WS_URL } from '../utils/somnia';
import { useWebSocket } from './useWebSocket';

export type LeaderboardEntry = {
  address: string;
  tier: string;
  win_rate: number;
  score: string;
};

type LeaderboardPayload = { rankings: LeaderboardEntry[] };
type WsFrame = { channel: string; payload: LeaderboardPayload };

export function useLeaderboard() {
  const frame = useWebSocket<WsFrame>(`${WS_URL}?channel=leaderboard`);

  const query = useQuery<LeaderboardPayload>({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/leaderboard`);
      if (!response.ok) throw new Error('Failed to load leaderboard');
      return response.json();
    },
    refetchInterval: 300_000,
  });

  return {
    rankings: (frame?.payload?.rankings ?? query.data?.rankings ?? []) as LeaderboardEntry[],
    isLoading: query.isLoading && !frame,
  };
}
