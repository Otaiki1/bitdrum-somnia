# BitDrum

**Decentralized BTC price prediction markets on the Somnia Network.**

BitDrum is a high-speed prediction market protocol that allows users to stake native STT on Bitcoin's short-term price movements. Blending decentralized finance with AI, BitDrum introduces automated market matching, real-time data streaming, and predictive modeling in a fully on-chain ecosystem.

---

## ⚡ Features

* **Peer-to-Pool Matching**: Every user stake is matched 1:1 by the `LiquidityVault` on the opposite side.
* **Instant Settlement**: Backend Keeper services listen to on-chain DIA oracles and automatically determine UP/DOWN/Draw outcomes.
* **Probable Outcome Multiplier (POM)**: A dynamic payout engine that awards up to 70% surplus profit based on vault depth and AI confidence.
* **AI Signal Agent**: A Python/FastAPI service that analyzes top trader activity and surfaces directional signals directly into the trading UI.
* **Live Leaderboards**: Fully on-chain stats synchronized in real-time to the frontend.

---

## 🏗 Architecture

BitDrum relies on a sophisticated hybrid architecture: EVM smart contracts on Somnia handle all funds and rules, while a suite of Node.js and Python microservices handle real-time user experiences and automation.

* **Smart Contracts (`/contracts`)**: Solidity ^0.8.20. Manages markets, vaults, treasuries, and subscriptions. Native STT is the core currency.
* **Gateway API (`/backend/gateway`)**: Express REST and WebSocket. Handles client requests, feeds live reactivity events directly to the UI without polling delays.
* **Keeper (`/backend/keeper`)**: Node.js automated settlement bot. Reads DIA oracle data and forcefully locks/settles markets precisely when their timeframes expire.
* **Indexer (`/backend/indexer`)**: Uses `viem` to listen to Somnia blockchain events and syncs state to PostgreSQL.
* **AI Agent (`/backend/ai-agent`)**: A fast Python service connected to OpenAI. Analyzes context and posts trade signals.
* **Frontend (`/frontend`)**: Next.js React application. Features an immersive, responsive terminal interface.

---

## 🚀 Local Development Guide

### 1. Prerequisites
- Foundry (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- Node.js (v20+) & Python (3.11+)
- PostgreSQL (v16+)
- Deployer wallet funded with testnet STT

### 2. Smart Contract Deployment
```bash
cd contracts
export PRIVATE_KEY=0x<deployer_key>

forge script script/Deploy.s.sol \
  --rpc-url https://dream-rpc.somnia.network \
  --broadcast --verify
```
*Note: Make sure to record the deployed addresses (PredictionMarket, SettlementEngine, etc.) for your `.env` files.*

### 3. Database Migration
```bash
cd backend/indexer
npm install
npm run db:migrate
```

### 4. Running the Microservices
*Ensure all `.env` files are configured per their respective directories.*

**Start the AI Agent:**
```bash
cd backend/ai-agent
pip install -r requirements.txt
uvicorn main:app --port 8000
```

**Start Node Environments in parallel tabs:**
```bash
# Gateway
cd backend/gateway && npm install && npm run dev

# Indexer
cd backend/indexer && npm install && npm run dev

# Keeper
cd backend/keeper && npm install && npm run dev
```

**Start the Frontend UI:**
```bash
cd frontend
npm install
npm run dev
```

---

## ☁️ Cloud Deployment

When taking BitDrum to a production or testnet live environment, the backend services should be deployed as isolated microservices:

1. **Frontend (Vercel / Render)**
   - Deployed as a standard Next.js application.
   - Point `NEXT_PUBLIC_API_URL` to your live Gateway (e.g., `https://api.bitdrum.com/api`).
2. **Gateway (Render Web Service)**
   - Deployed as a **Web Service**.
   - Requires exposing standard HTTP ports to serve REST and WebSockets.
3. **Keeper & Indexer (Render Background Workers)**
   - **Important**: Must be deployed as **Background Workers**, NOT Web Services.
   - These are continuous loops. Because they do not bind to HTTP ports, deploying them as Web Services will result in health-check timeouts and crashes.

---

## ⛓ Network Specifications

| Parameter | Somnia Shannon (Testnet) | Somnia Mainnet |
|-----------|-------------------------|----------------|
| **Chain ID** | `50312` | `5031` |
| **RPC URL** | `https://dream-rpc.somnia.network` | `https://api.infra.mainnet.somnia.network` |
| **Explorer**| `https://shannon-explorer.somnia.network`| `https://explorer.somnia.network` |
| **Currency**| `STT` (18 Decimals) | `SOMI` (18 Decimals) |
| **DIA Oracle**| `0x9206296Ea3aEE3E6bdC07F7AaeF14DfCf33d865D`| `0xbA0E0750A56e995506CA458b2BdD752754CF39C4`|

---

## 🔐 Security & Operations

* **Oracle Reliability**: The keeper reads BTC/USD values purely on-chain via the DIA Oracle (`getValue("BTC/USD")`). The frontend display relies on the Pyth Hermes streaming network for millisecond visual fidelity.
* **Liquidity Safeguards**: The `LiquidityVault` contract ensures users cannot bet more than the counter-party pool has capacity to pay out.

---

## 📄 License
BitDrum Protocol is open-sourced under the MIT License.
