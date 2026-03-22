import { defineIndexer } from "apibara/indexer";
import { useLogger } from "apibara/plugins";
import type { ApibaraRuntimeConfig } from "apibara/types";
import { StarknetStream } from "@apibara/starknet";
import { hash, Contract, RpcProvider } from "starknet";
import { drizzle, drizzleStorage, useDrizzleStorage } from "@apibara/plugin-drizzle";
import { and, eq } from "drizzle-orm";
import { aiSignals, markets, stakes, traders } from "../lib/schema.js";

const db = drizzle({
  type: "node-postgres",
  schema: { markets, stakes, traders, aiSignals },
});

const chainProvider = new RpcProvider({
  nodeUrl: process.env.STARKNET_RPC_URL || "https://starknet-sepolia.public.blastapi.io",
});

const marketContractCache = new Map<string, Contract>();

const MARKET_OPENED_SELECTOR = hash.getSelectorFromName("MarketOpened");
const MARKET_JOINED_SELECTOR = hash.getSelectorFromName("MarketJoined");
const MARKET_LOCKED_SELECTOR = hash.getSelectorFromName("MarketLocked");
const MARKET_CLAIMABLE_SELECTOR = hash.getSelectorFromName("MarketClaimable");
const CLAIMED_SELECTOR = hash.getSelectorFromName("Claimed");

const VAULT_ADDRESS = (process.env.VAULT_ADDRESS || "").toLowerCase();

function feltToAddress(felt: string | undefined): string {
  if (!felt) return "0x0";
  return "0x" + BigInt(felt).toString(16).padStart(64, "0");
}

function feltToU64(felt: string | undefined): number {
  if (!felt) return 0;
  return Number(BigInt(felt));
}

function feltPairToU128(low: string | undefined, high: string | undefined): string {
  const lowPart = BigInt(low ?? "0");
  const highPart = BigInt(high ?? "0");
  return (lowPart + (highPart << 64n)).toString();
}

function feltToDirection(felt: string | undefined): "Long" | "Short" | "Placeholder" {
  const val = Number(BigInt(felt ?? "0"));
  if (val === 1) return "Long";
  if (val === 2) return "Short";
  return "Placeholder";
}

function normalizeDirection(direction: string | null | undefined): "Long" | "Short" | "Neutral" {
  const normalized = (direction || "").toUpperCase();

  if (["LONG", "UP", "BULLISH"].includes(normalized)) {
    return "Long";
  }

  if (["SHORT", "DOWN", "BEARISH"].includes(normalized)) {
    return "Short";
  }

  return "Neutral";
}

function normalizeMarketState(state: any): string {
  if (typeof state === "string") {
    return state.toUpperCase();
  }

  if (typeof state?.activeVariant === "function") {
    return state.activeVariant().toUpperCase();
  }

  if (state?.variant && typeof state.variant === "object") {
    const activeEntry = Object.entries(state.variant).find(([, value]) => value !== undefined);
    if (activeEntry) {
      return activeEntry[0].toUpperCase();
    }
  }

  const numericState = Number(state ?? 0);
  if (numericState === 1) return "OPEN";
  if (numericState === 2) return "LOCKED";
  if (numericState === 4) return "CLAIMABLE";
  if (numericState === 5) return "CLOSED";
  return "UNKNOWN";
}

function bigintAbs(value: bigint) {
  return value < 0n ? -value : value;
}

function calculateConsistencyScore(results: number[]) {
  if (results.length <= 1) {
    return 1;
  }

  const rollingRates: number[] = [];

  for (let index = 0; index < results.length; index += 1) {
    const window = results.slice(Math.max(0, index - 6), index + 1);
    const average = window.reduce((sum, value) => sum + value, 0) / window.length;
    rollingRates.push(average);
  }

  const mean = rollingRates.reduce((sum, value) => sum + value, 0) / rollingRates.length;
  const variance =
    rollingRates.reduce((sum, value) => sum + (value - mean) ** 2, 0) / rollingRates.length;

  return Math.max(0, Math.min(1, 1 - Math.sqrt(variance)));
}

function determineTier(
  rank: number,
  totalRanked: number,
  settledMarkets: number,
) {
  if (totalRanked === 0) {
    return "SCOUT";
  }

  const oracleCutoff = Math.max(1, Math.ceil(totalRanked * 0.01));
  const prophetCutoff = Math.max(1, Math.ceil(totalRanked * 0.05));
  const traderCutoff = Math.max(1, Math.ceil(totalRanked * 0.2));

  if (settledMarkets >= 50 && rank <= oracleCutoff) {
    return "ORACLE";
  }

  if (settledMarkets >= 30 && rank <= prophetCutoff) {
    return "PROPHET";
  }

  if (settledMarkets >= 10 && rank <= traderCutoff) {
    return "TRADER";
  }

  return "SCOUT";
}

async function getPredictionMarketContract(address: string) {
  let contract = marketContractCache.get(address);

  if (!contract) {
    const contractClass = await chainProvider.getClassAt(address);
    contract = new Contract({
      abi: contractClass.abi,
      address,
      providerOrAccount: chainProvider,
    });
    marketContractCache.set(address, contract);
  }

  return contract;
}

async function ensureTrader(dbClient: ReturnType<typeof useDrizzleStorage>["db"], address: string) {
  await dbClient.insert(traders).values({ address }).onConflictDoNothing();
}

async function syncMarketFromChain(
  dbClient: ReturnType<typeof useDrizzleStorage>["db"],
  predictionMarketAddress: string,
  marketId: string,
) {
  const contract = await getPredictionMarketContract(predictionMarketAddress);
  const market: any = await contract.get_market(marketId);

  const entryPrice = feltPairToU128(market.entry_price?.low, market.entry_price?.high);
  const settlementPrice = feltPairToU128(
    market.settlement_price?.low,
    market.settlement_price?.high,
  );
  const longPool = feltPairToU128(market.long_pool?.low, market.long_pool?.high);
  const shortPool = feltPairToU128(market.short_pool?.low, market.short_pool?.high);
  const state = normalizeMarketState(market.state);

  let outcome: string | null = null;
  if (settlementPrice !== "0" && entryPrice !== "0") {
    const settlement = BigInt(settlementPrice);
    const entry = BigInt(entryPrice);
    outcome = settlement > entry ? "Long" : settlement < entry ? "Short" : "Draw";
  }

  await dbClient
    .update(markets)
    .set({
      entryPrice,
      settlementPrice: settlementPrice === "0" ? null : settlementPrice,
      longPool,
      shortPool,
      state,
      outcome,
      settledAt: outcome ? new Date() : undefined,
    })
    .where(eq(markets.marketId, marketId));
}

async function updateSignalAccuracy(
  dbClient: ReturnType<typeof useDrizzleStorage>["db"],
  marketId: string,
  outcome: string | null,
) {
  if (!outcome) {
    return;
  }

  const signals = await dbClient.select().from(aiSignals).where(eq(aiSignals.marketId, marketId));

  for (const signal of signals) {
    const normalized = normalizeDirection(signal.direction);
    const isAccurate =
      outcome === "Draw" ? normalized === "Neutral" : normalized === outcome;

    await dbClient
      .update(aiSignals)
      .set({ isAccurate })
      .where(eq(aiSignals.id, signal.id));
  }
}

async function recomputeTraderProfiles(dbClient: ReturnType<typeof useDrizzleStorage>["db"]) {
  const allStakes = await dbClient.select().from(stakes);
  const allMarkets = await dbClient.select().from(markets);

  const marketById = new Map(allMarkets.map((market) => [market.marketId, market]));

  type Aggregate = {
    address: string;
    marketsEntered: number;
    wins: number;
    losses: number;
    draws: number;
    totalStaked: bigint;
    totalClaimed: bigint;
    lastActive: Date | null;
    settledResults: number[];
  };

  const aggregates = new Map<string, Aggregate>();

  const getAggregate = (address: string) => {
    const normalizedAddress = address.toLowerCase();
    let aggregate = aggregates.get(normalizedAddress);

    if (!aggregate) {
      aggregate = {
        address,
        marketsEntered: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        totalStaked: 0n,
        totalClaimed: 0n,
        lastActive: null,
        settledResults: [],
      };
      aggregates.set(normalizedAddress, aggregate);
    }

    return aggregate;
  };

  for (const stake of allStakes) {
    if (VAULT_ADDRESS && stake.participantAddress.toLowerCase() === VAULT_ADDRESS) {
      continue;
    }

    const aggregate = getAggregate(stake.participantAddress);
    const market = marketById.get(stake.marketId);
    const stakeAmount = BigInt(stake.stakeAmount);

    aggregate.marketsEntered += 1;
    aggregate.totalStaked += stakeAmount;

    const candidateLastActive = market?.settledAt || stake.timestamp || null;
    if (
      candidateLastActive &&
      (!aggregate.lastActive || candidateLastActive > aggregate.lastActive)
    ) {
      aggregate.lastActive = candidateLastActive;
    }

    if (!market?.outcome) {
      continue;
    }

    if (market.outcome === "Draw") {
      aggregate.draws += 1;
      aggregate.totalClaimed += stakeAmount;
      aggregate.settledResults.push(0.5);
      continue;
    }

    const profit =
      (stakeAmount * BigInt(market.pomProfitBps ?? 0)) / BigInt(10_000);
    const entitledPayout =
      stake.direction === market.outcome ? stakeAmount + profit : 0n;

    aggregate.totalClaimed += entitledPayout;

    if (stake.direction === market.outcome) {
      aggregate.wins += 1;
      aggregate.settledResults.push(1);
    } else {
      aggregate.losses += 1;
      aggregate.settledResults.push(0);
    }
  }

  const ranked = Array.from(aggregates.values()).map((aggregate) => {
    const resolvedTrades = aggregate.wins + aggregate.losses + aggregate.draws;
    const decisiveTrades = aggregate.wins + aggregate.losses;
    const winRate = decisiveTrades > 0 ? aggregate.wins / decisiveTrades : 0;
    const netPnl = aggregate.totalClaimed - aggregate.totalStaked;
    const consistencyScore = calculateConsistencyScore(aggregate.settledResults);

    return {
      ...aggregate,
      resolvedTrades,
      winRate,
      netPnl,
      consistencyScore,
      compositeScore: 0,
    };
  });

  const maxPositivePnl = ranked.reduce((max, aggregate) => {
    return aggregate.netPnl > max ? aggregate.netPnl : max;
  }, 0n);

  for (const aggregate of ranked) {
    const normalizedNetPnl =
      maxPositivePnl > 0n && aggregate.netPnl > 0n
        ? Number(aggregate.netPnl) / Number(maxPositivePnl)
        : 0;

    aggregate.compositeScore =
      aggregate.winRate * 0.4 + normalizedNetPnl * 0.4 + aggregate.consistencyScore * 0.2;
  }

  ranked.sort((left, right) => right.compositeScore - left.compositeScore);

  for (const [index, aggregate] of ranked.entries()) {
    const tier = determineTier(index + 1, ranked.length, aggregate.resolvedTrades);

    await dbClient
      .insert(traders)
      .values({
        address: aggregate.address,
        tier,
        marketsEntered: aggregate.marketsEntered,
        wins: aggregate.wins,
        losses: aggregate.losses,
        draws: aggregate.draws,
        totalStaked: aggregate.totalStaked.toString(),
        totalClaimed: aggregate.totalClaimed.toString(),
        compositeScore: aggregate.compositeScore.toFixed(6),
        lastActive: aggregate.lastActive,
      })
      .onConflictDoUpdate({
        target: traders.address,
        set: {
          tier,
          marketsEntered: aggregate.marketsEntered,
          wins: aggregate.wins,
          losses: aggregate.losses,
          draws: aggregate.draws,
          totalStaked: aggregate.totalStaked.toString(),
          totalClaimed: aggregate.totalClaimed.toString(),
          compositeScore: aggregate.compositeScore.toFixed(6),
          lastActive: aggregate.lastActive,
        },
      });
  }
}

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
    filter: {
      events: [{ address: predictionMarketAddress as `0x${string}` }],
    },
    plugins: [drizzleStorage({ db })],

    async transform({ block }) {
      const logger = useLogger();
      const { db: dbClient } = useDrizzleStorage();
      const { events, header } = block;

      if (!events || events.length === 0) {
        return;
      }

      logger.log(`Block ${header?.blockNumber} — processing ${events.length} event(s)`);

      for (const event of events) {
        const selector = event.keys?.[0];
        const txHash = event.transactionHash ?? "0x0";

        if (selector === MARKET_OPENED_SELECTOR) {
          const marketId = event.keys?.[1];
          const opener = feltToAddress(event.data?.[0]);
          const direction = feltToDirection(event.data?.[1]);
          const pomBps = feltToU64(event.data?.[2]);
          const stake = feltPairToU128(event.data?.[3], event.data?.[4]);
          const joinDeadline = feltToU64(event.data?.[5]);
          const marketIdStr = marketId ? BigInt(marketId).toString() : "0";

          logger.log(`  MarketOpened: id=${marketIdStr} opener=${opener} dir=${direction}`);

          await ensureTrader(dbClient, opener);

          await dbClient
            .insert(markets)
            .values({
              marketId: marketIdStr,
              openerAddress: opener,
              openerDirection: direction,
              pomProfitBps: pomBps,
              stake,
              longPool: stake,
              shortPool: stake,
              joinDeadline,
              state: "OPEN",
              transactionHash: txHash,
            })
            .onConflictDoNothing();

          await dbClient.insert(stakes).values({
            marketId: marketIdStr,
            participantAddress: opener,
            direction,
            stakeAmount: stake,
            transactionHash: txHash,
          });
        } else if (selector === MARKET_JOINED_SELECTOR) {
          const marketId = event.keys?.[1];
          const participant = feltToAddress(event.keys?.[2]);
          const direction = feltToDirection(event.data?.[0]);
          const stakeAmount = feltPairToU128(event.data?.[1], event.data?.[2]);
          const marketIdStr = marketId ? BigInt(marketId).toString() : "0";

          logger.log(`  MarketJoined: id=${marketIdStr} participant=${participant} dir=${direction}`);

          await ensureTrader(dbClient, participant);

          await dbClient.insert(stakes).values({
            marketId: marketIdStr,
            participantAddress: participant,
            direction,
            stakeAmount,
            transactionHash: txHash,
          });

          const market = await dbClient
            .select()
            .from(markets)
            .where(eq(markets.marketId, marketIdStr))
            .limit(1);

          if (market[0]) {
            const nextLongPool =
              BigInt(market[0].longPool) + (direction === "Long" ? BigInt(stakeAmount) : 0n);
            const nextShortPool =
              BigInt(market[0].shortPool) + (direction === "Short" ? BigInt(stakeAmount) : 0n);

            await dbClient
              .update(markets)
              .set({
                longPool: nextLongPool.toString(),
                shortPool: nextShortPool.toString(),
              })
              .where(eq(markets.marketId, marketIdStr));
          }
        } else if (selector === MARKET_LOCKED_SELECTOR) {
          const marketId = event.keys?.[1];
          const marketIdStr = marketId ? BigInt(marketId).toString() : "0";

          logger.log(`  MarketLocked: id=${marketIdStr}`);

          await syncMarketFromChain(dbClient, predictionMarketAddress, marketIdStr);
        } else if (selector === MARKET_CLAIMABLE_SELECTOR) {
          const marketId = event.keys?.[1];
          const marketIdStr = marketId ? BigInt(marketId).toString() : "0";

          logger.log(`  MarketClaimable: id=${marketIdStr}`);

          await syncMarketFromChain(dbClient, predictionMarketAddress, marketIdStr);

          const [market] = await dbClient
            .select()
            .from(markets)
            .where(eq(markets.marketId, marketIdStr))
            .limit(1);

          await updateSignalAccuracy(dbClient, marketIdStr, market?.outcome ?? null);
          await recomputeTraderProfiles(dbClient);
        } else if (selector === CLAIMED_SELECTOR) {
          const marketId = event.keys?.[1];
          const participant = feltToAddress(event.keys?.[2]);
          const payout = feltPairToU128(event.data?.[0], event.data?.[1]);
          const marketIdStr = marketId ? BigInt(marketId).toString() : "0";

          logger.log(`  Claimed: id=${marketIdStr} participant=${participant} payout=${payout}`);

          await dbClient
            .update(stakes)
            .set({ claimed: true, payout })
            .where(
              and(
                eq(stakes.marketId, marketIdStr),
                eq(stakes.participantAddress, participant),
              ),
            );
        }
      }
    },
  });
}
