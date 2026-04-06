import { createPublicClient, defineChain, fallback, http, parseAbi } from 'viem';

export interface OraclePriceSnapshot {
  price: bigint;
  timestamp: number;
  source: 'dia' | 'static';
}

// DIA Oracle contract addresses on Somnia
// Main oracle: getValue(key) → (uint128 price, uint128 timestamp)
const DIA_ORACLE_ADDRESS_MAINNET = '0xbA0E0750A56e995506CA458b2BdD752754CF39C4';
const DIA_ORACLE_ADDRESS_TESTNET = '0x9206296Ea3aEE3E6bdC07F7AaeF14DfCf33d865D';

const SOMNIA_RPC_URL = process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';
const SOMNIA_RPC_FALLBACK_URL = process.env.SOMNIA_RPC_FALLBACK_URL || 'https://rpc.somnia.network';
const SOMNIA_CHAIN_ID = Number(process.env.SOMNIA_CHAIN_ID || 50312);
const STATIC_ORACLE_PRICE = process.env.ORACLE_STATIC_PRICE || '';

const DIA_ABI = parseAbi([
  'function getValue(string key) external view returns (uint128 price, uint128 timestamp)',
]);

const MULTICALL3_ADDRESS: Record<number, `0x${string}`> = {
  5031: '0x5e44F178E8cF9B2F5409B6f18ce936aB817C5a11',
  50312: '0x841b8199E6d3Db3C6f264f6C2bd8848b3cA64223',
};

const chain = defineChain({
  id: SOMNIA_CHAIN_ID,
  name: SOMNIA_CHAIN_ID === 5031 ? 'Somnia' : 'Somnia Shannon',
  nativeCurrency:
    SOMNIA_CHAIN_ID === 5031
      ? { name: 'SOMI', symbol: 'SOMI', decimals: 18 }
      : { name: 'STT', symbol: 'STT', decimals: 18 },
  rpcUrls: {
    default: { http: [SOMNIA_RPC_URL] },
    public: { http: [SOMNIA_RPC_URL] },
  },
  contracts: {
    multicall3: {
      address: MULTICALL3_ADDRESS[SOMNIA_CHAIN_ID] ?? '0x841b8199E6d3Db3C6f264f6C2bd8848b3cA64223',
    },
  },
});

const publicClient = createPublicClient({
  chain,
  transport: fallback(
    [
      http(SOMNIA_RPC_URL, { retryCount: 3, retryDelay: 1000 }),
      http(SOMNIA_RPC_FALLBACK_URL, { retryCount: 2, retryDelay: 2000 }),
    ],
    { rank: false },
  ),
});

function getOracleAddress(): `0x${string}` {
  return (SOMNIA_CHAIN_ID === 5031 ? DIA_ORACLE_ADDRESS_MAINNET : DIA_ORACLE_ADDRESS_TESTNET) as `0x${string}`;
}

async function fetchDiaOnchain(): Promise<OraclePriceSnapshot> {
  const [price, timestamp] = await publicClient.readContract({
    address: getOracleAddress(),
    abi: DIA_ABI,
    functionName: 'getValue',
    args: ['BTC/USD'],
  });

  if (price === 0n) {
    throw new Error('[Oracle] DIA returned zero price');
  }

  const ts = Number(timestamp);
  const age = Math.floor(Date.now() / 1000) - ts;
  if (age > 300) {
    throw new Error(`[Oracle] DIA price is stale (${age}s old)`);
  }

  return { price, timestamp: ts, source: 'dia' };
}

function staticSnapshot(): OraclePriceSnapshot | null {
  if (!STATIC_ORACLE_PRICE) return null;
  return {
    price: BigInt(STATIC_ORACLE_PRICE),
    timestamp: Math.floor(Date.now() / 1000),
    source: 'static',
  };
}

/**
 * Fetch the current BTC/USD price from the DIA on-chain oracle.
 * Falls back to ORACLE_STATIC_PRICE if the RPC call fails.
 * DIA price format: 8-decimal integer (same as Pyth on the frontend).
 */
export async function fetchOraclePrice(): Promise<OraclePriceSnapshot> {
  try {
    return await fetchDiaOnchain();
  } catch (err) {
    console.warn('[Oracle] DIA on-chain read failed:', (err as Error).message);
  }

  const snapshot = staticSnapshot();
  if (snapshot) {
    console.warn('[Oracle] Using static price fallback');
    return snapshot;
  }

  throw new Error(
    '[Oracle] No price source available. Set ORACLE_STATIC_PRICE as fallback.',
  );
}
