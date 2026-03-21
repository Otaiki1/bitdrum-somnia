import { RpcProvider, Account, Contract, cairo } from 'starknet';
import dotenv from 'dotenv';

dotenv.config();

const MARKET_CONTRACT_ADDRESS = process.env.MARKET_CONTRACT_ADDRESS || "";
const SETTLEMENT_ENGINE_ADDRESS = process.env.SETTLEMENT_ENGINE_ADDRESS || "";
const KEEPER_ADDRESS = process.env.KEEPER_ADDRESS || "";
const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY || "";

const provider = new RpcProvider({ 
  nodeUrl: process.env.STARKNET_RPC_URL || 'https://starknet-sepolia.public.blastapi.io',
  specVersion: "0.9.0",
  blockIdentifier: "latest"
});
const account = new Account({ 
  provider, 
  address: KEEPER_ADDRESS, 
  signer: KEEPER_PRIVATE_KEY 
});

let predictionMarketContract: Contract | null = null;
let settlementEngineContract: Contract | null = null;

export const settleExpiredMarkets = async () => {
  try {
    if (!predictionMarketContract) {
      const pmClass = await provider.getClassAt(MARKET_CONTRACT_ADDRESS);
      predictionMarketContract = new Contract({ abi: pmClass.abi, address: MARKET_CONTRACT_ADDRESS, providerOrAccount: provider });
    }
    if (!settlementEngineContract) {
      const seClass = await provider.getClassAt(SETTLEMENT_ENGINE_ADDRESS);
      settlementEngineContract = new Contract({ abi: seClass.abi, address: SETTLEMENT_ENGINE_ADDRESS, providerOrAccount: provider });
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const countResponse = await predictionMarketContract!.market_count();
    const marketCount = Number(countResponse);

    for (let i = 1; i <= marketCount; i++) {
      const market = await predictionMarketContract!.get_market(i);
      
      // state: Placeholder=0, Open=1, Locked=2, Settled=3, Claimable=4, Closed=5
      const state = Number(market.state?.variant ? Object.values(market.state.variant)[0] : market.state);
      const joinDeadline = Number(market.join_deadline);

      // Condition 1: Lock market if joining window expired
      if (state === 1 && currentTimestamp >= joinDeadline) {
        console.log(`[Keeper] Locking market ${i} (Deadline ${joinDeadline} passed)`);
        try {
          const { transaction_hash } = await account.execute({
            contractAddress: MARKET_CONTRACT_ADDRESS,
            entrypoint: 'lock_market',
            calldata: [i]
          });
          console.log(`[Keeper] TX submitted: ${transaction_hash}`);
        } catch (e: any) {
          console.error(`[Keeper] Failed to lock market ${i}:`, e.message || e);
        }
      }

      // Condition 2: Settle market if locked and ready
      if (state === 2 && currentTimestamp >= joinDeadline + 60) {
        console.log(`[Keeper] Settling market ${i}...`);
        
        // Mocking PRAGMA API price for MVP
        const btcPriceStr = (65000 * 1e8).toString(); 
        const pragmaResponse = {
          price: cairo.uint256(btcPriceStr).low,
          decimals: 8,
          last_updated_timestamp: currentTimestamp,
          num_sources_aggregated: 3,
          expiration_timestamp: undefined
        };

        try {
          const { transaction_hash } = await account.execute({
            contractAddress: SETTLEMENT_ENGINE_ADDRESS,
            entrypoint: 'settle',
            calldata: [i, pragmaResponse]
          });
          console.log(`[Keeper] Settlement TX submitted for ${i}: ${transaction_hash}`);
        } catch (e: any) {
          console.error(`[Keeper] Failed to settle market ${i}:`, e.message || e);
        }
      }
    }
  } catch (error) {
    console.error('[Keeper] Polling error:', error);
  }
};
