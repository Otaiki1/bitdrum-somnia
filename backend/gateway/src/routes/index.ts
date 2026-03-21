import { Router } from 'express';
import axios from 'axios';
import { checkSubscription } from '../middleware/auth';

const router = Router();

// 1. Public Market Feed
router.get('/markets', async (req, res) => {
  try {
    // Proxy to Social Indexer (logic would query Postgres)
    // For now, providing a structured response
    console.log(`[Gateway] Fetching markets from Indexer...`);
    res.json({ 
        markets: [
            { id: "0x1", state: "OPEN", direction: "UP", strike_price: "65000" },
            { id: "0x2", state: "LOCKED", direction: "DOWN", strike_price: "64800" }
        ],
        source: "Social Indexer" 
    });
  } catch (error) {
    res.status(500).json({ error: 'Indexer unavailable' });
  }
});

// 2. AI Signal (Gated)
// Only Signal Pro/Elite can see confidence scores and rationales
router.get('/signal/:market_id', checkSubscription, async (req, res) => {
  const { market_id } = req.params;
  
  try {
    // Proxy to AI Agent (Python/FastAPI)
    const response = await axios.post('http://localhost:8000/signal', {
      market_id
    });
    
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'AI Agent unavailable', details: (error as any).message });
  }
});

// 3. Leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        // Proxy to Social Indexer for top traders
        res.json({ 
            rankings: [
                { address: "0x123", score: 95, tier: "ORACLE" },
                { address: "0x456", score: 88, tier: "PROPHET" }
            ],
            source: "Social Indexer"
        });
    } catch (error) {
        res.status(500).json({ error: 'Indexer unavailable' });
    }
});

export default router;
