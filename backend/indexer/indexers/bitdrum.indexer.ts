import { defineIndexer } from "apibara/indexer";
import { useLogger } from "apibara/plugins";
import type { ApibaraRuntimeConfig } from "apibara/types";
import { StarknetStream } from "@apibara/starknet";
import { hash } from "starknet";
import { drizzle, drizzleStorage, useDrizzleStorage } from "@apibara/plugin-drizzle";
import { and, eq } from "drizzle-orm";
import { markets, stakes, traders } from "../lib/schema.js";

// ---------------------------------------------------------------------------
// Drizzle DB instance
// ---------------------------------------------------------------------------
const db = drizzle({
  schema: { markets, stakes, traders },
});

// ---------------------------------------------------------------------------
// Starknet event selector hashes (keccak256 of the event name)
// ---------------------------------------------------------------------------
const MARKET_OPENED_SELECTOR = hash.getSelectorFromName("MarketOpened");
const MARKET_JOINED_SELECTOR = hash.getSelectorFromName("MarketJoined");
const MARKET_LOCKED_SELECTOR = hash.getSelectorFromName("MarketLocked");
const MARKET_CLAIMABLE_SELECTOR = hash.getSelectorFromName("MarketClaimable");
const CLAIMED_SELECTOR = hash.getSelectorFromName("Claimed");

// ---------------------------------------------------------------------------
// Helpers — decode felt252 (hex string) to friendly values
// ---------------------------------------------------------------------------
function feltToAddress(felt: string | undefined): string {
  if (!felt) return "0x0";
  return "0x" + BigInt(felt).toString(16).padStart(64, "0");
}

function feltToU128(felt: string | undefined): string {
  if (!felt) return "0";
  return BigInt(felt).toString();
}

function feltToU64(felt: string | undefined): number {
  if (!felt) return 0;
  return Number(BigInt(felt));
}

/**
 * Direction: 0 = Placeholder, 1 = Long, 2 = Short
 */
function feltToDirection(felt: string | undefined): string {
  const val = Number(BigInt(felt ?? "0"));
  if (val === 1) return "Long";
  if (val === 2) return "Short";
  return "Placeholder";
}

// ---------------------------------------------------------------------------
// Upsert helper — ensures a trader row exists before we reference it
// ---------------------------------------------------------------------------
async function ensureTrader(db: ReturnType<typeof useDrizzleStorage>["db"], address: string) {
  await db
    .insert(traders)
    .values({ address })
    .onConflictDoNothing();
}

// ---------------------------------------------------------------------------
// Main Indexer
// ---------------------------------------------------------------------------
export default function (runtimeConfig: ApibaraRuntimeConfig) {
  const { startingBlock, streamUrl, predictionMarketAddress } =
    runtimeConfig.bitdrum as {
      startingBlock: number;
      streamUrl: string;
      predictionMarketAddress: string;
    };

  return defineIndexer(StarknetStream)({
    streamUrl,
    finality: "accepted",
    startingBlock: BigInt(startingBlock),

    // Filter: only events from our PredictionMarket contract
    filter: {
      events: [
        { address: predictionMarketAddress as `0x${string}` },
      ],
    },

    plugins: [drizzleStorage({ db })],

    async transform({ block }) {
      const logger = useLogger();
      const { db } = useDrizzleStorage();
      const { events, header } = block;

      if (!events || events.length === 0) return;

      logger.log(
        `Block ${header?.blockNumber} — processing ${events.length} event(s)`
      );

      for (const event of events) {
        const selector = event.keys?.[0];
        const txHash = event.transactionHash ?? "0x0";

        // -----------------------------------------------------------------------
        // MarketOpened(market_id, opener, direction, pom_profit_bps, stake, join_deadline)
        // keys[0] = selector, keys[1] = market_id
        // data[0] = opener, data[1] = direction, data[2] = pom_profit_bps,
        // data[3] = stake (low), data[4] = stake (high), data[5] = join_deadline
        // -----------------------------------------------------------------------
        if (selector === MARKET_OPENED_SELECTOR) {
          const marketId = event.keys?.[1];
          const opener = feltToAddress(event.data?.[0]);
          const direction = feltToDirection(event.data?.[1]);
          const pomBps = feltToU64(event.data?.[2]);
          // stake is a u128 stored as two u64 felts (low, high)
          const stake = feltToU128(event.data?.[3]);
          const joinDeadline = feltToU64(event.data?.[5]);
          const marketIdStr = marketId ? BigInt(marketId).toString() : "0";

          logger.log(`  MarketOpened: id=${marketIdStr} opener=${opener} dir=${direction}`);

          await ensureTrader(db, opener);

          await db.insert(markets).values({
            marketId: marketIdStr,
            openerAddress: opener,
            openerDirection: direction,
            pomProfitBps: pomBps,
            stake,
            longPool: direction === "Long" ? stake : stake, // both start equal (vault counter-stakes)
            shortPool: direction === "Long" ? stake : stake,
            joinDeadline,
            state: "OPEN",
            transactionHash: txHash,
          }).onConflictDoNothing();
        }

        // -----------------------------------------------------------------------
        // MarketJoined(market_id, participant, direction, stake)
        // keys[0] = selector, keys[1] = market_id, keys[2] = participant
        // data[0] = direction, data[1] = stake (low), data[2] = stake (high)
        // -----------------------------------------------------------------------
        else if (selector === MARKET_JOINED_SELECTOR) {
          const marketId = event.keys?.[1];
          const participant = feltToAddress(event.keys?.[2]);
          const direction = feltToDirection(event.data?.[0]);
          const stakeAmount = feltToU128(event.data?.[1]);
          const marketIdStr = marketId ? BigInt(marketId).toString() : "0";

          logger.log(`  MarketJoined: id=${marketIdStr} participant=${participant} dir=${direction}`);

          await ensureTrader(db, participant);

          await db.insert(stakes).values({
            marketId: marketIdStr,
            participantAddress: participant,
            direction,
            stakeAmount,
            transactionHash: txHash,
          });
        }

        // -----------------------------------------------------------------------
        // MarketLocked(market_id)
        // keys[0] = selector, keys[1] = market_id
        // -----------------------------------------------------------------------
        else if (selector === MARKET_LOCKED_SELECTOR) {
          const marketId = event.keys?.[1];
          const marketIdStr = marketId ? BigInt(marketId).toString() : "0";

          logger.log(`  MarketLocked: id=${marketIdStr}`);

          await db
            .update(markets)
            .set({ state: "LOCKED" })
            .where(eq(markets.marketId, marketIdStr));
        }

        // -----------------------------------------------------------------------
        // MarketClaimable(market_id, settlement_price)
        // keys[0] = selector, keys[1] = market_id
        // data[0] = settlement_price (low), data[1] = settlement_price (high)
        // -----------------------------------------------------------------------
        else if (selector === MARKET_CLAIMABLE_SELECTOR) {
          const marketId = event.keys?.[1];
          const settlementPrice = feltToU128(event.data?.[0]);
          const marketIdStr = marketId ? BigInt(marketId).toString() : "0";

          logger.log(`  MarketClaimable: id=${marketIdStr} price=${settlementPrice}`);

          await db
            .update(markets)
            .set({
              state: "CLAIMABLE",
              settlementPrice,
              settledAt: new Date(),
            })
            .where(eq(markets.marketId, marketIdStr));
        }

        // -----------------------------------------------------------------------
        // Claimed(market_id, participant, payout)
        // keys[0] = selector, keys[1] = market_id, keys[2] = participant
        // data[0] = payout (low), data[1] = payout (high)
        // -----------------------------------------------------------------------
        else if (selector === CLAIMED_SELECTOR) {
          const marketId = event.keys?.[1];
          const participant = feltToAddress(event.keys?.[2]);
          const payout = feltToU128(event.data?.[0]);
          const marketIdStr = marketId ? BigInt(marketId).toString() : "0";

          logger.log(`  Claimed: id=${marketIdStr} participant=${participant} payout=${payout}`);

          await db
            .update(stakes)
            .set({ claimed: true, payout })
            .where(
              and(
                eq(stakes.marketId, marketIdStr),
                eq(stakes.participantAddress, participant),
              )
            );
        }
      }
    },
  });
}
