# BitDrum Testnet Checklist

## Phase 0 — Prerequisites
- [ ] Fund a deployer wallet with STT on Somnia Shannon testnet (faucet at `faucet.somnia.network`)
- [ ] Have an OpenAI API key ready (existing one in `ai-agent/.env` is exposed — rotate it)
- [ ] Have a Privy app configured for Somnia (existing app ID is fine for testnet)
- [ ] PostgreSQL instance running (`createdb bitdrum` if local)

---

## Phase 1 — Deploy Contracts

```bash
cd contracts
export PRIVATE_KEY=0x<deployer_private_key>
forge script script/Deploy.s.sol \
  --rpc-url https://dream-rpc.somnia.network \
  --broadcast --verify
```

- [ ] Run the deploy script — it will print all 7 addresses
- [ ] Record the addresses:
  ```
  WBTC_ADDRESS=
  PREDICTION_MARKET_ADDRESS=
  SETTLEMENT_ENGINE_ADDRESS=
  SUBSCRIPTIONS_CONTRACT_ADDRESS=
  LEADERBOARD_REGISTRY_ADDRESS=
  LIQUIDITY_VAULT_ADDRESS=
  TREASURY_ADDRESS=
  ```
- [ ] Mint test WBTC to your test wallets: call `MockERC20.mint(address, amount)` on the deployed WBTC

---

## Phase 2 — Database

```bash
cd backend/indexer
npm run db:migrate   # runs 0000 + 0001_add_duration_seconds.sql
```

- [ ] Migration runs without error
- [ ] Verify `duration_seconds` column exists in `markets` table

---

## Phase 3 — Environment Files

**`backend/indexer/.env`**
```env
POSTGRES_CONNECTION_STRING=postgresql://<user>@localhost:5432/bitdrum
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
SOMNIA_RPC_FALLBACK_URL=https://rpc.somnia.network
SOMNIA_CHAIN_ID=50312
PREDICTION_MARKET_ADDRESS=<from Phase 1>
START_BLOCK=<deployment block number>
POLL_INTERVAL_MS=3000
BLOCK_BATCH_SIZE=500
```
> Remove the legacy `DNA_TOKEN` line — Apibara is no longer used.

**`backend/gateway/.env`**
```env
PORT=3001
POSTGRES_CONNECTION_STRING=postgresql://<user>@localhost:5432/bitdrum
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
SOMNIA_CHAIN_ID=50312
PREDICTION_MARKET_ADDRESS=<from Phase 1>
AI_AGENT_URL=http://localhost:8000
PRIVY_APP_ID=<your privy app id>
PRIVY_APP_SECRET=<your privy app secret>
SOMNIA_REACTIVITY_ENABLED=true
SOMNIA_REACTIVITY_WS_URL=ws://api.infra.testnet.somnia.network/ws
SOMNIA_REACTIVITY_HTTP_URL=https://dream-rpc.somnia.network
SOMNIA_STREAMS_ENABLED=true
STREAMS_PUBLISHER_PRIVATE_KEY=<keeper wallet private key>
STREAMS_PUBLISHER_ADDRESS=<keeper wallet address>
```

**`backend/keeper/.env`**
```env
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
PREDICTION_MARKET_ADDRESS=<from Phase 1>
SETTLEMENT_ENGINE_ADDRESS=<from Phase 1>
KEEPER_PRIVATE_KEY=<keeper wallet private key>
KEEPER_POM_BPS=1000
POLLING_INTERVAL=3000
ORACLE_MAX_AGE_SECONDS=30
# Use one of: DIA_ORACLE_URL, PROTOFIRE_ORACLE_URL, or ORACLE_STATIC_PRICE
ORACLE_STATIC_PRICE=<current BTC price as 8-decimal integer, e.g. 10000000000000 for $100k>
```

**`backend/ai-agent/.env`**
```env
OPENAI_API_KEY=<rotated key>
GATEWAY_URL=http://localhost:3001/api
```
> Remove `STARKNET_RPC_URL` and `MARKET_CONTRACT_ADDRESS` — the AI agent reads context via the gateway, not directly from the chain.

**`frontend/.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
NEXT_PUBLIC_CHAIN_ID=50312
NEXT_PUBLIC_PREDICTION_MARKET_ADDR=<from Phase 1>
NEXT_PUBLIC_WBTC_ADDR=<from Phase 1>
NEXT_PUBLIC_PRIVY_APP_ID=<your privy app id>
```

---

## Phase 4 — Frontend Hook Verification

The frontend data layer is now hook-based. All data fetching lives in
`frontend/src/hooks/` — components never call `fetch()` directly.

| Hook | Source | Used by |
|------|--------|---------|
| `useWebSocket(url)` | WS frame → parsed JSON | `usePositions`, `useFeed`, `useLeaderboard` |
| `usePositions(address)` | WS-primary + REST fallback | `TradingDashboard` |
| `useFeed(type, address)` | WS-primary + REST fallback | `MarketFeed` |
| `useLeaderboard()` | WS-primary + REST fallback | `LeaderboardCard` |
| `useMarketDetail(marketId, address?)` | viem multicall → gateway fallback | `TradePanel` |
| `useSignal(marketId?, direction?, stake?)` | Gateway REST (precomputed) | `TradePanel` |
| `usePom(marketId?, direction?, stake?)` | Gateway REST | `TradePanel` |

- [ ] Run `cd frontend && npm install` to pull in the `viem` file-dependency
- [ ] Start the frontend (`npm run dev`) and confirm no TypeScript errors in the hooks
- [ ] Open browser devtools → Network tab: confirm no raw `fetch` calls from components
- [ ] Open devtools → WS tab: verify a WebSocket connection opens for each active channel (positions, feed, leaderboard)
- [ ] Stub gateway offline → feed/leaderboard/positions should show last WS data, not blank

---

## Phase 5 — Start Services (in order)

```bash
# 1. AI Agent
cd backend/ai-agent && pip install -r requirements.txt && uvicorn main:app --port 8000

# 2. Indexer (starts syncing from START_BLOCK)
cd backend/indexer && npm run build && npm start

# 3. Gateway
cd backend/gateway && npm run build && npm start

# 4. Keeper (automates lock + settle)
cd backend/keeper && npm run build && npm start

# 5. Frontend (install first to pick up viem file-dependency)
cd frontend && npm install && npm run dev
```

- [ ] All 5 processes start without errors
- [ ] Indexer logs: `[Indexer] Starting Somnia projector from block <n>`
- [ ] Gateway logs: `BitDrum Gateway running on http://localhost:3001`
- [ ] Keeper logs: polling interval started
- [ ] AI Agent: `GET http://localhost:8000/health` returns `{"status": "ok"}`
- [ ] Gateway health: `GET http://localhost:3001/health` returns `{"status": "healthy"}`

---

## Phase 6 — Smoke Test

- [ ] Open frontend, connect wallet (MetaMask on Somnia Shannon)
- [ ] Approve WBTC spend & open a market (UP or DOWN, 30s timeframe)
- [ ] Second wallet joins the same market
- [ ] Keeper auto-locks after join window expires
- [ ] Keeper auto-settles after expiry
- [ ] Winning wallet can see "Claim" button and claims payout
- [ ] Leaderboard shows both traders ranked
- [ ] AI signal appears on the trade panel before settlement
- [ ] WS push updates (no manual refresh needed) after each market state change

---

## Known Gaps (not blocking, track for later)

| Gap | Impact | Fix |
|-----|--------|-----|
| No DIA/Protofire oracle on testnet | Keeper needs `ORACLE_STATIC_PRICE` fallback | Integrate a live price feed later |
| `next.config.ts` transpiles `pyth-starknet-js` | Dead dependency, wastes build time | Remove from `transpilePackages` |
| No `.env.example` files committed | Onboarding friction | Add after first successful deploy |
| Keeper still uses ethers (not viem) | Inconsistency, not a bug | Migrate when touching keeper next |
| No docker-compose | Manual startup order required | Add when moving to hosted infra |
