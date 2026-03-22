import { accountPresets, OnboardStrategy } from "starkzap";
import { GATEWAY_URL, hasSponsoredExecution, sdk } from "./starkzap";

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

function directionToEnum(direction: BitdrumDirection) {
  return direction === "UP" ? "1" : "2";
}

function getExecutionOptions() {
  return hasSponsoredExecution ? { feeMode: "sponsored" as const } : undefined;
}

async function fetchPrivyWallet(accessToken: string | null, path: "starknet" | "sign") {
  const response = await fetch(`${GATEWAY_URL}/${path}`, {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Failed to initialize Starkzap wallet");
  }

  return response.json();
}

export async function getBitdrumWallet(getAccessToken: () => Promise<string | null>) {
  const accessToken = await getAccessToken();

  return sdk.onboard({
    strategy: OnboardStrategy.Privy,
    accountPreset: accountPresets.argentXV050,
    privy: {
      resolve: async () => {
        const data = await fetchPrivyWallet(accessToken, "starknet");
        return {
          walletId: data.wallet.id,
          publicKey: data.wallet.publicKey,
          serverUrl: `${GATEWAY_URL}/sign`,
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        };
      },
    },
    feeMode: hasSponsoredExecution ? "sponsored" : "user_pays",
    deploy: "if_needed",
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
  getAccessToken: () => Promise<string | null>;
  direction: BitdrumDirection;
  stake: string;
  pomProfitBps: number;
}) {
  const onboard = await getBitdrumWallet(params.getAccessToken);
  const wallet = onboard.wallet;
  const amount = toTokenBaseUnits(params.stake);

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
  getAccessToken: () => Promise<string | null>;
  marketId: string;
  direction: BitdrumDirection;
  stake: string;
}) {
  const onboard = await getBitdrumWallet(params.getAccessToken);
  const wallet = onboard.wallet;
  const amount = toTokenBaseUnits(params.stake);

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
  getAccessToken: () => Promise<string | null>;
  marketId: string;
}) {
  const onboard = await getBitdrumWallet(params.getAccessToken);
  const wallet = onboard.wallet;

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
