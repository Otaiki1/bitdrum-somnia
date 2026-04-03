# BitDrum

**The Intelligent Decentralized Prediction Protocol**  
*Built on Somnia · Powered by Ethers.js · Augmented by AI*

---

## 🚀 Status: Active Migration to Somnia

BitDrum is migrating from **Starknet** to **Somnia EVM** for production launch. This project now contains a **complete implementation roadmap** with 120+ steps across 5 phases, designed to deliver a fully functional protocol in 6 weeks.

**Current Phase**: Planning & Documentation ✅  
**Next Phase**: Smart Contract Development (Phase 1)

---

## Overview

BitDrum is a trustless Bitcoin price prediction protocol that merges on-chain transparency with AI-driven trading intelligence, a capped dynamic payout engine, and a social reputation layer — giving every user the edge of a seasoned trader without requiring them to be one.

### Core Features
- **Trustless Predictions**: Users stake WBTC on BTC price direction (UP/DOWN) for 30s/1m/5m durations
- **AI Signal Agent**: Analyzes top-performing traders and surfaces actionable directional signals
- **Dynamic Payout Engine**: Fixed outcomes with AI-determined profits (5–70%)
- **Social Reputation Layer**: On-chain leaderboard ranking traders by accuracy, P&L, and consistency

### Key Pillars
- **AI Signal Agent**: Real-time directional signals with confidence scores and rationales
- **Dynamic Payout Engine**: POM (Probable Outcome Multiplier) providing fixed profits between 5% and 70%
- **Social Reputation Layer**: On-chain leaderboard and trader profiles

---

## 📚 Documentation Suite

**Start here for implementation**:

| Document | Purpose | Read Time |
|----------|---------|-----------|
| [**IMPLEMENTATION_COMPLETE.md**](IMPLEMENTATION_COMPLETE.md) | Entry point & summary | 10 min |
| [**IMPLEMENTATION_PLAN.md**](IMPLEMENTATION_PLAN.md) | Master roadmap (120+ steps) | 45 min |
| [**QUICK_START.md**](QUICK_START.md) | Team onboarding & daily workflow | 15 min |
| [**DEPLOYMENT_ADDRESSES.md**](DEPLOYMENT_ADDRESSES.md) | Contract address tracking | 5 min |
| [**TECHNICAL_GLOSSARY.md**](TECHNICAL_GLOSSARY.md) | Terminology & reference | 20 min |
| [**bitdrum-somnia-architecture.md**](bitdrum-somnia-architecture.md) | Complete system design | 60 min |

---

## Project Structure

```
bitdrum/
├── contracts/                           # Phase 1: Solidity Smart Contracts
│   ├── foundry.toml
│   ├── src/
│   │   ├── PredictionMarket.sol         # Core market logic
│   │   ├── SettlementEngine.sol         # Oracle settlement
│   │   ├── LiquidityVault.sol           # Counterparty funding
│   │   ├── Treasury.sol                 # Fee allocation
│   │   ├── LeaderboardRegistry.sol      # Trader stats
│   │   └── SubscriptionsContract.sol    # Signal tier gating
│   ├── test/                            # Forge tests (90%+ coverage)
│   └── script/                          # Deployment scripts
│
├── backend/                             # Phase 2: Microservices
│   ├── keeper/                          # Settlement automation (3s polling)
│   ├── indexer/                         # Event listener + leaderboard compute
│   ├── ai-agent/                        # Signal inference + POM engine
│   ├── gateway/                         # REST + WebSocket API
│   └── subscription-distributor/        # Monthly ORACLE reward payout
│
├── frontend/                            # Phase 3: Next.js UI
│   ├── app/                             # Pages (market feed, leaderboard, profiles)
│   ├── components/                      # Trading UI, charts, signals, leaderboard
│   ├── lib/                             # Wagmi, Privy, Ethers.js config
│   └── public/                          # Static assets
│
└── tests/                               # Phase 4: Integration Tests
    └── smoke.test.ts                    # E2E smoke tests (10 test cases)
```

---

## Getting Started

### For Developers

**New to the project?** Start here:

1. **5 min**: Read [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)
2. **15 min**: Read [QUICK_START.md](QUICK_START.md) — setup & daily workflow
3. **30 min**: Clone repo and setup environment (see Prerequisites below)
4. **Your role**:
   - **Contract Dev**: Follow [IMPLEMENTATION_PLAN.md Section 3](IMPLEMENTATION_PLAN.md) (Phase 1)
   - **Backend Dev**: Follow [IMPLEMENTATION_PLAN.md Section 4](IMPLEMENTATION_PLAN.md) (Phase 2)
   - **Frontend Dev**: Follow [IMPLEMENTATION_PLAN.md Section 5](IMPLEMENTATION_PLAN.md) (Phase 3)

### Prerequisites

**All Developers**:
- [ ] Node.js 20+ installed
- [ ] Git configured with SSH key
- [ ] GitHub/GitLab account access

**Contract Developers**:
- [ ] Foundry installed: `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- [ ] Solidity language extension in IDE

**Backend Developers**:
- [ ] Python 3.11+ installed
- [ ] PostgreSQL 16+ running locally
- [ ] Redis running locally

**Frontend Developers**:
- [ ] VS Code with JavaScript/TypeScript support
- [ ] Familiarity with React and Next.js

---

## Phase 1: Smart Contract Development

### Setup Foundry

```bash
cd contracts
forge init . --force
forge install OpenZeppelin/openzeppelin-contracts --no-commit
```

### Configure Somnia Testnet (.env)

```env
PRIVATE_KEY=0x...
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
CHAIN_ID=50312
```

### Deploy to Somnia Shannon Testnet

```bash
forge script script/Deploy.s.sol \
  --rpc-url $SOMNIA_RPC_URL \
  --broadcast --verify
```

**Expected**: All 6 contracts deployed to Shannon (Chain ID 50312), addresses recorded in [DEPLOYMENT_ADDRESSES.md](DEPLOYMENT_ADDRESSES.md)

---

## Phase 2: Backend Services

### Start Order (5 Terminals)

```bash
# Terminal 1: Social Indexer
cd backend/indexer && npm install && npm run dev

# Terminal 2: AI Agent
cd backend/ai-agent && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python main.py

# Terminal 3: API Gateway
cd backend/gateway && npm install && npm run dev

# Terminal 4: Keeper Bot
cd backend/keeper && npm install && npm run dev

# Terminal 5: Subscription Distributor
cd backend/subscription-distributor && npm install && npm run dev
```

### Health Checks

```bash
curl http://localhost:3001/api/health     # Gateway
curl http://localhost:8000/health         # AI Agent
curl http://localhost:5432               # PostgreSQL
redis-cli ping                            # Redis
```

---

## Phase 3: Frontend Development

```bash
cd frontend
npm install
npm run dev  # Opens http://localhost:3000
```

**Connect wallet**: Privy (social login) or MetaMask  
**Testnet**: Somnia Shannon (Chain ID 50312)

---

## Phase 4: Integration & Testing

```bash
# Run full-stack smoke tests
npm run test:smoke

# Expected: All 10 tests passing in <20 seconds
```

**Smoke Test Coverage**:
- [ ] User can open a market
- [ ] User can join a market
- [ ] Keeper auto-settles expired market
- [ ] Winners claim correct payout
- [ ] Loser stake absorbed by vault
- [ ] Leaderboard tier computed correctly
- [ ] Signal accuracy logged on settlement
- [ ] API Gateway gates Signal Pro correctly
- [ ] WBTC subscription payment processed
- [ ] ORACLE reward distributed monthly

---

## Phase 5: Security & Launch

- [ ] Security audit scheduled
- [ ] Smart contracts deployed to **Somnia Mainnet** (Chain ID 5031)
- [ ] All backend services in production
- [ ] Frontend deployed to Vercel (mainnet)
- [ ] Production monitoring & alerts active

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Blockchain** | Somnia EVM (Chain 5031) | 1M+ TPS, sub-second finality |
| **Smart Contracts** | Solidity ^0.8.20 | Foundry for testing & deployment |
| **Contract Interaction** | Ethers.js v6 + Viem | Type-safe contract calls |
| **Wallet (New Users)** | Privy | Social login + EVM wallet |
| **Wallet (Crypto)** | MetaMask, RainbowKit | Native wallet connection |
| **Chain Interaction** | Wagmi | React hooks for web3 |
| **Frontend** | Next.js 14, Tailwind CSS | TypeScript, App Router |
| **Backend API** | Node.js, Express | REST + WebSocket |
| **Signals & POM** | Python, FastAPI | ONNX inference |
| **Database** | PostgreSQL | Trader stats, leaderboard |
| **Cache** | Redis | API performance |
| **RPC Endpoints** | Somnia Infra RPC | Mainnet & testnet |
| **Oracle (Primary)** | DIA Price Feeds | BTC/USD feeds |
| **Oracle (Fallback)** | Protofire Feeds | Price feed redundancy |
| **Account Abstraction** | ERC-4337 v0.7 | Gasless transactions |
| **Deployment** | Foundry, Gnosis Safe | Secure contract deployment |

---

## Key Differences: Somnia vs Starknet

| Feature | Starknet (Legacy) | Somnia (Production) |
|---------|------------------|-------------------|
| **Language** | Cairo | Solidity ^0.8.20 |
| **Framework** | Starknet Foundry | Foundry (same tooling) |
| **SDK** | Starkzap | Ethers.js v6 + Wagmi |
| **Wallet (New)** | Privy + Starkzap | Privy (EVM native) |
| **Wallet (Existing)** | Argent / Braavos | MetaMask / RainbowKit |
| **AA** | Starknet native | ERC-4337 v0.7 |
| **Staking Token** | sBTC | WBTC (ERC-20) |
| **Oracle** | Pragma Oracle | DIA + Protofire |
| **Gas Token** | STRK | SOMI |
| **Testnet** | Starknet Sepolia | Somnia Shannon (50312) |
| **Mainnet** | Starknet Mainnet | Somnia EVM (5031) |

---

## Environment Variables by Phase

### Phase 1: Contracts (Testnet)

```env
# Deployment
PRIVATE_KEY=0x...
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
CHAIN_ID=50312

# Oracles
DIA_ORACLE_ADDR=0x...
PROTOFIRE_ORACLE_ADDR=0x...
```

### Phase 2: Backend (Testnet)

```env
# Keeper Bot
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
KEEPER_PRIVATE_KEY=0x...
SETTLEMENT_ENGINE_ADDR=0x...
DIA_ORACLE_ADDR=0x...
PROTOFIRE_ORACLE_ADDR=0x...

# Indexer
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
DATABASE_URL=postgres://user:password@localhost:5432/bitdrum
REDIS_URL=redis://localhost:6379

# AI Agent
DATABASE_URL=postgres://user:password@localhost:5432/bitdrum
REDIS_URL=redis://localhost:6379
GATEWAY_URL=http://localhost:3001/api

# Gateway
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
SUBSCRIPTIONS_ADDR=0x...
DATABASE_URL=postgres://user:password@localhost:5432/bitdrum
REDIS_URL=redis://localhost:6379
```

### Phase 3: Frontend (Testnet)

```env
NEXT_PUBLIC_CHAIN_ID=50312
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
NEXT_PUBLIC_PREDICTION_MARKET_ADDR=0x...
NEXT_PUBLIC_WBTC_ADDR=0x...
NEXT_PUBLIC_PRIVY_APP_ID=...
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=...
```

---

## Production Deployment (Mainnet)

For **Phase 5** (mainnet deployment), see [IMPLEMENTATION_PLAN.md Section 7](IMPLEMENTATION_PLAN.md):

1. Deploy contracts to Somnia Mainnet (Chain 5031) via Gnosis Safe
2. Update environment variables to point to mainnet RPC
3. Deploy backend services to production infrastructure
4. Deploy frontend to Vercel (mainnet configuration)
