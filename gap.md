# BitDrum Gap Analysis (Operational Readiness)

This document is the definitive list of unimplemented or incomplete features based on the `bitdrum-system-overview.md` and `implementation_guide.md`, compared against the actual codebase state as of March 22, 2026.

## 🔴 CRITICAL (Blocks Mainnet Launch/Security)
- [x] **Oracle Signature Verification**: `SettlementEngine.cairo` now cross-checks keeper-submitted Pragma snapshots against the configured Starknet Pragma oracle response before settlement.
- [x] **Mock Price Removal**: `backend/keeper/src/services/settlement.ts` now fetches live BTC/USD data from Pragma instead of using a hardcoded mock price.
- [x] **Keeper Robustness**: The keeper now persists per-market progress and recovery state so restarts do not lose lock/settlement context.

## 🟠 HIGH (Core Logic Gaps)
- [x] **Composite Score & Tier Logic**: The indexer now computes trader stats, composite scores, tiers, and AI signal accuracy feedback from indexed settlements.
- [x] **Dynamic POM Multiplier**: `TradePanel.tsx` now fetches live preview and market POM values from the AI agent instead of hardcoding 10%.
- [x] **AI Signal Persistence**: The AI Agent now persists generated signals to `ai_signals`, enabling the accuracy feedback loop.

## 🟡 MAJOR FRONTEND INTEGRATION GAPS (UX Blocks)
- [x] **AI Signal Display UI**: The `TradePanel` now renders AI rationale, confidence, direction, and POM context for preview and live markets.
- [x] **Active Predictions & PnL**: The gateway now exposes `/api/positions/:address`, and the dashboard renders real positions, win rate, and PnL.
- [x] **Claiming Wins UI**: The dashboard now includes claim actions wired to the `claim()` contract entrypoint.
- [x] **Joining Existing Markets**: Users can now select markets from the feed and join them from the execution panel.
- [x] **Dynamic Stake Logic**: Market open flows now fetch dynamic POM quotes before submitting transactions.

## 🟡 MEDIUM (Social & Economy)
- [x] **Social Following API**: The gateway now supports follow/unfollow and feed endpoints, and the frontend consumes them.
- [x] **Reputation Badges**: Leaderboard tiers and trader badges are now rendered in the live social feed and leaderboard UI.

## 🔵 LOW (Polish & Scalability)
- [x] **AVNU Paymaster**: `frontend/src/utils/starkzap.ts` now supports optional AVNU-sponsored execution via `NEXT_PUBLIC_AVNU_PAYMASTER_URL`.
- [x] **Real-time Charts**: `PriceChart.tsx` already uses Lightweight Charts with live BTC/USD data from Pyth/Hermes.
- [x] **WebSocket Push**: The gateway now exposes `/ws` live streams for markets, leaderboard, feed, and positions, and the frontend consumes them.

---

### Implementation Priority Order:
1.  **Security & Oracle**: Signature verification in Cairo + real Pragma fetch in Keeper.
2.  **Reputation System**: Indexer stats calculation + `/api/positions` endpoint.
3.  **Intelligence UI**: AI Signal Display in `TradePanel` + Dynamic POM fetch.
4.  **Economic Polish**: Claim UI + Social Following endpoints.
