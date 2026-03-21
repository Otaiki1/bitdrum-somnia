import { Router } from 'express';
import axios from 'axios';
import { checkSubscription } from '../middleware/auth';

const router = Router();

// 1. Public Market Feed
router.get('/markets', (req, res) => {
  // In production, this would query the Social Indexer
  res.json({ markets: [], message: "Market feed (Social Indexer proxy pending)" });
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
router.get('/leaderboard', (req, res) => {
  // Proxy to Social Indexer
  res.json({ rankings: [], message: "Leaderboard (Social Indexer proxy pending)" });
});

export default router;
