import { Router } from 'express';
import axios from 'axios';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { checkSubscription } from '../middleware/auth';

dotenv.config();

const router = Router();
const pool = new Pool({
  connectionString: process.env.POSTGRES_CONNECTION_STRING || "postgresql://0t41k1@localhost:5432/bitdrum",
});

// 1. Public Market Feed
router.get('/markets', async (req, res) => {
  try {
    console.log(`[Gateway] Fetching markets from Postgres...`);
    // Query local bitdrum schema populated by indexer
    const { rows } = await pool.query('SELECT * FROM markets ORDER BY opened_at DESC LIMIT 50');
    
    // Convert to standard format for frontend
    const markets = rows.map(r => ({
      id: r.market_id,
      state: r.state,
      direction: r.opener_direction,
      entry_price: r.entry_price,
      settlement_price: r.settlement_price,
      strike_price: r.entry_price // Some clients use strike_price interchangeably
    }));

    res.json({ markets, source: "Postgres DB" });
  } catch (error: any) {
    console.error("[Gateway] Markets error:", error);
    res.status(500).json({ error: 'Database unavailable' });
  }
});

// 2. AI Signal (Gated)
// Only Signal Pro/Elite can see confidence scores and rationales
router.get('/signal/:market_id', checkSubscription, async (req, res) => {
  const { market_id } = req.params;
  
  try {
    // Proxy to AI Agent (Python/FastAPI)
    const response = await axios.post(`${process.env.AI_AGENT_URL || 'http://localhost:8000'}/signal`, {
      market_id
    });
    
    res.json(response.data);
  } catch (error: any) {
    console.error(`[Gateway] AI Error: ${error.message}`);
    res.status(500).json({ error: 'AI Agent unavailable', details: error.message });
  }
});

// 3. Leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        console.log(`[Gateway] Fetching leaderboard from Postgres...`);
        const { rows } = await pool.query('SELECT address, composite_score as score, tier FROM traders ORDER BY composite_score DESC LIMIT 50');
        res.json({ rankings: rows, source: "Postgres DB" });
    } catch (error: any) {
        console.error("[Gateway] Leaderboard error:", error);
        res.status(500).json({ error: 'Database unavailable' });
    }
});

export default router;
