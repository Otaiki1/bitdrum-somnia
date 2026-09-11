/**
 * DreamDEX (Somnia Markets) exchange singleton for BitDrum.
 *
 * One read-only exchange is created lazily; when the user connects a wallet,
 * call `attachWallet(walletClient)` and the same instance becomes a signer.
 * Testnet (Shannon, 50312) only — this is the hackathon target.
 */
import type { Chain, WalletClient } from "viem";
import {
  SomniaMarkets,
  SOMNIA_TESTNET_ADDRESSES,
  SOMNIA_TESTNET_PRICE_FEED,
} from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";

export const DREAMDEX_TESTNET = {
  indexerUrl: "https://dev.smk.somnia.host/v1/graphql",
  wsRpcUrl: "wss://api.infra.testnet.somnia.network/ws",
  // The SDK inlines its own viem Chain typing; the runtime object is a plain viem chain.
  chain: somniaShannon as unknown as Chain,
  addresses: SOMNIA_TESTNET_ADDRESSES,
  priceFeed: SOMNIA_TESTNET_PRICE_FEED,
} as const;

/**
 * Oracle answers (opening / resolution prices) carry no decimals on the indexer.
 * The SDK documents 2 as the empirical scale for OracleHub answers. We still
 * sanity-check against the live index price in markets.ts.
 */
export const ORACLE_PRICE_DECIMALS = 2;

/** Optional: BitDrum's builder address, for routing-fee attribution later. */
export const BITDRUM_BUILDER = process.env.NEXT_PUBLIC_BITDRUM_BUILDER as
  | `0x${string}`
  | undefined;

let exchange: SomniaMarkets | null = null;
let loaded: Promise<unknown> | null = null;

export function getExchange(): SomniaMarkets {
  if (!exchange) {
    exchange = new SomniaMarkets({
      indexerUrl: DREAMDEX_TESTNET.indexerUrl,
      chain: DREAMDEX_TESTNET.chain,
      wsRpcUrl: DREAMDEX_TESTNET.wsRpcUrl,
      addresses: DREAMDEX_TESTNET.addresses,
      priceFeed: DREAMDEX_TESTNET.priceFeed,
    });
  }
  return exchange;
}

/** Loads the symbol registry once; safe to await from many components. */
export async function ensureMarketsLoaded(): Promise<SomniaMarkets> {
  const ex = getExchange();
  if (!loaded) loaded = ex.loadMarkets();
  await loaded;
  return ex;
}

/** Turn the read-only exchange into a signer bound to the connected wallet. */
export function attachWallet(walletClient: WalletClient): SomniaMarkets {
  const ex = getExchange();
  ex.setSigner({ walletClient });
  return ex;
}
