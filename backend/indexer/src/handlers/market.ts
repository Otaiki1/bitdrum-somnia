import { Pool } from 'pg';
import { num } from 'starknet';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export const handleMarketOpened = async (event: any) => {
  const { market_id, opener, direction, strike_price, duration } = event.data;
  
  const query = `
    INSERT INTO markets (market_id, opener_address, direction, strike_price, duration, state)
    VALUES ($1, $2, $3, $4, $5, 'OPEN')
    ON CONFLICT (market_id) DO NOTHING
  `;
  
  const values = [
    num.toHex(market_id),
    num.toHex(opener),
    direction === 0 ? 'UP' : 'DOWN',
    num.toBigInt(strike_price).toString(),
    Number(duration)
  ];

  await pool.query(query, values);
  console.log(`[Indexer] Market Opened: ${num.toHex(market_id)}`);
};

export const handleMarketSettled = async (event: any) => {
  const { market_id, outcome, expiry_price } = event.data;
  
  const query = `
    UPDATE markets 
    SET outcome = $1, expiry_price = $2, state = 'SETTLED', settled_at = CURRENT_TIMESTAMP
    WHERE market_id = $3
  `;
  
  const values = [
    outcome === 0 ? 'UP' : (outcome === 1 ? 'DOWN' : 'DRAW'),
    num.toBigInt(expiry_price).toString(),
    num.toHex(market_id)
  ];

  await pool.query(query, values);
  console.log(`[Indexer] Market Settled: ${num.toHex(market_id)}`);
  
  // Logic to update trader stats could go here
};
