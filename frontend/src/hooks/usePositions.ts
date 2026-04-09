'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE, WS_URL } from '../utils/somnia';
import { type PositionRecord } from '../utils/bitdrum';
import { useWebSocket } from './useWebSocket';

type PositionsPayload = {
  positions: PositionRecord[];
  summary: {
    win_rate: number;
    resolved_pnl: string;
  } | null;
};

type WsFrame = {
  channel: string;
  payload: PositionsPayload;
};

export function usePositions(address: string | null | undefined) {
  const wsUrl = address
    ? `${WS_URL}?channel=positions&address=${address}`
    : null;

  const frame = useWebSocket<WsFrame>(wsUrl);

  const query = useQuery<PositionsPayload>({
    queryKey: ['positions', address],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/positions/${address}`);
      if (!response.ok) throw new Error('Unable to load positions');
      return response.json();
    },
    enabled: Boolean(address),
    refetchInterval: 15_000,
  });

  const livePayload = frame?.payload;

  return {
    positions: (livePayload?.positions ?? query.data?.positions ?? []) as PositionRecord[],
    summary: livePayload?.summary ?? query.data?.summary ?? null,
    isLoading: query.isLoading && !livePayload,
  };
}
