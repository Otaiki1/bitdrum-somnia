'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useBitdrumWallet } from './BitdrumWalletProvider';
import { usePositions } from '../hooks/usePositions';
import {
  claimMarket,
  formatTimeframe,
  formatTokenAmount,
  formatUsdPriceLabel,
  isResolvedPositionStatus,
  normalizeUnixTimestamp,
  type PositionRecord,
} from '../utils/bitdrum';
import { SOMNIA_EXPLORER_BASE_URL } from '../utils/somnia';
import { Eyebrow, Panel, StatPill } from './ObsidianPrimitives';

function CountdownTimer({ settlementDeadline }: { settlementDeadline: number | null }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (!settlementDeadline) return;
    const id = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [settlementDeadline]);

  const remaining = settlementDeadline ? Math.max(0, settlementDeadline - now) : null;

  if (remaining === null) return null;
  
  if (remaining <= 0) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(245,185,66,0.18)] bg-[rgba(245,185,66,0.08)] px-3 py-1 text-[0.62rem] uppercase tracking-[0.24em] text-[var(--accent-gold)]">
        <Loader2 className="h-3 w-3 animate-spin" />
        Settling
      </span>
    );
  }

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return (
    <span className="rounded-full border border-[rgba(245,185,66,0.18)] bg-[rgba(245,185,66,0.08)] px-3 py-1 text-[0.62rem] uppercase tracking-[0.24em] text-[var(--accent-gold)]">
      {mins > 0 ? `${mins}m ${secs.toString().padStart(2, '0')}s` : `${secs}s`}
    </span>
  );
}

export function PortfolioBoard() {
  const queryClient = useQueryClient();
  const { wallet, address, authenticated, connect } = useBitdrumWallet();
  const { positions, summary, isLoading } = usePositions(address);
  const [claimingMarketId, setClaimingMarketId] = useState<string | null>(null);

  const handleClaim = async (marketId: string) => {
    if (!wallet) return;
    setClaimingMarketId(marketId);
    try {
      const tx = await claimMarket({ wallet, marketId });
      await tx.wait();
      await queryClient.invalidateQueries({ queryKey: ['positions', address] });
    } finally {
      setClaimingMarketId(null);
    }
  };

  return (
    <div className="grid gap-6">
      <Panel className="surface-lift p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <StatPill label="Resolved PnL" value={`${formatTokenAmount(summary?.resolved_pnl || '0')} STT`} accent={Number(summary?.resolved_pnl || 0) >= 0 ? 'success' : 'danger'} />
          <StatPill label="Win Rate" value={`${((summary?.win_rate || 0) * 100).toFixed(1)}%`} accent="gold" />
        </div>
      </Panel>

      <Panel className="surface-lift p-5 sm:p-6">
        <Eyebrow accent="gold">Positions</Eyebrow>
        <h2 className="mt-3 font-heading text-[2rem] font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
          Every call, claim, and settlement
        </h2>

        {!authenticated ? (
          <button
            onClick={() => void connect()}
            className="cta-press mt-6 rounded-full bg-[linear-gradient(135deg,var(--accent-gold),#d97706)] px-5 py-3 text-sm text-[#140c00]"
          >
            Connect wallet
          </button>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          {isLoading && !positions.length ? (
            <div className="rounded-[1.5rem] border border-dashed border-[color:var(--border-subtle)] px-4 py-12 text-center text-[0.68rem] uppercase tracking-[0.34em] text-[var(--text-muted)]">
              Reading positions
            </div>
          ) : positions.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-[color:var(--border-subtle)] px-4 py-12 text-center text-[0.68rem] uppercase tracking-[0.34em] text-[var(--text-muted)]">
              No positions yet
            </div>
          ) : (
            positions.map((position: PositionRecord) => (
              <article
                key={`${position.market_id}-${position.direction}`}
                className="rounded-[1.6rem] border border-[color:var(--border-subtle)] bg-[rgba(255,255,255,0.03)] px-5 py-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="font-heading text-[1.35rem] tracking-[-0.04em] text-[var(--text-primary)]">
                      Market #{position.market_id} · {position.direction.toUpperCase()}
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatPill label="Status" value={isResolvedPositionStatus(position.status) ? position.status : (normalizeUnixTimestamp(position.settlement_deadline) && normalizeUnixTimestamp(position.settlement_deadline)! <= Math.floor(Date.now() / 1000) ? 'SETTLING' : 'LIVE')} accent={position.status === 'WIN' ? 'gold' : position.status === 'LOSS' ? 'danger' : position.status === 'DRAW' ? 'core' : 'neutral'} />
                      {position.duration_seconds ? <StatPill label="Round" value={formatTimeframe(position.duration_seconds)} accent="neutral" /> : null}
                      {!isResolvedPositionStatus(position.status) && normalizeUnixTimestamp(position.settlement_deadline) ? (
                        <CountdownTimer settlementDeadline={normalizeUnixTimestamp(position.settlement_deadline)} />
                      ) : null}
                    </div>
                  </div>
                  {position.can_claim ? (
                    <button
                      onClick={() => handleClaim(position.market_id)}
                      disabled={claimingMarketId === position.market_id}
                      className="cta-press rounded-full bg-[linear-gradient(135deg,var(--accent-gold),#d97706)] px-4 py-2 text-[0.72rem] uppercase tracking-[0.24em] text-[#140c00] disabled:opacity-60"
                    >
                      {claimingMarketId === position.market_id ? 'Claiming...' : 'Claim Payout'}
                    </button>
                  ) : null}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-4">
                  <StatPill label="Stake" value={`${formatTokenAmount(position.stake_amount)} STT`} />
                  <StatPill label="Expected" value={`${formatTokenAmount(position.expected_payout)} STT`} accent="gold" />
                  <StatPill label="Entry" value={formatUsdPriceLabel(position.entry_price)} accent="core" />
                  <StatPill label="Settlement" value={formatUsdPriceLabel(position.settlement_price)} accent={position.status === 'WIN' ? 'success' : position.status === 'DRAW' ? 'core' : 'danger'} />
                  <StatPill label="PnL" value={`${formatTokenAmount(position.net_pnl)} STT`} accent={Number(position.net_pnl) >= 0 ? 'success' : 'danger'} />
                </div>

                {position.transaction_hash ? (
                  <a
                    href={`${SOMNIA_EXPLORER_BASE_URL}/tx/${position.transaction_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.24em] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                  >
                    View transaction
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </article>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
