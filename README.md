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
3. Check individual folder `README.md` and `implementation.md` files for component-specific details.

---

## Tech Stack

- **Blockchain**: Starknet (Cairo)
- **SDK**: Starkzap (Auth, Token Ops, Paymaster)
- **Frontend**: Next.js 14, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, TypeScript, Python (FastAPI/AI)
- **Database**: PostgreSQL, Redis
