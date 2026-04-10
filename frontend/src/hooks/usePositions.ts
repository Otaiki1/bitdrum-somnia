'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE, WS_URL } from '../utils/somnia';
import {
  type PositionRecord,
  isResolvedPositionStatus,
  normalizeUnixTimestamp,
  toIsoFromTimestamp,
} from '../utils/bitdrum';
import { useWebSocket } from './useWebSocket';
import { readMarketsOnchain } from '../utils/contracts';

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
  const basePositions = useMemo(
    () => (livePayload?.positions ?? query.data?.positions ?? []) as PositionRecord[],
    [livePayload?.positions, query.data?.positions],
  );

  const marketIds = useMemo(
    () => Array.from(new Set(basePositions.map((position) => position.market_id).filter(Boolean))).sort(),
    [basePositions],
  );

  const onchainMarkets = useQuery({
    queryKey: ['positions-onchain', marketIds],
    queryFn: () => readMarketsOnchain(marketIds),
    enabled: marketIds.length > 0,
    refetchInterval: 5_000,
  });

  const positions = useMemo(() => {
    const onchainById = new Map((onchainMarkets.data ?? []).map((market) => [market.id, market]));

    return basePositions.map((position) => {
      const onchain = onchainById.get(position.market_id);
      const direction = String(position.direction || onchain?.direction || '').toUpperCase();
      const rawOutcome = onchain?.outcome ?? position.outcome ?? null;
      const outcome = rawOutcome ? String(rawOutcome).toUpperCase() : null;

      let status = String(position.status || '').toUpperCase();
      if (outcome === 'DRAW') {
        status = 'DRAW';
      } else if ((outcome === 'UP' || outcome === 'DOWN') && (direction === 'UP' || direction === 'DOWN')) {
        status = direction === outcome ? 'WIN' : 'LOSS';
      }

      const claimed = Boolean(position.claimed);
      const canClaim = !claimed && (position.can_claim || status === 'WIN' || status === 'DRAW');

      return {
        ...position,
        direction,
        claimed,
        can_claim: canClaim,
        status,
        outcome,
        entry_price: position.entry_price ?? onchain?.entry_price ?? null,
        settlement_price: position.settlement_price ?? onchain?.settlement_price ?? null,
        join_deadline: normalizeUnixTimestamp(position.join_deadline as number | string | null | undefined) ?? onchain?.join_deadline ?? null,
        settlement_deadline:
          normalizeUnixTimestamp(position.settlement_deadline as number | string | null | undefined) ?? onchain?.settlement_deadline ?? null,
        opened_at:
          (typeof position.opened_at === 'string' && position.opened_at)
          || toIsoFromTimestamp(position.opened_at as number | string | null | undefined)
          || toIsoFromTimestamp(onchain?.opened_at)
          || null,
        settled_at:
          (typeof position.settled_at === 'string' && position.settled_at)
          || toIsoFromTimestamp(position.settled_at as number | string | null | undefined)
          || (isResolvedPositionStatus(status) ? new Date().toISOString() : null),
      } satisfies PositionRecord;
    });
  }, [basePositions, onchainMarkets.data]);

  return {
    positions,
    summary: livePayload?.summary ?? query.data?.summary ?? null,
    isLoading: (query.isLoading || onchainMarkets.isLoading) && positions.length === 0 && !livePayload,
  };
}
