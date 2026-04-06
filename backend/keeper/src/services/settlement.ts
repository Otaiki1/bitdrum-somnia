import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import dotenv from 'dotenv';
import { fetchOraclePrice } from './oracle';
import { loadKeeperState, saveKeeperState, upsertMarketState } from './keeperState';

dotenv.config();

const SOMNIA_RPC_URL = process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';
const PREDICTION_MARKET_ADDRESS = process.env.PREDICTION_MARKET_ADDRESS || '';
const SETTLEMENT_ENGINE_ADDRESS = process.env.SETTLEMENT_ENGINE_ADDRESS || '';
const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY || '';
const KEEPERS_POM_BPS = Number(process.env.KEEPER_POM_BPS || 0);
const ORACLE_MAX_AGE_SECONDS = Number(process.env.ORACLE_MAX_AGE_SECONDS || 30);

const provider = new JsonRpcProvider(SOMNIA_RPC_URL);
const signer = KEEPER_PRIVATE_KEY ? new Wallet(KEEPER_PRIVATE_KEY, provider) : null;

const marketAbi = [
  'function nextMarketId() view returns (uint256)',
  'function getMarket(uint256 marketId) view returns ((uint256 marketId,address opener,uint8 openerDirection,uint256 duration,uint256 openedAt,uint256 joiningWindowEnd,uint256 expiryAt,uint128 strikePrice,uint128 settlementPrice,uint128 strikeTimestamp,uint128 settlementTimestamp,uint256 pomProfitBps,uint256 upPool,uint256 downPool,uint256 totalUserStaked,uint256 vaultCommitted,uint256 feeAmount,uint256 sweptToVault,uint256 participantCount,uint256 claimedCount,uint8 state,uint8 outcome))',
  'function setPomProfitBps(uint256 marketId, uint256 pomProfitBps)',
  'function lockMarket(uint256 marketId)',
];

const settlementEngineAbi = [
  'function settle(uint256 marketId, tuple(uint128 price, uint128 timestamp) priceData)',
];

type MarketSnapshot = {
  marketId: bigint;
  opener: string;
  openerDirection: number;
  duration: bigint;
  openedAt: bigint;
  joiningWindowEnd: bigint;
  expiryAt: bigint;
  strikePrice: bigint;
  settlementPrice: bigint;
  strikeTimestamp: bigint;
  settlementTimestamp: bigint;
  pomProfitBps: bigint;
  upPool: bigint;
  downPool: bigint;
  totalUserStaked: bigint;
  vaultCommitted: bigint;
  feeAmount: bigint;
  sweptToVault: bigint;
  participantCount: bigint;
  claimedCount: bigint;
  state: number;
  outcome: number;
};

const MARKET_STATE = {
  NONE: 0,
  OPEN: 1,
  LOCKED: 2,
  CLAIMABLE: 3,
  CLOSED: 4,
} as const;

const marketContract = signer ? new Contract(PREDICTION_MARKET_ADDRESS, marketAbi, signer) : null;
const settlementEngineContract = signer
  ? new Contract(SETTLEMENT_ENGINE_ADDRESS, settlementEngineAbi, signer)
  : null;

function assertKeeperReady() {
  if (!marketContract || !settlementEngineContract) {
    throw new Error('Keeper is missing PREDICTION_MARKET_ADDRESS, SETTLEMENT_ENGINE_ADDRESS, or KEEPER_PRIVATE_KEY');
  }
}

function toNumber(value: bigint) {
  return Number(value);
}

function marketStateLabel(state: number) {
  if (state === MARKET_STATE.OPEN) return 'OPEN';
  if (state === MARKET_STATE.LOCKED) return 'LOCKED';
  if (state === MARKET_STATE.CLAIMABLE) return 'CLAIMABLE';
  if (state === MARKET_STATE.CLOSED) return 'CLOSED';
  return 'NONE';
}

function assertFreshSnapshot(timestamp: number) {
  const age = Math.floor(Date.now() / 1000) - timestamp;

  if (age < 0 || age > ORACLE_MAX_AGE_SECONDS) {
    throw new Error(`Oracle snapshot is stale (${age}s old)`);
  }
}

async function fetchMarketSnapshot(marketId: number): Promise<MarketSnapshot> {
  assertKeeperReady();
  return (await marketContract!.getMarket(marketId)) as MarketSnapshot;
}

export const settleExpiredMarkets = async () => {
  const keeperState = await loadKeeperState();

  try {
    assertKeeperReady();
    const lastMarketId = Number(await marketContract!.nextMarketId());
    const currentTimestamp = Math.floor(Date.now() / 1000);

    for (let marketId = 1; marketId <= lastMarketId; marketId += 1) {
      try {
        const market = await fetchMarketSnapshot(marketId);
        const joinDeadline = toNumber(market.joiningWindowEnd);
        const expiryAt = toNumber(market.expiryAt);

        upsertMarketState(keeperState, String(marketId), {
          joinDeadline,
          expiryAt,
          lastKnownState: marketStateLabel(market.state),
        });

        if (market.state === MARKET_STATE.OPEN && currentTimestamp >= joinDeadline) {
          if (KEEPERS_POM_BPS > 0 && Number(market.pomProfitBps) !== KEEPERS_POM_BPS) {
            const pomTx = await marketContract!.setPomProfitBps(marketId, KEEPERS_POM_BPS);
            await pomTx.wait();
          }

          const lockTx = await marketContract!.lockMarket(marketId);
          await lockTx.wait();

          upsertMarketState(keeperState, String(marketId), {
            joinDeadline,
            expiryAt,
            lastKnownState: 'LOCKED',
            lastAttemptAt: new Date().toISOString(),
            lockTxHash: lockTx.hash,
            lastError: undefined,
          });

          continue;
        }

        if (market.state === MARKET_STATE.LOCKED && currentTimestamp >= expiryAt) {
          const snapshot = await fetchOraclePrice();
          assertFreshSnapshot(snapshot.timestamp);

          const tx = await settlementEngineContract!.settle(marketId, {
            price: snapshot.price,
            timestamp: snapshot.timestamp,
          });
          await tx.wait();

          upsertMarketState(keeperState, String(marketId), {
            joinDeadline,
            expiryAt,
            lastKnownState: 'CLAIMABLE',
            lastAttemptAt: new Date().toISOString(),
            settlementPrice: snapshot.price.toString(),
            settlementTxHash: tx.hash,
            lastError: undefined,
          });
        }
      } catch (error: any) {
        upsertMarketState(keeperState, String(marketId), {
          lastAttemptAt: new Date().toISOString(),
          lastError: error?.message || String(error),
        });

        console.error(`[Keeper] Market ${marketId} failed:`, error?.message || error);
      }
    }
  } catch (error) {
    console.error('[Keeper] Polling error:', error);
  } finally {
    await saveKeeperState(keeperState);
  }
};
