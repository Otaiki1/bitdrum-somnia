# BitDrum Backend: Integration Gap Analysis

This document outlines the remaining steps to fully integrate the BitDrum backend and prepare it for production.

## 1. Current State Summary
- **AI Agent**: ReAct Reasoning loop & memory system implemented.
- **Indexer**: Event listening loop and database handlers ready.
- **Gateway**: Core structure and subscription gating implemented.
- **Keeper**: Polling engine and settlement logic with retry mechanisms ready.

---

## 2. Integration Checklist (Remaining Steps)

### Phase A: Smart Contract Deployment
To provide real data to the backend, the following must be deployed to **Starknet Sepolia**:
- [ ] **PredictionMarket.cairo**: The core protocol contract.
- [ ] **SignalSubscription.cairo**: Tiered gating for AI signals.
- [ ] **LeaderboardRegistry.cairo**: Record of trader performances.

### Phase B: API Keys & Secrets
The following environment variables must be populated in each service's `.env` file:
- **AI Agent**:
  - `OPENAI_API_KEY`: Required for the ReAct reasoning logic.
- **Indexer/Keeper/Gateway**:
  - `STARKNET_RPC_URL`: Endpoint for Sepolia (e.g., Infura, Blast, or Nethermind).
  - `MARKET_CONTRACT_ADDRESS`: Deployed address of the Prediction Market.
  - `SUBSCRIPTION_CONTRACT_ADDRESS`: Deployed address of the Subscription contract.
  - `KEEPER_ADDRESS` & `KEEPER_PRIVATE_KEY`: Account for the automated bot.
  - `DATABASE_URL`: Connection string for the PostgreSQL database.

### Phase C: Logic Refinement
- [ ] **Oracle Integration**: Replace mocked price calls with the real **Pragma Oracle** SDK.
- [ ] **WebSocket Streams**: Implement `Socket.io` or `ws` in the Gateway for live frontend updates.
- [ ] **Reputation Logic**: Finalize the consistency/composite score algorithm in the Indexer.

### Phase D: Infrastructure & Launch
- [ ] **Docker Compose**: Create a root-level `docker-compose.yml` to orchestrate all services.
- [ ] **Database Migrations**: Set up a tool like `Prisma` or `node-pg-migrate` for the Indexer.
- [ ] **CI/CD**: Configure GitHub Actions for automated builds and testing.

---

## 3. Step-by-Step Integration Workflow

1. **Deploy Contracts**: Use Starknet Foundry (`sncast`) to deploy contracts.
2. **Update Addresses**: Paste contract addresses into the `.env` files of all 4 backend services.
3. **Initialize DB**: Run `schema.sql` on your Postgres instance.
4. **Boot Services**: Run the indexer first, then the gateway, then the agent.
5. **Frontend Link**: Connect the Next.js frontend to the Gateway URL (`PORT 3001`).
