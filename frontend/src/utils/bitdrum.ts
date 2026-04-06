import { BrowserProvider, Contract, parseUnits } from "../../vendor/ethers/lib.esm/index.js";
import {
  ACTIVE_SOMNIA_NETWORK,
  PREDICTION_MARKET_ADDRESS,
  SOMNIA_EXPLORER_BASE_URL,
  WBTC_ADDRESS,
} from "./somnia";

declare global {
  interface Window {
    ethereum?: {
      request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
    };
  }
}

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
];

const MARKET_ABI = [
  "function openMarket(uint8 direction, uint256 duration, uint256 stakeAmount, tuple(uint128 price, uint128 timestamp) strikeData) returns (uint256)",
  "function joinMarket(uint256 marketId, uint8 direction, uint256 stakeAmount)",
  "function claimPayout(uint256 marketId)",
];

export type BitdrumDirection = "UP" | "DOWN";
export type TradeExecutionStatus = "submitted" | "confirmed" | "failed";

export type TradeExecutionRecord = {
  id: string;
  kind: "OPEN" | "JOIN" | "CLAIM";
  marketId: string | null;
  direction: BitdrumDirection;
  stake: string;
  timeframeSeconds: number;
  entryPrice: number | null;
  txHash: string;
  explorerUrl: string;
  status: TradeExecutionStatus;
  submittedAt: string;
  error: string | null;
};

export type MarketRecord = {
  id: string;
  state: string;
  direction?: string;
  entry_price?: string | null;
  settlement_price?: string | null;
  up_pool?: string;
  down_pool?: string;
  long_pool?: string;
  short_pool?: string;
  pom_profit_bps?: number | null;
  outcome?: string | null;
  join_deadline?: number | null;
  opened_at?: string | null;
  duration_seconds?: number | null;
  settlement_deadline?: number | null;
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
  transaction_hash?: string | null;
  expected_payout: string;
  net_pnl: string;
  state: string;
  entry_price: string | null;
  settlement_price: string | null;
  outcome: string | null;
  duration_seconds: number | null;
  join_deadline: number | null;
  settlement_deadline: number | null;
  opened_at: string | null;
  settled_at: string | null;
  status: string;
  can_claim: boolean;
};

export type BitdrumWallet = {
  address: string;
  provider: BrowserProvider;
  label: string;
  disconnect(): Promise<void>;
  openProfile(): Promise<void>;
};

type BitdrumTx = {
  hash: string;
  explorerUrl: string;
  wait(): Promise<unknown>;
};

function directionToEnum(direction: BitdrumDirection) {
  return direction === "UP" ? 0 : 1;
}

async function ensureSomniaChain(provider: BrowserProvider) {
  const network = await provider.getNetwork();

  if (Number(network.chainId) === ACTIVE_SOMNIA_NETWORK.chainId) {
    return;
  }

  try {
    await provider.send("wallet_switchEthereumChain", [
      { chainId: ACTIVE_SOMNIA_NETWORK.chainIdHex },
    ]);
  } catch {
    await provider.send("wallet_addEthereumChain", [ACTIVE_SOMNIA_NETWORK]);
  }
}

function assertWalletSupport() {
  if (!window.ethereum) {
    throw new Error("No EVM wallet detected. Install MetaMask or another Somnia-compatible wallet.");
  }
}

function buildExplorerUrl(txHash: string) {
  return `${SOMNIA_EXPLORER_BASE_URL}/tx/${txHash}`;
}

async function approveWbtc(wallet: BitdrumWallet, amount: bigint) {
  const signer = await wallet.provider.getSigner();
  const wbtc = new Contract(WBTC_ADDRESS, ERC20_ABI, signer);
  const approvalTx = await wbtc.approve(PREDICTION_MARKET_ADDRESS, amount);
  await approvalTx.wait();
}

export async function connectBitdrumWallet(): Promise<BitdrumWallet> {
  assertWalletSupport();

  const provider = new BrowserProvider(window.ethereum!);
  await ensureSomniaChain(provider);

  const accounts = (await provider.send("eth_requestAccounts", [])) as string[];
  const address = accounts[0];

  if (!address) {
    throw new Error("Wallet connection did not return an account.");
  }

  return {
    address,
    provider,
    label: "Injected EVM Wallet",
    async disconnect() {
      return;
    },
    async openProfile() {
      window.open(`${SOMNIA_EXPLORER_BASE_URL}/address/${address}`, "_blank", "noopener,noreferrer");
    },
  };
}

export async function openMarket(params: {
  wallet: BitdrumWallet;
  direction: BitdrumDirection;
  stake: string;
  durationSeconds: number;
  currentPrice: number;
}): Promise<BitdrumTx> {
  const signer = await params.wallet.provider.getSigner();
  const market = new Contract(PREDICTION_MARKET_ADDRESS, MARKET_ABI, signer);
  const amount = parseUnits(params.stake, 8);
  const strikePrice = BigInt(Math.round(params.currentPrice * 10 ** 8));
  const timestamp = Math.floor(Date.now() / 1000);

  await approveWbtc(params.wallet, amount);

  const tx = await market.openMarket(directionToEnum(params.direction), params.durationSeconds, amount, {
    price: strikePrice,
    timestamp,
  });

  return {
    hash: tx.hash,
    explorerUrl: buildExplorerUrl(tx.hash),
    wait: () => tx.wait(),
  };
}

export async function joinMarket(params: {
  wallet: BitdrumWallet;
  marketId: string;
  direction: BitdrumDirection;
  stake: string;
}): Promise<BitdrumTx> {
  const signer = await params.wallet.provider.getSigner();
  const market = new Contract(PREDICTION_MARKET_ADDRESS, MARKET_ABI, signer);
  const amount = parseUnits(params.stake, 8);

  await approveWbtc(params.wallet, amount);

  const tx = await market.joinMarket(params.marketId, directionToEnum(params.direction), amount);

  return {
    hash: tx.hash,
    explorerUrl: buildExplorerUrl(tx.hash),
    wait: () => tx.wait(),
  };
}

export async function claimMarket(params: {
  wallet: BitdrumWallet;
  marketId: string;
}): Promise<BitdrumTx> {
  const signer = await params.wallet.provider.getSigner();
  const market = new Contract(PREDICTION_MARKET_ADDRESS, MARKET_ABI, signer);
  const tx = await market.claimPayout(params.marketId);

  return {
    hash: tx.hash,
    explorerUrl: buildExplorerUrl(tx.hash),
    wait: () => tx.wait(),
  };
}

export function formatTokenAmount(rawAmount: string | null | undefined, decimals = 8, precision = 4) {
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

export function formatTimeframe(durationSeconds: number | null | undefined) {
  if (durationSeconds === 30) return "30s";
  if (durationSeconds === 60) return "1m";
  if (durationSeconds === 300) return "5m";
  if (!durationSeconds) return "--";
  return `${durationSeconds}s`;
}

export function formatOraclePrice(rawAmount: string | null | undefined, decimals = 8) {
  const numeric = Number(rawAmount || "0");
  if (!Number.isFinite(numeric) || numeric === 0) {
    return null;
  }

  return numeric / 10 ** decimals;
}
