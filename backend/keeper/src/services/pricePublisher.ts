/**
 * pricePublisher.ts
 *
 * Fetches the current BTC/USD price and posts it as a round to the
 * BitdrumPriceAdapter contract on a fixed cadence (PUBLISH_INTERVAL_MS).
 *
 * The market and settlement contracts read from the adapter — this loop
 * is the sole trusted price source for the v2 protocol.
 */

import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import { fetchOraclePrice } from './oracle';

const SOMNIA_RPC_URL             = process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';
const PRICE_ADAPTER_ADDRESS      = process.env.PRICE_ADAPTER_ADDRESS || '';
const KEEPER_PRIVATE_KEY         = process.env.KEEPER_PRIVATE_KEY || '';
// Default 20s cadence: fast enough for 1m market settlement.
export const PUBLISH_INTERVAL_MS = Number(process.env.PRICE_PUBLISH_INTERVAL_MS || 20_000);
// If the latest onchain round is younger than this, skip posting.
const MIN_POST_INTERVAL_S        = Number(process.env.MIN_PRICE_POST_INTERVAL_S || 15);

const ADAPTER_ABI = [
  'function latestRoundId() view returns (uint256)',
  'function getLatestRound() view returns (uint256 roundId, uint128 price, uint128 timestamp)',
  'function postPrice(uint128 price, uint128 timestamp) returns (uint256 roundId)',
];

let provider: JsonRpcProvider | null = null;
let signer: Wallet | null = null;
let adapterContract: Contract | null = null;

function ensureContracts() {
  if (!PRICE_ADAPTER_ADDRESS) {
    throw new Error('[PricePublisher] PRICE_ADAPTER_ADDRESS is not set');
  }
  if (!KEEPER_PRIVATE_KEY) {
    throw new Error('[PricePublisher] KEEPER_PRIVATE_KEY is not set');
  }
  if (!adapterContract) {
    provider        = new JsonRpcProvider(SOMNIA_RPC_URL);
    signer          = new Wallet(KEEPER_PRIVATE_KEY, provider);
    adapterContract = new Contract(PRICE_ADAPTER_ADDRESS, ADAPTER_ABI, signer);
  }
  return adapterContract;
}

export async function publishPriceOnce(): Promise<void> {
  const adapter = ensureContracts();

  // Check if the current onchain round is already fresh enough.
  try {
    const [, , latestTs] = await adapter.getLatestRound() as [bigint, bigint, bigint];
    const age = Math.floor(Date.now() / 1000) - Number(latestTs);
    if (age < MIN_POST_INTERVAL_S) {
      console.log(`[PricePublisher] Latest round is ${age}s old — skipping (min interval: ${MIN_POST_INTERVAL_S}s)`);
      return;
    }
  } catch {
    // No rounds yet — proceed to post.
  }

  const snapshot = await fetchOraclePrice();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const priceTimestamp = Math.min(snapshot.timestamp, nowSeconds); // safety: don't post future

  const tx = await adapter.postPrice(snapshot.price, priceTimestamp);
  const receipt = await tx.wait();
  const roundId = await adapter.latestRoundId();

  console.log(JSON.stringify({
    event:     'price_posted',
    roundId:   roundId.toString(),
    price:     snapshot.price.toString(),
    timestamp: priceTimestamp,
    source:    snapshot.source,
    txHash:    receipt.hash,
  }));
}

export async function startPricePublisher(): Promise<void> {
  console.log(`[PricePublisher] Starting. Interval: ${PUBLISH_INTERVAL_MS}ms`);

  const loop = async () => {
    try {
      await publishPriceOnce();
    } catch (err: any) {
      console.error(JSON.stringify({
        event:   'price_publish_error',
        message: err?.message || String(err),
      }));
    }
    setTimeout(loop, PUBLISH_INTERVAL_MS);
  };

  loop();
}
