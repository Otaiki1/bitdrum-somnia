# BitDrum

**The Intelligent Decentralized Prediction Protocol**
*Built on Starknet · Powered by Starkzap SDK · Augmented by AI*

---

## Overview

BitDrum is a next-generation decentralized prediction protocol where users stake on Bitcoin's short-term price direction (UP or DOWN). It combines on-chain transparency with AI-driven signals and a dynamic payout engine to provide a premium trading experience.

### Key Pillars
- **AI Signal Agent**: Real-time directional signals with confidence scores and rationales.
- **Dynamic Payout Engine**: POM (Probable Outcome Multiplier) providing fixed profits between 5% and 70%.
- **Social Reputation Layer**: On-chain leaderboard and trader profiles.

---

## Project Structure

- `contracts/`: Cairo/Starknet smart contracts (Core Logic, Vault, Treasury, Leaderboard).
- `backend/`:
    - `keeper/`: Automation bot for market settlement.
    - `indexer/`: On-chain event processing and social data indexing.
    - `ai-agent/`: Signal inference and POM engine (Python/FastAPI).
    - `gateway/`: Unified API entry point and subscription gating.
- `frontend/`: Next.js web application and React Native mobile app.

---

## Getting Started

1. Read the [BitDrum System Overview](bitdrum-system-overview.md) for a deep dive into the architecture.
2. Follow the [Implementation Guide](implementation_guide.md) for a step-by-step roadmap.
3. Use the manual demo runbook below to boot the full local stack.
4. Check individual folder `README.md` files for component-specific details.

## Manual Demo Runbook

BitDrum's current demo path is Cartridge-only on the frontend.

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL 16+
- A Starknet Sepolia RPC endpoint
- An Apibara `DNA_TOKEN`
- Sepolia contract addresses from [deployment_sepolia.json](contracts/bitdrum_starknet/deploy/deployment_sepolia.json)

### Shared Postgres

The indexer and gateway must point at the same PostgreSQL database for the demo to work correctly.

Example local connection string:

```env
postgresql://0t41k1@localhost:5432/bitdrum
```

### Required Environment Files

`backend/indexer/.env`

```env
DNA_TOKEN=your_apibara_token
POSTGRES_CONNECTION_STRING=postgresql://0t41k1@localhost:5432/bitdrum
STARKNET_RPC_URL=https://starknet-sepolia.public.blastapi.io
VAULT_ADDRESS=0x...
```

`backend/gateway/.env`

```env
PORT=3001
AI_AGENT_URL=http://localhost:8000
POSTGRES_CONNECTION_STRING=postgresql://0t41k1@localhost:5432/bitdrum
STARKNET_RPC_URL=https://starknet-sepolia.public.blastapi.io
SUBSCRIPTION_CONTRACT_ADDRESS=0x...
WS_REFRESH_MS=3000
```

`backend/keeper/.env`

```env
STARKNET_RPC_URL=https://starknet-sepolia.public.blastapi.io
MARKET_CONTRACT_ADDRESS=0x...
SETTLEMENT_ENGINE_ADDRESS=0x...
PRAGMA_ORACLE_ADDRESS=0x...
KEEPER_ADDRESS=0x...
KEEPER_PRIVATE_KEY=0x...
POLLING_INTERVAL=3000
SETTLEMENT_DELAY_SECONDS=60
ATTESTATION_MAX_AGE_SECONDS=30
KEEPER_STATE_FILE=data/keeper-state.json
```

`backend/ai-agent/.env`

```env
GATEWAY_URL=http://localhost:3001/api
OPENAI_API_KEY=optional
```

`frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws
NEXT_PUBLIC_CARTRIDGE_URL=https://x.cartridge.gg
NEXT_PUBLIC_CARTRIDGE_PRESET=bitdrum
NEXT_PUBLIC_AVNU_PAYMASTER_URL=
```

### Install Dependencies

```bash
cd backend/indexer && npm install
cd ../gateway && npm install
cd ../keeper && npm install
cd ../ai-agent && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
cd ../../frontend && npm install
```

### Start Order

Open five terminals and run the services in this order.

1. Indexer

```bash
cd /Users/0t41k1/Documents/bitdrum/backend/indexer
npm run db:migrate
npm run build
npm run start
```

2. AI agent

```bash
cd /Users/0t41k1/Documents/bitdrum/backend/ai-agent
source .venv/bin/activate
python3 main.py
```

3. Gateway

```bash
cd /Users/0t41k1/Documents/bitdrum/backend/gateway
npm run build
npm start
```

4. Keeper

```bash
cd /Users/0t41k1/Documents/bitdrum/backend/keeper
npm run build
npm start
```

5. Frontend

```bash
cd /Users/0t41k1/Documents/bitdrum/frontend
npm run dev
```

### Health Checks

- Frontend: [http://localhost:3000](http://localhost:3000)
- Gateway: [http://localhost:3001/health](http://localhost:3001/health)
- AI agent: [http://localhost:8000/health](http://localhost:8000/health)

### Demo Notes

- The frontend connects through Cartridge Controller. No additional wallet auth credentials are required in the frontend env file.
- The indexer must finish replaying enough history before the gateway and frontend show market data.
- The keeper writes progress to `backend/keeper/data/keeper-state.json` by default.
- If `NEXT_PUBLIC_AVNU_PAYMASTER_URL` is unset, the connected controller wallet must hold STRK for gas on Sepolia.

---

## Tech Stack

- **Blockchain**: Starknet (Cairo)
- **SDK**: Starkzap (Cartridge onboarding, Token Ops, Paymaster)
- **Frontend**: Next.js 16, Tailwind CSS
- **Backend**: Node.js, TypeScript, Python (FastAPI/AI)
- **Database**: PostgreSQL
