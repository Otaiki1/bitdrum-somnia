import type Controller from "@cartridge/controller";
import { CARTRIDGE_PRESET, CARTRIDGE_URL, hasSponsoredExecution, sdk } from "./starkzap";

export const STRK_ADDRESS =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
export const PREDICTION_MARKET_ADDRESS =
  "0x27ca3cdaeba08f02dd9698a1056f50d1e928e61435830ef9bc401b17a5de63a";

export type BitdrumDirection = "UP" | "DOWN";

export type MarketRecord = {
  id: string;
  state: string;
  direction?: string;
  entry_price?: string | null;
  settlement_price?: string | null;
  long_pool?: string;
  short_pool?: string;
  pom_profit_bps?: number | null;
  outcome?: string | null;
  join_deadline?: number | null;
  signal?: {
    direction: string;
    confidence: number;
    rationale: string;
  } | null;
};

export type PositionRecord = {
  market_id: string;
  direction: string;
  stake_amount: string;
  claimed: boolean;
  payout: string | null;
  expected_payout: string;
  net_pnl: string;
  state: string;
  entry_price: string | null;
  settlement_price: string | null;
  outcome: string | null;
  join_deadline: number | null;
  opened_at: string | null;
  settled_at: string | null;
  status: string;
  can_claim: boolean;
};

type StarkZapCartridgeWallet = Awaited<ReturnType<typeof sdk.connectCartridge>>;

export type BitdrumWallet = Omit<StarkZapCartridgeWallet, "getController"> & {
  getController(): Controller;
};

function directionToEnum(direction: BitdrumDirection) {
  return direction === "UP" ? "1" : "2";
}

function getExecutionOptions() {
  return hasSponsoredExecution ? { feeMode: "sponsored" as const } : undefined;
}

export async function connectBitdrumWallet(): Promise<BitdrumWallet> {
  const wallet = await sdk.connectCartridge({
    ...(CARTRIDGE_URL ? { url: CARTRIDGE_URL } : {}),
    ...(CARTRIDGE_PRESET ? { preset: CARTRIDGE_PRESET } : {}),
    ...(getExecutionOptions() ?? {}),
  });

  return wallet as BitdrumWallet;
}

async function ensureWalletReady(wallet: BitdrumWallet) {
  await wallet.ensureReady({
    deploy: "if_needed",
    ...(getExecutionOptions() ?? {}),
  });
}

function toTokenBaseUnits(stake: string) {
  return BigInt(Math.floor(Number(stake) * 1e18)).toString();
}

async function approveSpend(amount: string) {
  return {
    contractAddress: STRK_ADDRESS,
    entrypoint: "approve",
    calldata: [PREDICTION_MARKET_ADDRESS, amount, "0"],
  };
}

export async function openMarket(params: {
  wallet: BitdrumWallet;
  direction: BitdrumDirection;
  stake: string;
  pomProfitBps: number;
}) {
  const wallet = params.wallet;
  const amount = toTokenBaseUnits(params.stake);

  await ensureWalletReady(wallet);

  const tx = await wallet.execute(
    [
      await approveSpend(amount),
      {
        contractAddress: PREDICTION_MARKET_ADDRESS,
        entrypoint: "open_market",
        calldata: [directionToEnum(params.direction), String(params.pomProfitBps), amount],
      },
    ],
    getExecutionOptions(),
  );

  await tx.wait();
  return tx;
}

export async function joinMarket(params: {
  wallet: BitdrumWallet;
  marketId: string;
  direction: BitdrumDirection;
  stake: string;
}) {
  const wallet = params.wallet;
  const amount = toTokenBaseUnits(params.stake);

  await ensureWalletReady(wallet);

  const tx = await wallet.execute(
    [
      await approveSpend(amount),
      {
        contractAddress: PREDICTION_MARKET_ADDRESS,
        entrypoint: "join_market",
        calldata: [params.marketId, directionToEnum(params.direction), amount],
      },
    ],
    getExecutionOptions(),
  );

  await tx.wait();
  return tx;
}

export async function claimMarket(params: {
  wallet: BitdrumWallet;
  marketId: string;
}) {
  const wallet = params.wallet;

  await ensureWalletReady(wallet);

  const tx = await wallet.execute(
    [
      {
        contractAddress: PREDICTION_MARKET_ADDRESS,
        entrypoint: "claim",
        calldata: [params.marketId],
      },
    ],
    getExecutionOptions(),
  );

  await tx.wait();
  return tx;
}

export function formatTokenAmount(rawAmount: string | null | undefined, decimals = 18, precision = 4) {
  const value = BigInt(rawAmount || "0");
  const isNegative = value < BigInt(0);
  const absoluteValue = isNegative ? value * BigInt(-1) : value;
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = absoluteValue / divisor;
  const fraction = absoluteValue % divisor;
  const paddedFraction = fraction.toString().padStart(decimals, "0").slice(0, precision);
  const formatted = `${whole.toString()}.${paddedFraction}`.replace(/\.$/, "");
  return isNegative ? `-${formatted}` : formatted;
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
