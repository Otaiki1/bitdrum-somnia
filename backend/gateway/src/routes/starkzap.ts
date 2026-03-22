import { Router } from 'express';
import { PrivyClient } from '@privy-io/node';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const privy = new PrivyClient({
    appId: process.env.PRIVY_APP_ID!,
    appSecret: process.env.PRIVY_APP_SECRET!
});

/**
 * Endpoint to sign a Starknet transaction hash using the user's Privy Embedded Wallet.
 * Starkzap SDK calls this on every transaction if using PrivySigner.
 */
router.post('/sign', async (req, res) => {
  const { walletId, hash } = req.body;
  
  if (!walletId || !hash) {
    return res.status(400).json({ error: 'walletId and hash required' });
  }

  try {
    console.log(`[Starkzap] Signing hash for wallet ${walletId}...`);
    // Sign using the wallets() service
    const result = await privy.wallets().rawSign(walletId, {
      params: { hash },
    });
    
    res.json({ signature: result.signature });
  } catch (error: any) {
    console.error("[Starkzap] Signing error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Returns the user's Starknet-compatible Privy wallet metadata (id + public key).
 */
router.post('/starknet', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

        const token = authHeader.replace('Bearer ', '');
        
        // Use the native verifyAccessToken method via the client utils
        const claims = await privy.utils().auth().verifyAccessToken(token);
        
        // Fetch user from Privy to find their Starknet-compatible wallet
        const user = await privy.users()._get(claims.user_id);
        
        // Find an embedded wallet
        const wallet = user.linked_accounts.find((a: any) => a.type === 'wallet' && a.wallet_client_type === 'privy');
        
        if (!wallet) {
            return res.status(404).json({ error: 'No embedded wallet found' });
        }

        res.json({ 
            wallet: {
                id: (wallet as any).id,
                publicKey: (wallet as any).public_key
            }
        });
    } catch (error: any) {
        console.error("[Starkzap] Wallet setup error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

export default router;
