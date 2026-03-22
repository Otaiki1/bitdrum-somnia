import { CairoCustomEnum, Contract, RpcProvider } from 'starknet';

const PRAGMA_ORACLE_ADDRESS = process.env.PRAGMA_ORACLE_ADDRESS || '';
const BTC_USD_PAIR_ID = '18669995996566340';

export interface PragmaPriceSnapshot {
  price: string;
  decimals: number;
  lastUpdatedTimestamp: number;
  numSourcesAggregated: number;
}

let pragmaOracleContract: Contract | null = null;

function toDecimalString(value: unknown): string {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'number') {
    return Math.trunc(value).toString();
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object' && 'toString' in value) {
    return String(value.toString());
  }

  return '0';
}

function toSafeNumber(value: unknown): number {
  return Number(toDecimalString(value));
}

async function getPragmaOracleContract(provider: RpcProvider) {
  if (!PRAGMA_ORACLE_ADDRESS) {
    throw new Error('Missing PRAGMA_ORACLE_ADDRESS');
  }

  if (!pragmaOracleContract) {
    const pragmaClass = await provider.getClassAt(PRAGMA_ORACLE_ADDRESS);
    pragmaOracleContract = new Contract({
      abi: pragmaClass.abi,
      address: PRAGMA_ORACLE_ADDRESS,
      providerOrAccount: provider,
    });
  }

  return pragmaOracleContract;
}

export async function fetchPragmaPrice(provider: RpcProvider): Promise<PragmaPriceSnapshot> {
  const oracle = await getPragmaOracleContract(provider);
  const dataType = new CairoCustomEnum({
    SpotEntry: BTC_USD_PAIR_ID,
    FutureEntry: undefined,
    GenericEntry: undefined,
  });

  const response: any = await oracle.get_data_median(dataType);
  const snapshot: PragmaPriceSnapshot = {
    price: toDecimalString(response.price),
    decimals: toSafeNumber(response.decimals),
    lastUpdatedTimestamp: toSafeNumber(response.last_updated_timestamp),
    numSourcesAggregated: toSafeNumber(response.num_sources_aggregated),
  };

  if (!snapshot.price || snapshot.price === '0') {
    throw new Error('Pragma oracle returned an empty BTC/USD price');
  }

  return snapshot;
}
