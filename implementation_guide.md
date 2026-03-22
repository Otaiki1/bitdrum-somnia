# BitDrum Implementation Guide

This guide provides a step-by-step roadmap for executing the BitDrum project within this repository. 

## Table of Contents
1. [Phase 1: Smart Contract Foundation (Cairo/Starknet)](#phase-1-smart-contract-foundation)
2. [Phase 2: Backend Infrastructure & Automation](#phase-2-backend-infrastructure--automation)
3. [Phase 3: AI Agent Layer (Signal & POM)](#phase-3-ai-agent-layer)
4. [Phase 4: Frontend Development (Next.js)](#phase-4-frontend-development)
5. [Phase 5: Integration, Testing & Deployment](#phase-5-integration-testing--deployment)

---

## Phase 1: Smart Contract Foundation
**Goal**: Deploy the core protocol logic on Starknet Sepolia.

### 1.1 Environment Setup
- Initialize the `contracts/` directory using Scarb and Starknet Foundry.
- Configure `Scarb.toml` with necessary dependencies (e.g., OpenZeppelin for ERC20/Access Control).

### 1.2 Core Contracts Implementation
- **Prediction Market**: Implement state machine (OPEN -> LOCKED -> SETTLED -> CLAIMABLE), market opening, and joining logic.
- **Settlement Engine**: Integrate **Pragma Oracle** for price pulls. Implement binary outcome logic (UP/DOWN/DRAW).
- **Liquidity Vault**: Implement counterparty logic and exposure management.
- **Treasury**: Set up fee collection and allocation logic (40% Vault, 35% AI, 25% Dev).

### 1.3 Social & Subscription Contracts
- **Leaderboard Registry**: Create an append-only registry for on-chain trader stats.
- **Signal Subscription**: Implement tiered access gating (Free/Pro/Elite) and revenue distribution.

### 1.4 Testing
- Write comprehensive Unit and Integration tests using `snforge`.
- Verify oracle integration using faked/mocked price attestations.

---

## Phase 2: Backend Infrastructure & Automation
**Goal**: Build the services that keep the protocol running and the UI responsive.

### 2.1 Keeper Bot (Node.js/TypeScript)
- Polling mechanism to check for expired markets every 3 seconds.
- Integrated Starkzap Server SDK for submitting settlement transactions.
- Pragma Oracle client for fetching signed price attestations.

### 2.2 Social Indexer (Node.js/TypeScript)
- Set up a PostgreSQL database to store enriched trader profiles and history.
- Implement an event listener for Starknet using `starknet.js`.
- Create a REST/WebSocket API to serve leaderboard data to the frontend.

### 2.3 API Gateway
- Unified entry point for the frontend.
- Implement subscription tier gating by checking on-chain state.

---

## Phase 3: AI Agent Layer (Signal & POM)
**Goal**: Implement the "Intelligent" part of the protocol.

### 3.1 Data Ingestion Pipeline
- Collect real-time BTC/USD price data and on-chain trade events.
- Aggregate "Top Trader" positioning based on the Leaderboard Registry.

### 3.2 Signal Inference Engine (Python/FastAPI)
- Build a time-series classifier for directional bias (BULLISH/BEARISH/NEUTRAL).
- Integrate an LLM (e.g., OpenAI) for generating natural language rationales.
- Implement the **Probable Outcome Multiplier (POM)** logic (5% to 70% profit range).

---

## Phase 4: Frontend Development (Next.js)
**Goal**: Create a premium, high-performance UI for traders.

### 4.1 Framework & Styling
- Initialize `frontend/` with Next.js 14 (App Router).
- Set up Tailwind CSS and shadcn/ui for a modern "Glassmorphism" aesthetic.

### 4.2 Starkzap Integration
- Implement **Authentication** via Cartridge Controller (social login and passkeys).
- Integrate **Token Operations** for sBTC staking and balance checks.
- Set up **AVNU Paymaster** for gasless (pay-in-sBTC) transactions.

### 4.3 Trading & Social UI
- **Live Market Feed**: Real-time status updates using WebSockets.
- **TradingView Charts**: Lightweight charts for BTC/USD price action.
- **Trader Profiles**: Performance stats, badges, and social following.
- **Signal Cards**: Confidence scores, rationales, and historical accuracy.

---

## Phase 5: Integration, Testing & Deployment
**Goal**: Launch on Mainnet.

### 5.1 End-to-End Testing
- Deploy all components to **Starknet Sepolia**.
- Perform full user flow testing (Controller Login -> Deposit -> Stake -> Settle -> Claim).

### 5.2 Deployment
- Containerize all services using **Docker**.
- Set up CI/CD pipelines for contracts and frontend.
- Deploy backend services to a cloud provider (e.g., AWS/GCP).

### 5.3 Launch
- Perform security audit of Cairo contracts.
- Move to **Starknet Mainnet** and monitor the Liquidity Vault performance.
