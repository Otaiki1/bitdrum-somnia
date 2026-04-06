# BitDrum

**Decentralized BTC price prediction markets on Somnia — with AI-powered trade signals and a live leaderboard.**

Users stake native STT on whether Bitcoin's price will go UP or DOWN over a fixed window (30 seconds, 1 minute, or 5 minutes). The vault automatically matches every stake on the opposite side, so there is always a counter-party. Winners collect their principal plus a profit bonus (5–70% via the POM engine). An AI agent monitors top traders, pre-computes directional signals, and surfaces them inside the trade panel before you commit.

---

## How it works

### The trade flow

```
1. Open a market    — pick direction (UP/DOWN), timeframe, stake amount, send STT
2. Join window      — other users join the opposite side (window = duration ÷ 3, min 10s)
3. Lock             — keeper closes the joining window; no new entries accepted
4. Settle           — keeper submits the BTC/USD price from the DIA on-chain oracle;
                      contract compares to strike price → UP / DOWN / Draw
5. Claim            — winners call claimPayout() and receive principal + POM profit;
                      draw refunds everyone; losers' stakes sweep to the vault
```

### The vault

Every user stake is matched 1:1 by `LiquidityVault` on the opposite side. This means both pools always have equal depth. The vault earns a small net surplus each market cycle (protocol fee + loser stakes minus winner profits), so it is self-sustaining after the first few markets.

### The POM (Probable Outcome Multiplier)

POM is the profit rate awarded to winners, expressed in basis points (500 = 5%, 7000 = 70%). The keeper sets it before locking a market based on signal confidence and vault depth. Winners receive `principal × (1 + POM/10000)`.

### The AI agent

A Python/FastAPI service that queries the gateway for recent trade history and market context, calls OpenAI, and produces a directional signal with a confidence score and rationale. Signals are pre-computed when a market opens or locks, stored in PostgreSQL, and surfaced in the frontend trade panel via the gateway REST API.

### The leaderboard

`LeaderboardRegistry` is updated on-chain by the `SettlementEngine` after every market settles. The indexer mirrors this data into PostgreSQL. The gateway streams leaderboard snapshots to connected frontends via WebSocket and publishes them to Somnia Streams for external consumers.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Somnia EVM                          │
│  PredictionMarket ─── SettlementEngine                  │
│  LiquidityVault   ─── LeaderboardRegistry               │
│  Treasury         ─── SubscriptionsContract             │
│  DIA Oracle (BTC/USD — on-chain, read by keeper)        │
└────────────────┬────────────────────────────────────────┘
                 │ events / RPC
     ┌───────────┼───────────────────────┐
     │           │                       │
  Indexer     Keeper                  Gateway
  (viem        (viem                  (Express +
  poll)        readContract           WebSocket)
     │         + settle tx)               │
     └──────────┬────────────────────────┘
                │ PostgreSQL
                │
            AI Agent ── OpenAI
                │
            Frontend (Next.js)
```

**Indexer** — polls `getLogs` in block batches, writes markets/stakes/traders to PostgreSQL, triggers the gateway's Somnia Reactivity invalidation pipeline.

**Keeper** — polls every 3 seconds, locks expired joining windows, reads BTC/USD from the DIA on-chain oracle, calls `SettlementEngine.settle()`.

**Gateway** — serves REST + WebSocket. Subscribes to Somnia Reactivity for real-time invalidation. Publishes AI signals and leaderboard snapshots to Somnia Streams. Per-channel 2-second cache prevents redundant DB reads on bursts.

**AI Agent** — FastAPI service. Called by the gateway on `MarketOpened` / `MarketLocked` events. Returns `{direction, confidence, rationale}`.

**Frontend** — hook-based data layer: WS-primary with REST fallback for positions, feed, and leaderboard. Direct viem multicall for hot market-state reads (no gateway round-trip for pool sizes / balances).

---

## Project structure

```
bitdrum/
├── contracts/
│   ├── src/
│   │   ├── PredictionMarket.sol      # payable openMarket / joinMarket; native STT
│   │   ├── SettlementEngine.sol      # determines UP/DOWN/Draw from oracle data
│   │   ├── LiquidityVault.sol        # matches every stake 1:1; pays winners
│   │   ├── Treasury.sol              # receives 2% protocol fee; distributes to vault/AI/reserve
│   │   ├── LeaderboardRegistry.sol   # on-chain trader stats updated per settlement
│   │   └── SubscriptionsContract.sol # PRO (10 STT) / ELITE (25 STT) signal tiers
│   └── script/Deploy.s.sol           # deploys all 6 contracts, seeds vault with 10 STT
│
├── backend/
│   ├── indexer/src/index.ts          # viem event poller → PostgreSQL
│   ├── keeper/src/                   # settlement bot; oracle.ts reads DIA on-chain
│   ├── gateway/src/                  # REST + WS; reactivity + streams integration
│   └── ai-agent/main.py              # FastAPI signal inference
│
└── frontend/src/
    ├── hooks/                        # useWebSocket · usePositions · useFeed ·
    │                                 # useLeaderboard · useMarketDetail · useSignal · usePom
    ├── components/                   # TradingDashboard · TradePanel · PriceChart ·
    │                                 # SocialFeed · LeaderboardCard
    └── utils/
        ├── somnia.ts                 # chain config, contract addresses
        ├── bitdrum.ts                # openMarket / joinMarket / claimMarket (viem)
        └── contracts.ts             # readMarketOnchain / readMarketAndBalance (multicall)
```

---

## Deploying to Somnia Shannon testnet

### 1. Prerequisites

- Foundry: `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- Node.js 20+, Python 3.11+, PostgreSQL 16+
- A deployer wallet funded with STT from `faucet.somnia.network`
- An OpenAI API key

### 2. Deploy contracts

```bash
cd contracts
export PRIVATE_KEY=0x<deployer_key>

forge script script/Deploy.s.sol \
  --rpc-url https://dream-rpc.somnia.network \
  --broadcast --verify \
```

If Shannon deployment transactions fail immediately during every `CREATE`, recompile for a pre-Shanghai EVM target. The repo is pinned to `evm_version = "paris"` in [contracts/foundry.toml](/Users/0t41k1/Documents/somnia/bitdrum/contracts/foundry.toml) because Somnia Shannon can reject bytecode that uses newer opcodes such as `PUSH0`.

The script prints six addresses. Record them — you need them in every `.env` file.

### 3. Run the database migration

```bash
cd backend/indexer
npm install
npm run db:migrate
```

### 4. Configure environment files

**`backend/indexer/.env`**
```env
POSTGRES_CONNECTION_STRING=postgresql://<user>@localhost:5432/bitdrum
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
SOMNIA_RPC_FALLBACK_URL=https://rpc.somnia.network
SOMNIA_CHAIN_ID=50312
PREDICTION_MARKET_ADDRESS=<from deploy>
START_BLOCK=<deployment block>
POLL_INTERVAL_MS=3000
BLOCK_BATCH_SIZE=500
```

**`backend/gateway/.env`**
```env
PORT=3001
POSTGRES_CONNECTION_STRING=postgresql://<user>@localhost:5432/bitdrum
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
SOMNIA_CHAIN_ID=50312
PREDICTION_MARKET_ADDRESS=<from deploy>
AI_AGENT_URL=http://localhost:8000
PRIVY_APP_ID=<privy app id>
PRIVY_APP_SECRET=<privy app secret>
SOMNIA_REACTIVITY_ENABLED=true
SOMNIA_REACTIVITY_WS_URL=ws://api.infra.testnet.somnia.network/ws
SOMNIA_STREAMS_ENABLED=true
STREAMS_PUBLISHER_PRIVATE_KEY=<keeper wallet key>
STREAMS_PUBLISHER_ADDRESS=<keeper wallet address>
```

**`backend/keeper/.env`**
```env
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
SOMNIA_RPC_FALLBACK_URL=https://rpc.somnia.network
SOMNIA_CHAIN_ID=50312
PREDICTION_MARKET_ADDRESS=<from deploy>
SETTLEMENT_ENGINE_ADDRESS=<from deploy>
KEEPER_PRIVATE_KEY=<keeper wallet key>
KEEPER_POM_BPS=1000
POLLING_INTERVAL=3000
# Optional: static price fallback if DIA oracle is unreachable
# ORACLE_STATIC_PRICE=10500000000000
```

**`backend/ai-agent/.env`**
```env
OPENAI_API_KEY=<your key>
GATEWAY_URL=http://localhost:3001/api
```

**`frontend/.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
NEXT_PUBLIC_CHAIN_ID=50312
NEXT_PUBLIC_PREDICTION_MARKET_ADDR=<from deploy>
NEXT_PUBLIC_PRIVY_APP_ID=<privy app id>
```

### 5. Start services (in order)

```bash
# AI Agent
cd backend/ai-agent && pip install -r requirements.txt
uvicorn main:app --port 8000

# Indexer
cd backend/indexer && npm run build && npm start

# Gateway
cd backend/gateway && npm run build && npm start

# Keeper
cd backend/keeper && npm run build && npm start

# Frontend
cd frontend && npm install && npm run dev
```

### 6. Verify

```bash
curl http://localhost:8000/health    # {"status":"ok"}
curl http://localhost:3001/health    # {"status":"healthy"}
```

Open `http://localhost:3000`, connect MetaMask on Somnia Shannon (chain ID 50312), and place a trade.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Somnia EVM — Shannon testnet (50312) / Mainnet (5031) |
| Smart contracts | Solidity ^0.8.20, Foundry |
| Contract interaction | viem (frontend + indexer + keeper) |
| Price oracle | DIA on-chain BTC/USD (`getValue("BTC/USD")`) |
| Price chart | Pyth Network Hermes (real-time streaming) |
| Real-time events | Somnia Reactivity SDK |
| Data streams | Somnia Streams SDK |
| Frontend | Next.js, Tailwind CSS, TypeScript |
| Wallet | Privy (social login) + MetaMask |
| Backend API | Node.js, Express, WebSocket |
| AI signals | Python, FastAPI, OpenAI |
| Database | PostgreSQL (Drizzle ORM for schema) |

---

## Oracle notes

The keeper reads BTC/USD directly from the **DIA on-chain oracle** — no API key or HTTP endpoint needed:

| Network | Oracle contract |
|---------|----------------|
| Testnet (Shannon) | `0x9206296Ea3aEE3E6bdC07F7AaeF14DfCf33d865D` |
| Mainnet | `0xbA0E0750A56e995506CA458b2BdD752754CF39C4` |

DIA updates every 120 seconds (or on 0.5% deviation). The frontend price chart uses Pyth/Hermes for sub-second streaming — separate from settlement.

---

## Staking token

BitDrum uses **native STT** — the native gas token of Somnia. No token wrapping or ERC-20 approval is required. Opening or joining a market is a single transaction: `openMarket{value: stakeAmount}(...)`.

Users get STT from the Somnia faucet at `faucet.somnia.network`.
