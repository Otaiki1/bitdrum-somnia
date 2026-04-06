export interface OraclePriceSnapshot {
  price: bigint;
  timestamp: number;
  source: 'dia' | 'protofire' | 'static';
}

type OraclePayload = {
  price: bigint;
  timestamp: number;
};

const DIA_ORACLE_URL = process.env.DIA_ORACLE_URL || '';
const PROTOFIRE_ORACLE_URL = process.env.PROTOFIRE_ORACLE_URL || '';
const STATIC_ORACLE_PRICE = process.env.ORACLE_STATIC_PRICE || '';

function normalizeBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') {
    return value;
  }

  if (typeof value === 'number') {
    return BigInt(Math.trunc(value));
  }

  if (typeof value === 'string') {
    if (value.includes('.')) {
      return BigInt(value.replace('.', ''));
    }
    return BigInt(value);
  }

  throw new Error('Unsupported oracle price format');
}

function normalizeTimestamp(value: unknown) {
  if (typeof value === 'number') {
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    return Math.trunc(Number(value));
  }

  throw new Error('Unsupported oracle timestamp format');
}

function extractPayload(json: any): OraclePayload {
  const candidates = [
    json,
    json?.data,
    json?.price,
    json?.result,
    json?.result?.data,
    json?.BTCUSD,
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') {
      continue;
    }

    const priceValue =
      candidate.price ??
      candidate.value ??
      candidate.median ??
      candidate.latestAnswer ??
      candidate.answer;
    const timestampValue =
      candidate.timestamp ??
      candidate.updatedAt ??
      candidate.updated_at ??
      candidate.publishTime ??
      candidate.time;

    if (priceValue !== undefined && timestampValue !== undefined) {
      return {
        price: normalizeBigInt(priceValue),
        timestamp: normalizeTimestamp(timestampValue),
      };
    }
  }

  throw new Error('Unable to normalize oracle payload');
}

async function fetchFromUrl(url: string): Promise<OraclePayload> {
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Oracle request failed with status ${response.status}`);
  }

  const payload = await response.json();
  return extractPayload(payload);
}

function staticSnapshot(): OraclePriceSnapshot | null {
  if (!STATIC_ORACLE_PRICE) {
    return null;
  }

  return {
    price: normalizeBigInt(STATIC_ORACLE_PRICE),
    timestamp: Math.floor(Date.now() / 1000),
    source: 'static',
  };
}

export async function fetchOraclePrice(): Promise<OraclePriceSnapshot> {
  if (DIA_ORACLE_URL) {
    try {
      const payload = await fetchFromUrl(DIA_ORACLE_URL);
      return { ...payload, source: 'dia' };
    } catch (error) {
      console.warn('[Keeper] DIA oracle fetch failed, trying fallback:', error);
    }
  }

  if (PROTOFIRE_ORACLE_URL) {
    const payload = await fetchFromUrl(PROTOFIRE_ORACLE_URL);
    return { ...payload, source: 'protofire' };
  }

  const snapshot = staticSnapshot();
  if (snapshot) {
    return snapshot;
  }

  throw new Error('No oracle source configured. Set DIA_ORACLE_URL, PROTOFIRE_ORACLE_URL, or ORACLE_STATIC_PRICE.');
}
