import { RpcProvider, hash, num } from 'starknet';
import dotenv from 'dotenv';
import { handleMarketOpened, handleMarketSettled } from './handlers/market';

dotenv.config();

const provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC_URL || 'https://starknet-sepolia.public.blastapi.io' });
const CONTRACT_ADDRESS = process.env.MARKET_CONTRACT_ADDRESS || "";

// Selector hashes for events
const MARKET_OPENED_SELECTOR = hash.getSelectorFromName('MarketOpened');
const MARKET_SETTLED_SELECTOR = hash.getSelectorFromName('MarketSettled');

const indexEvents = async () => {
    console.log(`🚀 BitDrum Social Indexer Started`);
    console.log(`Watching contract: ${CONTRACT_ADDRESS}`);

    let lastBlock = await provider.getBlockNumber();

    const loop = async () => {
        try {
            const currentBlock = await provider.getBlockNumber();
            
            if (currentBlock > lastBlock) {
                console.log(`[Indexer] Scanning blocks ${lastBlock + 1} to ${currentBlock}...`);
                
                const eventsRes = await provider.getEvents({
                    address: CONTRACT_ADDRESS,
                    from_block: { block_number: lastBlock + 1 },
                    to_block: { block_number: currentBlock },
                    chunk_size: 10
                });

                for (const event of eventsRes.events) {
                    const selector = event.keys[0];
                    
                    if (selector === MARKET_OPENED_SELECTOR) {
                        await handleMarketOpened(event);
                    } else if (selector === MARKET_SETTLED_SELECTOR) {
                        await handleMarketSettled(event);
                    }
                }

                lastBlock = currentBlock;
            }
        } catch (error) {
            console.error('[Indexer] Error indexing events:', error);
        }
        
        setTimeout(loop, 10000); // Poll every 10 seconds
    };

    loop();
};

indexEvents().catch(console.error);
