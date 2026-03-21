# BitDrum API Gateway

The API Gateway is the primary entry point for the frontend, providing a unified REST and WebSocket interface for all protocol data and services.

## Role in the System
- **Unified API**: Aggregates data from the Social Indexer, AI Agent, and Starknet.
- **Subscription Gating**: Verifies a user's subscription tier on-chain before serving premium signal content.
- **Proactive Alerts**: Distributes push notifications for followed traders and high-confidence signals.

## Stack
- Node.js / Express
- Redis (Session/Status Cache)
- Starknet.js (Read-only state checks)
