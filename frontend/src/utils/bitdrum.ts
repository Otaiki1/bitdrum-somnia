import {
  createPublicClient,
  createWalletClient,
  custom,
  formatUnits,
  http,
  parseUnits,
  defineChain,
  type WalletClient,
  type PublicClient,
} from 'viem';
import {
  ACTIVE_SOMNIA_NETWORK,
  PREDICTION_MARKET_ADDRESS,
  SOMNIA_EXPLORER_BASE_URL,
  WSTT_ADDRESS,
} from './somnia';

declare global {
  interface Window {
    ethereum?: {
      request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
      on?(event: string, handler: (...args: unknown[]) => void): void;
    };
  }
}

/** STT / WSTT use 18 decimals — same as the native Somnia token. */
export const STT_DECIMALS = 18;

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

/** WrappedSTT deposit() — send native STT, receive WSTT 1:1. */
const WSTT_ABI = [
  ...ERC20_ABI,
  {
    name: 'deposit',
    type: 'function',
    inputs: [],
    outputs: [],
    stateMutability: 'payable',
  },
] as const;

const MARKET_ABI = [
  {
    name: 'openMarket',
    type: 'function',
    inputs: [
      { name: 'direction', type: 'uint8' },
      { name: 'duration', type: 'uint256' },
      { name: 'stakeAmount', type: 'uint256' },
      {
        name: 'strikeData',
        type: 'tuple',
        components: [
          { name: 'price', type: 'uint128' },
          { name: 'timestamp', type: 'uint128' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    name: 'joinMarket',
    type: 'function',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'direction', type: 'uint8' },
      { name: 'stakeAmount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    name: 'claimPayout',
    type: 'function',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

export type BitdrumDirection = 'UP' | 'DOWN';
export type TradeExecutionStatus = 'submitted' | 'confirmed' | 'failed';

export type TradeExecutionRecord = {
  id: string;
  kind: 'OPEN' | 'JOIN' | 'CLAIM';
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
  address: `0x${string}`;
  walletClient: WalletClient;
  publicClient: PublicClient;
  label: string;
  disconnect(): Promise<void>;
  openProfile(): Promise<void>;
};

type BitdrumTx = {
  hash: string;
  explorerUrl: string;
  wait(): Promise<unknown>;
};

function directionToEnum(direction: BitdrumDirection): number {
  return direction === 'UP' ? 0 : 1;
}

function buildSomniaChain() {
  return defineChain({
    id: ACTIVE_SOMNIA_NETWORK.chainId,
    name: ACTIVE_SOMNIA_NETWORK.chainName,
    nativeCurrency: ACTIVE_SOMNIA_NETWORK.nativeCurrency,
    rpcUrls: {
      default: { http: ACTIVE_SOMNIA_NETWORK.rpcUrls as string[] },
      public: { http: ACTIVE_SOMNIA_NETWORK.rpcUrls as string[] },
    },
    blockExplorers: {
      default: { name: 'Somnia Explorer', url: ACTIVE_SOMNIA_NETWORK.blockExplorerUrls[0] },
    },
  });
}

async function ensureSomniaChain(walletClient: WalletClient) {
  const chainId = await walletClient.getChainId();
  if (chainId === ACTIVE_SOMNIA_NETWORK.chainId) return;

  try {
    await walletClient.switchChain({ id: ACTIVE_SOMNIA_NETWORK.chainId });
  } catch {
    await (window.ethereum as any).request({
      method: 'wallet_addEthereumChain',
      params: [ACTIVE_SOMNIA_NETWORK],
    });
  }
}

function assertWalletSupport() {
  if (!window.ethereum) {
    throw new Error('No EVM wallet detected. Install MetaMask or another Somnia-compatible wallet.');
  }
}

function buildExplorerUrl(txHash: string) {
  return `${SOMNIA_EXPLORER_BASE_URL}/tx/${txHash}`;
}

/**
 * Auto-wrap native STT → WSTT if the wallet doesn't have enough WSTT.
 * This means users never need to manually wrap — they just hold STT.
 */
async function ensureWstt(wallet: BitdrumWallet, amount: bigint) {
  const wsttBalance = await wallet.publicClient.readContract({
    address: WSTT_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [wallet.address],
  });

  if (wsttBalance >= amount) return;

  const needed = amount - wsttBalance;
  const sttBalance = await wallet.publicClient.getBalance({ address: wallet.address });

  if (sttBalance < needed) {
    throw new Error(
      `Insufficient STT. Need ${formatUnits(needed, STT_DECIMALS)} STT to wrap but only have ${formatUnits(sttBalance, STT_DECIMALS)} STT.`,
    );
  }

  const hash = await wallet.walletClient.writeContract({
    address: WSTT_ADDRESS as `0x${string}`,
    abi: WSTT_ABI,
    functionName: 'deposit',
    value: needed,
    account: wallet.address,
    chain: buildSomniaChain(),
  });
  await wallet.publicClient.waitForTransactionReceipt({ hash });
}

async function approveWstt(wallet: BitdrumWallet, amount: bigint) {
  const hash = await wallet.walletClient.writeContract({
    address: WSTT_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [PREDICTION_MARKET_ADDRESS as `0x${string}`, amount],
    account: wallet.address,
    chain: buildSomniaChain(),
  });
  await wallet.publicClient.waitForTransactionReceipt({ hash });
}

export async function connectBitdrumWallet(): Promise<BitdrumWallet> {
  assertWalletSupport();

  const chain = buildSomniaChain();

  const walletClient = createWalletClient({
    chain,
    transport: custom(window.ethereum!),
  });

  const publicClient = createPublicClient({
    chain,
    transport: http(ACTIVE_SOMNIA_NETWORK.rpcUrls[0]),
  });

  await ensureSomniaChain(walletClient);

  const [address] = await walletClient.requestAddresses();

  if (!address) {
    throw new Error('Wallet connection did not return an account.');
  }

  return {
    address,
    walletClient,
    publicClient,
    label: 'Injected EVM Wallet',
    async disconnect() {
      return;
    },
    async openProfile() {
      window.open(`${SOMNIA_EXPLORER_BASE_URL}/address/${address}`, '_blank', 'noopener,noreferrer');
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
  const amount = parseUnits(params.stake, STT_DECIMALS);
  const strikePrice = BigInt(Math.round(params.currentPrice * 10 ** 8));
  const timestamp = BigInt(Math.floor(Date.now() / 1000));
  const chain = buildSomniaChain();

  await ensureWstt(params.wallet, amount);
  await approveWstt(params.wallet, amount);

  const hash = await params.wallet.walletClient.writeContract({
    address: PREDICTION_MARKET_ADDRESS as `0x${string}`,
    abi: MARKET_ABI,
    functionName: 'openMarket',
    args: [
      directionToEnum(params.direction),
      BigInt(params.durationSeconds),
      amount,
      { price: strikePrice, timestamp },
    ],
    account: params.wallet.address,
    chain,
  });

  return {
    hash,
    explorerUrl: buildExplorerUrl(hash),
    wait: () => params.wallet.publicClient.waitForTransactionReceipt({ hash }),
  };
}

export async function joinMarket(params: {
  wallet: BitdrumWallet;
  marketId: string;
  direction: BitdrumDirection;
  stake: string;
}): Promise<BitdrumTx> {
  const amount = parseUnits(params.stake, STT_DECIMALS);
  const chain = buildSomniaChain();

  await ensureWstt(params.wallet, amount);
  await approveWstt(params.wallet, amount);

  const hash = await params.wallet.walletClient.writeContract({
    address: PREDICTION_MARKET_ADDRESS as `0x${string}`,
    abi: MARKET_ABI,
    functionName: 'joinMarket',
    args: [BigInt(params.marketId), directionToEnum(params.direction), amount],
    account: params.wallet.address,
    chain,
  });

  return {
    hash,
    explorerUrl: buildExplorerUrl(hash),
    wait: () => params.wallet.publicClient.waitForTransactionReceipt({ hash }),
  };
}

export async function claimMarket(params: {
  wallet: BitdrumWallet;
  marketId: string;
}): Promise<BitdrumTx> {
  const chain = buildSomniaChain();

  const hash = await params.wallet.walletClient.writeContract({
    address: PREDICTION_MARKET_ADDRESS as `0x${string}`,
    abi: MARKET_ABI,
    functionName: 'claimPayout',
    args: [BigInt(params.marketId)],
    account: params.wallet.address,
    chain,
  });

  return {
    hash,
    explorerUrl: buildExplorerUrl(hash),
    wait: () => params.wallet.publicClient.waitForTransactionReceipt({ hash }),
  };
}

/**
 * Format a raw token amount (in wei, 18 decimals) to a human-readable string.
 * All staking amounts in BitDrum are WSTT (18 decimals).
 */
export function formatTokenAmount(
  rawAmount: string | null | undefined,
  decimals = STT_DECIMALS,
  precision = 4,
) {
  const value = BigInt(rawAmount || '0');
  const isNegative = value < 0n;
  const absoluteValue = isNegative ? value * -1n : value;
  const divisor = 10n ** BigInt(decimals);
  const whole = absoluteValue / divisor;
  const fraction = absoluteValue % divisor;
  const paddedFraction = fraction.toString().padStart(decimals, '0').slice(0, precision);
  const formatted = `${whole.toString()}.${paddedFraction}`.replace(/\.$/, '');
  return isNegative ? `-${formatted}` : formatted;
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTimeframe(durationSeconds: number | null | undefined) {
  if (durationSeconds === 30) return '30s';
  if (durationSeconds === 60) return '1m';
  if (durationSeconds === 300) return '5m';
  if (!durationSeconds) return '--';
  return `${durationSeconds}s`;
}

/**
 * Format a raw Pyth oracle price (8 decimals, BTC/USD) to a JS number.
 * Note: oracle prices are still 8-decimal regardless of the staking token.
 */
export function formatOraclePrice(rawAmount: string | null | undefined, decimals = 8) {
  const numeric = Number(rawAmount || '0');
  if (!Number.isFinite(numeric) || numeric === 0) {
    return null;
  }

  return numeric / 10 ** decimals;
}
