/**
 * marketLifecycle.ts
 *
 * Polls all open and locked markets and takes the appropriate action:
 *
 *   OPEN  + joiningWindowEnd elapsed  → lockMarket(marketId)
 *   LOCKED + expiryAt elapsed         → settlementEngine.settle(marketId)
 *
 * Settlement reads the price from BitdrumPriceAdapter (no oracle data param).
 * Idempotency: skips markets already in a terminal or wrong state.
 * Checkpoints: persists per-market state to disk so restarts don't lose context.
 */

import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import { loadKeeperState, saveKeeperState, upsertMarketState } from './keeperState';

const SOMNIA_RPC_URL             = process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';
const PREDICTION_MARKET_ADDRESS  = process.env.PREDICTION_MARKET_ADDRESS || '';
const SETTLEMENT_ENGINE_ADDRESS  = process.env.SETTLEMENT_ENGINE_ADDRESS || '';
const KEEPER_PRIVATE_KEY         = process.env.KEEPER_PRIVATE_KEY || '';

const MARKET_STATE = {
  NONE:      0,
  OPEN:      1,
  LOCKED:    2,
  CLAIMABLE: 3,
  CLOSED:    4,
} as const;

const MARKET_ABI = [
  'function nextMarketId() view returns (uint256)',
  'function getMarket(uint256 marketId) view returns ((uint256 marketId,address opener,uint8 openerDirection,uint256 duration,uint256 openedAt,uint256 joiningWindowEnd,uint256 expiryAt,uint128 strikePrice,uint128 settlementPrice,uint128 strikeTimestamp,uint128 settlementTimestamp,uint256 pomProfitBps,uint256 upPool,uint256 downPool,uint256 totalUserStaked,uint256 vaultCommitted,uint256 feeAmount,uint256 sweptToVault,uint256 participantCount,uint256 claimedCount,uint8 state,uint8 outcome))',
  'function lockMarket(uint256 marketId)',
];

const SETTLEMENT_ABI = [
  'function settle(uint256 marketId)',
];

type MarketData = {
  marketId: bigint;
  state: number;
  joiningWindowEnd: bigint;
  expiryAt: bigint;
  strikePrice: bigint;
  duration: bigint;
};

let provider: JsonRpcProvider | null = null;
let signer: Wallet | null = null;
let marketContract: Contract | null = null;
let settlementContract: Contract | null = null;

function ensureContracts() {
  if (!marketContract || !settlementContract) {
    if (!PREDICTION_MARKET_ADDRESS || !SETTLEMENT_ENGINE_ADDRESS || !KEEPER_PRIVATE_KEY) {
      throw new Error('[MarketLifecycle] PREDICTION_MARKET_ADDRESS, SETTLEMENT_ENGINE_ADDRESS, or KEEPER_PRIVATE_KEY is missing');
    }
    provider           = new JsonRpcProvider(SOMNIA_RPC_URL);
    signer             = new Wallet(KEEPER_PRIVATE_KEY, provider);
    marketContract     = new Contract(PREDICTION_MARKET_ADDRESS, MARKET_ABI, signer);
    settlementContract = new Contract(SETTLEMENT_ENGINE_ADDRESS, SETTLEMENT_ABI, signer);
  }
  return { marketContract: marketContract!, settlementContract: settlementContract! };
}

function marketStateLabel(state: number) {
  switch (state) {
    case MARKET_STATE.OPEN:      return 'OPEN';
    case MARKET_STATE.LOCKED:    return 'LOCKED';
    case MARKET_STATE.CLAIMABLE: return 'CLAIMABLE';
    case MARKET_STATE.CLOSED:    return 'CLOSED';
    default:                     return 'NONE';
  }
}

async function processMarket(
  id: number,
  market: MarketContract,
  settlement: Contract,
  nowSeconds: number,
): Promise<string | null> {
  const raw = await market.getMarket(id);
  // Ethers Result: accept both array-indexed and named access.
  const data: MarketData = {
    marketId:         raw.marketId ?? raw[0],
    state:            Number(raw.state ?? raw[20]),
    joiningWindowEnd: raw.joiningWindowEnd ?? raw[5],
    expiryAt:         raw.expiryAt ?? raw[6],
    strikePrice:      raw.strikePrice ?? raw[7],
    duration:         raw.duration ?? raw[3],
  };

  const state           = data.state;
  const joinDeadline    = Number(data.joiningWindowEnd);
  const expiryAt        = Number(data.expiryAt);
  const stateLabel      = marketStateLabel(state);

  if (state === MARKET_STATE.OPEN && nowSeconds >= joinDeadline) {
    console.log(JSON.stringify({ event: 'lock_attempt', marketId: id, joinDeadline }));
    const tx = await market.lockMarket(id);
    await tx.wait();
    console.log(JSON.stringify({ event: 'market_locked', marketId: id, txHash: tx.hash }));
    return 'LOCKED';
  }

  if (state === MARKET_STATE.LOCKED && nowSeconds >= expiryAt) {
    console.log(JSON.stringify({ event: 'settle_attempt', marketId: id, expiryAt }));
    const tx = await settlement.settle(id);
    await tx.wait();
    console.log(JSON.stringify({ event: 'market_settled', marketId: id, txHash: tx.hash }));
    return 'CLAIMABLE';
  }

  return stateLabel;
}

// Workaround for ethers Result type
type MarketContract = Contract;

export async function runMarketLifecycleOnce(): Promise<void> {
  const keeperState = await loadKeeperState();
  const { marketContract: market, settlementContract: settlement } = ensureContracts();

  const lastMarketId  = Number(await market.nextMarketId());
  const nowSeconds    = Math.floor(Date.now() / 1000);

  for (let id = 1; id <= lastMarketId; id++) {
    try {
      const raw   = await market.getMarket(id);
      const state = Number(raw.state ?? raw[20]);

      // Skip terminal states — no action needed.
      if (state === MARKET_STATE.CLAIMABLE || state === MARKET_STATE.CLOSED || state === MARKET_STATE.NONE) {
        const stateLabel = marketStateLabel(state);
        upsertMarketState(keeperState, String(id), { lastKnownState: stateLabel });
        continue;
      }

      const joinDeadline = Number(raw.joiningWindowEnd ?? raw[5]);
      const expiryAt     = Number(raw.expiryAt ?? raw[6]);

      upsertMarketState(keeperState, String(id), {
        joinDeadline,
        expiryAt,
        lastKnownState: marketStateLabel(state),
      });

      const nextState = await processMarket(id, market, settlement, nowSeconds);

      if (nextState) {
        upsertMarketState(keeperState, String(id), {
          joinDeadline,
          expiryAt,
          lastKnownState: nextState,
          lastAttemptAt: new Date().toISOString(),
          lastError: undefined,
        });
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      upsertMarketState(keeperState, String(id), {
        lastAttemptAt: new Date().toISOString(),
        lastError:     msg,
      });
      console.error(JSON.stringify({ event: 'market_error', marketId: id, error: msg }));
    }
  }

  await saveKeeperState(keeperState);
}

export async function startMarketLifecycle(intervalMs: number): Promise<void> {
  console.log(`[MarketLifecycle] Starting. Interval: ${intervalMs}ms`);

  const loop = async () => {
    try {
      await runMarketLifecycleOnce();
    } catch (err: any) {
      console.error(JSON.stringify({
        event:   'lifecycle_error',
        message: err?.message || String(err),
      }));
    }
    setTimeout(loop, intervalMs);
  };

  loop();
}
