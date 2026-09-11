/**
 * Read side: find the live BTC/ETH Up/Down Event Contract for a cadence and
 * snapshot everything the BitDrum UI and signal need from it.
 */
import type { Address } from "viem";
import {
  midYesPrice,
  toHuman,
  type BinaryMarket,
  type BinaryOrderBook,
} from "@somnia-chain/markets-sdk";
import { ensureMarketsLoaded, ORACLE_PRICE_DECIMALS } from "./client";

export type Asset = "BTC" | "ETH";
/** DreamDEX series cadences BitDrum exposes (1m and 5m match BitDrum's original timeframes). */
export type CadenceSec = 60 | 300 | 900 | 3600;

export type UpDownSnapshot = {
  market: BinaryMarket;
  pool: Address;
  asset: string;
  /** Seconds until expiry (can be <= 0 once locked). */
  secondsLeft: number;
  windowSec: number;
  /** Opening / reference price in USD, null until the oracle answers. */
  openingPrice: number | null;
  /** Live index price in USD. */
  livePrice: number | null;
  /** Market-implied P(UP) from the YES mid, 0..1; null on an empty book. */
  impliedUp: number | null;
  bestUpAsk: number | null;
  bestDownAsk: number | null;
  spread: number | null;
  book: BinaryOrderBook;
  quoteDecimals: number;
};

const nowSec = () => Math.floor(Date.now() / 1000);

/**
 * The soonest-expiring live Up/Down ("reference"-mode) market for an asset and
 * cadence that is still tradable. Returns null if the series has none open.
 */
export async function getCurrentUpDownMarket(
  asset: Asset,
  intervalSec: CadenceSec,
): Promise<BinaryMarket | null> {
  const ex = await ensureMarketsLoaded();
  const live = await ex.client.listLiveBinaryMarkets({ asset, intervalSec, limit: 10 });
  const t = nowSec();
  const tradable = live.filter(
    (m) =>
      m.mode === "reference" &&
      Number(m.tradingStart) <= t &&
      Number(m.expiry) > t + 3, // leave a few seconds for the tx to land
  );
  return tradable[0] ?? null;
}

function scaleOracle(raw: string | null | undefined, live: number | null): number | null {
  if (raw == null) return null;
  let v = Number(raw) / 10 ** ORACLE_PRICE_DECIMALS;
  // Guard against the documented scale drift: if we're wildly off the live
  // index price, assume an 18-decimal adapter answered instead.
  if (live && (v / live > 1_000 || live / v > 1_000)) v = Number(raw) / 1e18;
  return Number.isFinite(v) ? v : null;
}

export async function snapshotUpDown(market: BinaryMarket): Promise<UpDownSnapshot> {
  const ex = await ensureMarketsLoaded();
  const pool = market.poolAddress as Address;
  const dec = market.quoteDecimals;

  const [book, price, openings] = await Promise.all([
    ex.client.getBinaryOrderBook(pool, { depth: 12, decimals: dec }),
    ex.fetchPrice(market.asset).catch(() => null),
    ex.client.getOpeningPrices([market.marketId]).catch(() => ({}) as Record<string, string | null>),
  ]);

  const livePrice = price?.price ?? null;
  const openingPrice = scaleOracle(openings[market.marketId.toLowerCase()], livePrice);

  const bestYesBid = book.yesBids[0]?.price;
  const bestYesAsk = book.yesAsks[0]?.price;
  const mid = midYesPrice(bestYesBid, bestYesAsk);
  const h = (x: bigint | undefined) => (x === undefined ? null : Number(toHuman(x, dec)));

  const upAsk = h(bestYesAsk);
  const downAsk = h(book.noAsks[0]?.price);

  return {
    market,
    pool,
    asset: market.asset,
    secondsLeft: Number(market.expiry) - nowSec(),
    windowSec: Number(market.expiry) - Number(market.tradingStart),
    openingPrice,
    livePrice,
    impliedUp: h(mid),
    bestUpAsk: upAsk,
    bestDownAsk: downAsk,
    spread: upAsk !== null && bestYesBid !== undefined ? upAsk - Number(toHuman(bestYesBid, dec)) : null,
    book,
    quoteDecimals: dec,
  };
}

/** 1-minute index candles for the realized-volatility estimate and the chart. */
export async function fetchMinuteCandles(asset: Asset, limit = 60) {
  const ex = await ensureMarketsLoaded();
  return ex.fetchPriceOHLCV(asset, "1m", undefined, limit);
}
