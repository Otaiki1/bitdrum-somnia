import {
  Account,
  CairoOption,
  CairoOptionVariant,
  Contract,
  RpcProvider,
} from 'starknet';
import dotenv from 'dotenv';
import { fetchPragmaPrice, type PragmaPriceSnapshot } from './oracle';
import { loadKeeperState, saveKeeperState, upsertMarketState } from './keeperState';

dotenv.config();

const MARKET_CONTRACT_ADDRESS = process.env.MARKET_CONTRACT_ADDRESS || '';
const SETTLEMENT_ENGINE_ADDRESS = process.env.SETTLEMENT_ENGINE_ADDRESS || '';
const KEEPER_ADDRESS = process.env.KEEPER_ADDRESS || '';
const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY || '';
const SETTLEMENT_DELAY_SECONDS = Number(process.env.SETTLEMENT_DELAY_SECONDS || 60);
const MAX_ATTESTATION_AGE_SECONDS = Number(process.env.ATTESTATION_MAX_AGE_SECONDS || 30);

const provider = new RpcProvider({
  nodeUrl: process.env.STARKNET_RPC_URL || 'https://starknet-sepolia.public.blastapi.io',
  specVersion: '0.9.0',
  blockIdentifier: 'latest',
});

const account = new Account({
  provider,
  address: KEEPER_ADDRESS,
  signer: KEEPER_PRIVATE_KEY,
});

let predictionMarketContract: Contract | null = null;
let settlementEngineContract: Contract | null = null;

const MARKET_STATES = {
  Placeholder: 0,
  Open: 1,
  Locked: 2,
  Settled: 3,
  Claimable: 4,
  Closed: 5,
} as const;

function toDecimalString(value: unknown): string {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'number') {
    return Math.trunc(value).toString();
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object' && 'toString' in value) {
    return String(value.toString());
  }

  return '0';
}

function toSafeNumber(value: unknown): number {
  return Number(toDecimalString(value));
}

function marketStateLabel(state: number) {
  return Object.entries(MARKET_STATES).find(([, value]) => value === state)?.[0] || 'Unknown';
}

function parseMarketState(state: any): number {
  if (typeof state === 'number') {
    return state;
  }

  if (typeof state === 'bigint') {
    return Number(state);
  }

  if (typeof state === 'string') {
    return MARKET_STATES[state as keyof typeof MARKET_STATES] ?? Number(state);
  }

  if (typeof state?.activeVariant === 'function') {
    return MARKET_STATES[state.activeVariant() as keyof typeof MARKET_STATES] ?? 0;
  }

  if (state?.variant && typeof state.variant === 'object') {
    const activeEntry = Object.entries(state.variant).find(([, value]) => value !== undefined);
    if (activeEntry) {
      return MARKET_STATES[activeEntry[0] as keyof typeof MARKET_STATES] ?? 0;
    }
  }

  return Number(state ?? 0);
}

function buildSettlementPayload(snapshot: PragmaPriceSnapshot) {
  return {
    price: snapshot.price,
    decimals: snapshot.decimals,
    last_updated_timestamp: snapshot.lastUpdatedTimestamp,
    num_sources_aggregated: snapshot.numSourcesAggregated,
    expiration_timestamp: new CairoOption(CairoOptionVariant.None),
  };
}

async function getPredictionMarketContract() {
  if (!predictionMarketContract) {
    const marketClass = await provider.getClassAt(MARKET_CONTRACT_ADDRESS);
    predictionMarketContract = new Contract({
      abi: marketClass.abi,
      address: MARKET_CONTRACT_ADDRESS,
      providerOrAccount: provider,
    });
  }

  return predictionMarketContract;
}

async function getSettlementEngineContract() {
  if (!settlementEngineContract) {
    const engineClass = await provider.getClassAt(SETTLEMENT_ENGINE_ADDRESS);
    settlementEngineContract = new Contract({
      abi: engineClass.abi,
      address: SETTLEMENT_ENGINE_ADDRESS,
      providerOrAccount: provider,
    });
  }

  return settlementEngineContract;
}

function assertFreshSnapshot(snapshot: PragmaPriceSnapshot, currentTimestamp: number) {
  const attestationAge = currentTimestamp - snapshot.lastUpdatedTimestamp;

  if (attestationAge < 0) {
    throw new Error('Pragma oracle timestamp is in the future');
  }

  if (attestationAge > MAX_ATTESTATION_AGE_SECONDS) {
    throw new Error(`Pragma oracle snapshot is stale (${attestationAge}s old)`);
  }
}

export const settleExpiredMarkets = async () => {
  const keeperState = await loadKeeperState();

  try {
    const marketContract = await getPredictionMarketContract();
    const engineContract = await getSettlementEngineContract();
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const marketCount = toSafeNumber(await marketContract.market_count());

    for (let marketId = 1; marketId <= marketCount; marketId += 1) {
      try {
        const market: any = await marketContract.get_market(marketId);
        const state = parseMarketState(market.state);
        const joinDeadline = toSafeNumber(market.join_deadline);

        upsertMarketState(keeperState, String(marketId), {
          joinDeadline,
          lastKnownState: marketStateLabel(state),
        });

        if (state === MARKET_STATES.Open && currentTimestamp >= joinDeadline) {
          const snapshot = await fetchPragmaPrice(provider);
          assertFreshSnapshot(snapshot, currentTimestamp);

          console.log(
            `[Keeper] Locking market ${marketId} at ${snapshot.price} (${snapshot.lastUpdatedTimestamp})`,
          );

          const lockCall = marketContract.populate('lock_market', [marketId]);
          const setEntryPriceCall = engineContract.populate('set_entry_price', [
            marketId,
            snapshot.price,
          ]);

          const { transaction_hash } = await account.execute([lockCall, setEntryPriceCall]);

          upsertMarketState(keeperState, String(marketId), {
            joinDeadline,
            lastKnownState: 'Locked',
            lastAttemptAt: new Date().toISOString(),
            entryPrice: snapshot.price,
            lockTxHash: transaction_hash,
          });

          console.log(`[Keeper] Market ${marketId} locked: ${transaction_hash}`);
          continue;
        }

        if (state === MARKET_STATES.Locked && currentTimestamp >= joinDeadline + SETTLEMENT_DELAY_SECONDS) {
          const snapshot = await fetchPragmaPrice(provider);
          assertFreshSnapshot(snapshot, currentTimestamp);

          console.log(
            `[Keeper] Settling market ${marketId} at ${snapshot.price} (${snapshot.lastUpdatedTimestamp})`,
          );

          const settleCall = engineContract.populate('settle', [
            marketId,
            buildSettlementPayload(snapshot),
          ]);

          const { transaction_hash } = await account.execute(settleCall);

          upsertMarketState(keeperState, String(marketId), {
            joinDeadline,
            lastKnownState: 'Claimable',
            lastAttemptAt: new Date().toISOString(),
            settlementPrice: snapshot.price,
            settlementTxHash: transaction_hash,
          });

          console.log(`[Keeper] Settlement submitted for ${marketId}: ${transaction_hash}`);
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
