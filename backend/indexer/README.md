# BitDrum Social Indexer

The Social Indexer is a high-performance off-chain service that listens to Starknet events and maintains a queryable database of trader stats, leaderboards, and social signals.

## Role in the System
- Processes `MarketSettled` and `Stake` events.
- Computes complex metrics like rolling win rates and consistency scores.
- Serves the global leaderboard and trader profile APIs.

## Stack
- Node.js / TypeScript
- PostgreSQL (Primary Store)
- Redis (Real-time Caching)
- Starknet.js (Event Listening)
