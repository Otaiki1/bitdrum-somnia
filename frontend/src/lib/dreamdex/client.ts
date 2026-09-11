/**
 * DreamDEX (Somnia Markets) exchange singleton for BitDrum.
 *
 * One read-only exchange is created lazily; when the user connects a wallet,
 * call `attachWallet(walletClient, address)` and the same instance becomes a
 * signer. Testnet (Shannon, 50312) only — this is the hackathon target.
 *
 * Note: we deliberately never call `loadMarkets()`. Every read/write BitDrum
 * needs lives on `ex.client` / `ex.trader` (pool- and marketId-addressed), and
 * the symbol registry load costs ~15s against the testnet indexer.
 */
import type { Address, Chain, WalletClient } from "viem";
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

/** DreamDEX testnet collateral (TestUSDC, 6dp). */
export const COLLATERAL_ADDRESS = SOMNIA_TESTNET_ADDRESSES.collateral as Address;
export const COLLATERAL_SYMBOL = "USDC";
export const COLLATERAL_DECIMALS = 6;

/**
 * Oracle answers (opening / resolution prices / fixed strikes) carry no decimals
 * on the indexer. The SDK documents 2 as the empirical scale for OracleHub
 * answers, and we verified it against the live index price on Shannon
 * (raw 7921119 → $79,211.19). markets.ts still sanity-checks against live.
 */
export const ORACLE_PRICE_DECIMALS = 2;

/** Optional: BitDrum's builder address, for routing-fee attribution. */
export const BITDRUM_BUILDER = process.env.NEXT_PUBLIC_BITDRUM_BUILDER as
  | `0x${string}`
  | undefined;

let exchange: SomniaMarkets | null = null;

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

/** Turn the read-only exchange into a signer bound to the connected wallet. */
export function attachWallet(walletClient: WalletClient, address: Address): SomniaMarkets {
  const ex = getExchange();
  ex.setSigner({ walletClient, account: address });
  return ex;
}

/** Explorer link for a Shannon tx hash. */
export function explorerTxUrl(hash: string) {
  return `https://shannon-explorer.somnia.network/tx/${hash}`;
}
