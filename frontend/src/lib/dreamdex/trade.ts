/**
 * Write side: BitDrum's one-tap UP / DOWN stake, mapped onto a DreamDEX
 * Event Contract market order (IOC) sized by walking the live book.
 */
import type { Address, Hex } from "viem";
import {
  fromHuman,
  toHuman,
  quoteBinaryStakeOverBook,
  ORDER_TYPE,
  type BinaryStakeQuote,
} from "@somnia-chain/markets-sdk";
import { ensureMarketsLoaded, BITDRUM_BUILDER } from "./client";
import type { UpDownSnapshot } from "./markets";

export type Direction = "UP" | "DOWN";
const sideOf = (d: Direction): "BUY_YES" | "BUY_NO" => (d === "UP" ? "BUY_YES" : "BUY_NO");

export type StakeQuoteView = {
  raw: BinaryStakeQuote;
  direction: Direction;
  /** Shares bought == payout (in collateral) if this side wins. */
  payoutIfWin: number;
  /** Collateral actually escrowed (max loss). */
  maxLoss: number;
  /** Worst price per share paid, in the side's own terms (0..1). */
  limitPrice: number;
  /** payoutIfWin / maxLoss - 1 */
  profitMultiple: number;
};

/** Quote a stake (human collateral units, e.g. 50 USDso) against the live book. */
export async function quoteStake(
  snap: UpDownSnapshot,
  direction: Direction,
  stakeHuman: number,
  slippageBps = 300n,
): Promise<StakeQuoteView | null> {
  const ex = await ensureMarketsLoaded();
  const dec = snap.quoteDecimals;
  const params = await ex.client.getBinaryBookParams(snap.pool);
  const q = quoteBinaryStakeOverBook(
    snap.book,
    sideOf(direction),
    fromHuman(stakeHuman, dec),
    10n ** BigInt(dec),
    { ...params, slippageBps },
  );
  if (!q) return null;
  const payoutIfWin = toHuman(q.quantity, dec);
  const maxLoss = toHuman(q.escrow, dec);
  return {
    raw: q,
    direction,
    payoutIfWin,
    maxLoss,
    limitPrice: toHuman(q.limitPrice, dec),
    profitMultiple: maxLoss > 0 ? payoutIfWin / maxLoss - 1 : 0,
  };
}

/** Execute a quoted stake. Requires attachWallet() to have been called. */
export async function placeStake(snap: UpDownSnapshot, quote: StakeQuoteView) {
  const ex = await ensureMarketsLoaded();
  const res = await ex.trader.placeOrder({
    pool: snap.pool,
    side: quote.raw.side,
    price: quote.raw.yesPrice,
    quantity: quote.raw.quantity,
    orderType: ORDER_TYPE.MARKET,
    ...(BITDRUM_BUILDER ? { builder: BITDRUM_BUILDER } : {}),
  });
  const filled = res.fills.reduce((s, f) => s + f.quantityFilled, 0n);
  return {
    hash: res.hash,
    filledShares: toHuman(filled, snap.quoteDecimals),
    fullyFilled: filled === quote.raw.quantity,
  };
}

/** Redeem winning shares after resolution. SDK derives the winning leg. */
export async function redeemWinnings(marketId: Hex, amountRaw: bigint) {
  const ex = await ensureMarketsLoaded();
  return ex.trader.redeem({ marketId, amount: amountRaw });
}

/** Testnet collateral faucet (TestUSDC / USDso on Shannon). */
export async function claimTestCollateral() {
  const ex = await ensureMarketsLoaded();
  return ex.trader.faucet();
}

export type { Address };
