# BitDrum Indexer — Apibara

This indexer uses [Apibara](https://www.apibara.com) to stream Starknet Sepolia events from the BitDrum PredictionMarket contract and persist them to PostgreSQL via Drizzle ORM.

## Architecture

| File | Purpose |
|---|---|
| `apibara.config.ts` | Runtime config: stream URL, starting block, contract address |
| `bitdrum.indexer.ts` | Main indexer: decodes events and writes to DB |
| `lib/schema.ts` | Drizzle ORM schema: traders, markets, stakes, ai_signals, follows |
| `drizzle.config.ts` | Drizzle Kit config for migrations |

## Events Indexed

| Event | What it does |
|---|---|
| `MarketOpened` | Creates a new market row, ensures opener trader row exists |
| `MarketJoined` | Creates a stake row, ensures participant trader row exists |
| `MarketLocked` | Updates market state to `LOCKED` |
| `MarketClaimable` | Updates market state to `CLAIMABLE`, stores settlement price |
| `Claimed` | Marks the participant's stake as claimed with their payout |

## Setup

### 1. Get an Apibara API key

Sign up at [https://app.apibara.com](https://app.apibara.com), create an API key, and add it to `.env`:

```
DNA_TOKEN=your-api-key-here
```

### 2. Configure Postgres (optional)

For local dev, the indexer uses an in-memory **PGLite** database automatically. No Postgres installation needed.

For production, set the connection string in `.env`:
```
POSTGRES_CONNECTION_STRING=postgresql://user:pass@host:5432/bitdrum
```

### 3. Run database migrations

```bash
npm run db:generate   # Generate SQL migration files
npm run db:migrate    # Apply migrations to Postgres
```

> Skip this step for local dev (PGLite is auto-configured)

### 4. Run the indexer

```bash
# Development (hot reload)
npm run dev

# Production
npm run build
npm run start
```

## Starting Block

The `startingBlock` in `apibara.config.ts` is set to `7_910_000` — just before the contract deployment block. Apibara will replay all events from that block forward to populate the database.
