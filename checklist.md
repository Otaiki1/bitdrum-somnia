# BitDrum Sepolia Go-Live Checklist

Last reviewed: April 1, 2026

## Current Read

BitDrum is close to a usable public Sepolia test stack. The core trading loop exists across contracts, indexer, gateway, keeper, AI agent, and frontend, and the repo builds/tests cleanly. The main remaining work is not “build the protocol from scratch”; it is alignment, hardening, and operations.

Three new product directions have been added since the last review:
1. **User Wallet Dashboard** — a dedicated funding and balance interface so users deposit once and trade seamlessly without per-trade wallet prompts.
2. **USD-denominated display** — all balances and P&L shown in USD regardless of the underlying token (STRK or sBTC).
3. **Multi-token support** — users can fund with multiple tokens; the protocol normalises to the correct on-chain asset behind the scenes.

These additions also motivate a performance pass: fewer round-trips, a trade cooldown that keeps the UI in sync with on-chain state, and simplified flows throughout.

## Starkzap Bounty — Integration Depth Audit & Ship Plan

**Context:** WPL/Starknet Developer Bounty — $3,000 pool, $1,000/week, top 2 projects per week.
Judging Fridays: **April 3 · April 10 · April 17**. Week 1 is in **48 hours**.
Criterion: meaningful Starkzap integration, real usefulness, Sepolia deployment, public demo.

### What Starkzap BitDrum Currently Uses

| Feature | SDK Surface | Status |
|---|---|---|
| Cartridge wallet connect | `sdk.connectCartridge()` | ✅ Live |
| Account deployment | `wallet.ensureReady()` | ✅ Live |
| Transaction execution | `wallet.execute([...calls])` | ✅ Live |
| AVNU Paymaster (gasless) | `new StarkZap({ paymaster })` | ⚠️ Wired but conditional on env var — not always active |
| Token balance read | `sdk.tokens.erc20.balance()` | ❌ Not used — balances are read from indexer DB, not via SDK |
| Token transfer | `sdk.tokens.erc20.transfer()` | ❌ Not used |
| Swaps (AVNU/Ekubo) | `sdk.swap.*` | ❌ Not used |
| Native STRK staking | `sdk.staking.*` | ❌ Not used |
| Bridge (ETH → Starknet) | `sdk.bridge.*` | ❌ Not used |
| Lending (Vesu) | `sdk.lending.*` | ❌ Not used |
| DCA (recurring buys) | `sdk.dca.*` | ❌ Not used |
| Privy signer | `PrivySigner` | ❌ Not used |
| Confidential transfers | `sdk.confidential.*` | ❌ Not used |

**Gap summary:** BitDrum uses Starkzap only for wallet auth and raw tx execution. The financial feature modules — the parts that differentiate Starkzap from a bare starknet.js wrapper — are completely untouched. A judge would currently see a thin integration.

### Starkzap Integration Target Map

Each Starkzap feature below has a direct BitDrum product need. These are not superficial add-ons — each one removes a real user friction point:

| Starkzap Feature | BitDrum Use Case | User Benefit |
|---|---|---|
| `sdk.tokens.erc20.balance()` | Live STRK balance in Wallet Dashboard | User sees real on-chain balance without leaving the app |
| `sdk.tokens.erc20.transfer()` | Deposit to / withdraw from BitDrum escrow | Single SDK call replaces manual ERC20 approve+transfer construction |
| AVNU Paymaster (always-on) | Gasless trade execution for all users | No STRK gas needed — user pays in their trading balance |
| Cartridge session keys | Pre-approve N trades per session | One-tap trades after initial session setup |
| `sdk.swap.*` (AVNU) | Deposit ETH or USDC → auto-swap to STRK | User funds from any token; no DEX knowledge required |
| `sdk.staking.*` | Earn yield on idle BitDrum STRK balance | Balance earns while user is not actively trading |
| `sdk.bridge.*` | Deposit from Ethereum mainnet directly into BitDrum | Removes the "get Starknet STRK first" onboarding blocker |
| `sdk.dca.*` | Auto-top-up: recurring STRK purchases to maintain trading balance | Power-user feature; showcases DCA module |
| Privy signer | Email/social login as alternative to Cartridge | Broadens onboarding beyond Cartridge-only path |

### Week-by-Week Ship Plan (Bounty Aligned)

#### Week 1 — Ship by Friday April 3 (48 hours)

These are all additive, no breaking changes to existing code:

- [ ] **Wire `sdk.tokens.erc20.balance()`** — replace indexer-sourced balance display with live SDK call in the header/profile area. Show STRK balance + USD equivalent using Pragma price feed. This alone changes the Starkzap story from "we call `wallet.execute`" to "we use the token module".
  File to modify: `frontend/src/utils/starkzap.ts` + wherever balance is displayed.

- [ ] **Always-on AVNU Paymaster** — remove the conditional `hasSponsoredExecution` guard for Sepolia. Hard-wire the paymaster for all trade transactions. Add a visible "⚡ Gasless" badge in the TradePanel so judges see it working.
  File to modify: `frontend/src/utils/starkzap.ts`, `frontend/src/utils/bitdrum.ts`.

- [ ] **Cartridge session key setup** — after wallet connect, prompt user to approve a session policy for `open_market` and `join_market` calls up to a stake cap. Subsequent trades execute without a wallet popup.
  This is a flagship Starkzap + Cartridge feature that no other Sepolia prediction market demo has.

- [ ] **Wallet Dashboard v1** — add `/wallet` page showing: live STRK balance (via SDK), USD value, recent trades. No deposit flow yet — just the balance display and activity log. Enough to show the module working.

- [ ] **Deploy to Sepolia and share publicly** — tweet the live URL with a short demo video. Tag @Starknet. This is the submission format.

#### Week 2 — Ship by Friday April 10

- [ ] **`sdk.swap.*` deposit flow** — in Wallet Dashboard, allow deposit from ETH or USDC. SDK fetches swap quote, shows "You deposit 0.01 ETH → You get ~18.4 STRK", user confirms in one Cartridge tap. AVNU routes the swap on-chain.
  This is the most visually impressive Starkzap demo: user deposits ETH, trades BTC predictions with STRK, sees USD balance — three SDK modules in one flow.

- [ ] **Full deposit + withdraw flow** — complete the internal balance ledger so users can deposit once and trade without per-trade wallet prompts.

- [ ] **Real-time balance sync** — after each trade, re-call `sdk.tokens.erc20.balance()` and push updated USD balance to the UI via the existing WebSocket channel.

- [ ] **Public tweet update** — share Week 2 progress: "Added multi-token deposits via Starkzap swaps. ETH in, BTC predictions out." Tweet demo video showing the swap flow.

#### Week 3 — Ship by Friday April 17

- [ ] **`sdk.staking.*` idle yield** — when a user has an unused BitDrum balance above a threshold (e.g. >10 STRK), offer "Earn while you wait" — stake idle STRK via the native staking module. Display APY estimate. One-tap opt-in/opt-out.
  Judges will note this as a genuinely novel DeFi UX: trade + earn in the same app.

- [ ] **`sdk.bridge.*` onboarding** — in the deposit flow, add "Bridge from Ethereum" option. Starkzap bridge module handles the L1→L2 transfer. Removes the last onboarding blocker for ETH-native users.

- [ ] **Privy signer option** — add email/social login as an alternative to Cartridge on the connect screen. Both paths lead to the same trading UI. Demonstrates the Signer Backend flexibility of Starkzap.

- [ ] **Polish for judging** — record a 60-second demo video showing the full loop: bridge/deposit → gasless trade (session key) → idle yield → claim → withdraw. This is the video to tweet for Week 3.

### Judging Criteria Checklist

- [ ] **Product innovation and quality** — Wallet Dashboard + session key trading + idle staking is a novel DeFi UX not seen in other prediction markets.
- [ ] **Sepolia deployment** — all features must be live and testable at a public URL before each Friday.
- [ ] **Real usefulness** — every Starkzap feature used solves a real user friction: no gas, no DEX knowledge, no per-trade popups.
- [ ] **Clarity of build and integration** — the code should be clean and the Starkzap surface clearly visible. Add a `/starkzap` or `README` section listing every SDK module used.
- [ ] **Public tweet with link** — required for submission. Post each Friday morning before the livestream.

---

## New Feature Requirements (Added April 2026)

### User Wallet Dashboard

- [ ] Build a `WalletDashboard` component that shows available BitDrum balance in USD, deposit/withdraw controls, and recent activity.
  - Display on-chain STRK (and any supported token) balance converted to USD using a live price feed (Pragma or CoinGecko fallback).
  - Deposit flow: user tops up the BitDrum internal balance once; subsequent trades deduct from this balance without wallet popups.
  - Withdraw flow: user pulls balance back to their Cartridge/external wallet at any time.

- [ ] Implement an internal balance ledger on the gateway side that tracks per-user deposited funds, deductions per trade, and pending withdrawals.
  Evidence: currently every trade requires a direct wallet-signed transaction. An internal balance layer removes that friction.

- [ ] Add a trade cooldown indicator to the UI — after submitting a trade, show a brief sync period (suggested 2–5 seconds) during which the submit button is disabled and the UI polls for confirmation before accepting the next trade.
  Why: prevents double-submission, keeps UI state in sync with on-chain confirmation, and removes the race condition between indexer write and frontend read.

### USD Display

- [ ] Fetch a USD/STRK (and USD/sBTC if multi-token) price rate at startup and refresh it every 30 seconds; store it in a React context so all components read from one source.
- [ ] Replace all raw-token balance displays in `TradePanel.tsx`, `TradingDashboard.tsx`, and the new `WalletDashboard` with formatted USD values. Show the underlying token amount as secondary text.
- [ ] P&L on trader profiles and leaderboard should also display in USD with an optional toggle to view in native token.

### Multi-Token Support

- [ ] Define a supported token list (start with STRK + ETH on Sepolia; sBTC as third option) in a central config file shared across frontend, gateway, and keeper.
- [ ] Allow users to select which token they are depositing in the `WalletDashboard`; internally normalise to whichever token the active market is settled in.
- [ ] Update the AI preview and market context endpoints to accept and return a `token` field so the frontend can display the correct symbol and convert accordingly.
- [ ] Resolve the STRK vs sBTC product decision: the simplest path for the Sepolia beta is to expose STRK as the primary trading token and list sBTC as a future option behind a feature flag.

### Performance & Simplification

- [ ] Replace per-trade wallet transaction prompts with single-deposit + internal balance deductions (see Wallet Dashboard above). This is the single biggest UX simplification.
- [ ] Add a short-lived (500 ms) optimistic UI state after trade submission so the button and countdown update immediately without waiting for the indexer.
- [ ] Reduce the gateway websocket polling interval from the current `WS_REFRESH_MS` to event-driven push: emit only when markets, positions, or feed actually change.
- [ ] Cache USD price rates and token conversions at the gateway level (30 s TTL) so every websocket client does not independently fetch the same exchange rate.
- [ ] Simplify the `TradePanel` flow to three steps: **Select direction → Confirm amount → Submit**. Remove any intermediate screens or confirmation modals beyond the cooldown indicator.

---

## What Already Looks Good

- [x] Core Cairo contracts exist for market lifecycle, settlement, vault/treasury, leaderboard, and subscriptions in [contracts/bitdrum_starknet/src](/Users/0t41k1/Documents/bitdrum/contracts/bitdrum_starknet/src).
- [x] Contract test coverage is substantial and currently passes via `scarb test`.
- [x] The keeper fetches live Pragma BTC/USD data and persists restart state in [settlement.ts](/Users/0t41k1/Documents/bitdrum/backend/keeper/src/services/settlement.ts) and [keeperState.ts](/Users/0t41k1/Documents/bitdrum/backend/keeper/src/services/keeperState.ts).
- [x] The indexer persists markets, stakes, traders, signals, and follows into Postgres in [schema.ts](/Users/0t41k1/Documents/bitdrum/backend/indexer/lib/schema.ts).
- [x] The gateway exposes markets, feed, positions, leaderboard, AI preview, and websocket streams in [index.ts](/Users/0t41k1/Documents/bitdrum/backend/gateway/src/routes/index.ts) and [index.ts](/Users/0t41k1/Documents/bitdrum/backend/gateway/src/index.ts).
- [x] The frontend is usable with Cartridge and now gives clear trade submission/confirmation feedback in [TradePanel.tsx](/Users/0t41k1/Documents/bitdrum/frontend/src/components/TradePanel.tsx) and [TradingDashboard.tsx](/Users/0t41k1/Documents/bitdrum/frontend/src/components/TradingDashboard.tsx).

## Must Finish Before Public Sepolia Testing

### Product And Token Alignment

- [ ] Decide whether BitDrum on Sepolia is a `STRK` product or an `sBTC` product, then align contracts, frontend copy, docs, and subscription pricing.
  Evidence:
  [bitdrum-system-overview.md](/Users/0t41k1/Documents/bitdrum/bitdrum-system-overview.md) describes `sBTC` staking and paid subscriptions, while [bitdrum.ts](/Users/0t41k1/Documents/bitdrum/frontend/src/utils/bitdrum.ts) and [deployment_sepolia.json](/Users/0t41k1/Documents/bitdrum/contracts/bitdrum_starknet/deploy/deployment_sepolia.json) are wired to native `STRK`.

- [ ] Decide whether the public Sepolia beta supports only the current fixed market window or the documented `30s / 1m / 5m` durations.
  Evidence:
  [bitdrum-system-overview.md](/Users/0t41k1/Documents/bitdrum/bitdrum-system-overview.md) promises three durations, but [prediction_market.cairo](/Users/0t41k1/Documents/bitdrum/contracts/bitdrum_starknet/src/prediction_market.cairo) still uses a fixed `JOINING_WINDOW`.

### Subscription And Access Control

- [ ] Replace mocked subscription gating with a real on-chain read against `SignalSubscription`.
  Evidence:
  [auth.ts](/Users/0t41k1/Documents/bitdrum/backend/gateway/src/middleware/auth.ts) explicitly logs `MOCK: ALLOWED`.

- [ ] Add an actual subscription purchase/manage flow in the frontend, or remove premium-tier claims from the public beta scope.
  Evidence:
  The repo contains the contract in [signal_subscription.cairo](/Users/0t41k1/Documents/bitdrum/contracts/bitdrum_starknet/src/signal_subscription.cairo), but there is no subscription UI or purchase path in [frontend/src](/Users/0t41k1/Documents/bitdrum/frontend/src).

### Deployment Configuration

- [ ] Remove hardcoded chain addresses from app code and move them into shared env/config.
  Evidence:
  [bitdrum.ts](/Users/0t41k1/Documents/bitdrum/frontend/src/utils/bitdrum.ts) hardcodes token and market addresses.
  [apibara.config.ts](/Users/0t41k1/Documents/bitdrum/backend/indexer/apibara.config.ts) hardcodes `predictionMarketAddress` and `startingBlock`.

- [ ] Add checked-in `.env.example` files for `frontend`, `gateway`, `indexer`, `keeper`, and `ai-agent`.
  Evidence:
  Only [contracts/bitdrum_starknet/deploy/.env.example](/Users/0t41k1/Documents/bitdrum/contracts/bitdrum_starknet/deploy/.env.example) exists.

- [ ] Add a reproducible deployment/runtime path for hosting the services online.
  Evidence:
  There is no `docker-compose`, no process manager config, and no CI/CD workflow in the repo.

### Security And Abuse Prevention

- [ ] Protect gateway internal endpoints and signal persistence routes before exposing the service publicly.
  Evidence:
  [index.ts](/Users/0t41k1/Documents/bitdrum/backend/gateway/src/routes/index.ts) exposes `/internal/*` routes with no auth.

- [ ] Add rate limiting for public endpoints and websocket connections.
  Evidence:
  [backend/gateway/implementation.md](/Users/0t41k1/Documents/bitdrum/backend/gateway/implementation.md) lists this as required, but it is not implemented.

- [ ] Restrict CORS to approved origins for the hosted frontend.
  Evidence:
  [backend/gateway/src/index.ts](/Users/0t41k1/Documents/bitdrum/backend/gateway/src/index.ts) uses `cors()` with no allowlist.

### Operational Readiness

- [ ] Add readiness/health coverage for indexer and keeper, plus downstream checks for DB, RPC, and AI agent.
  Evidence:
  Only gateway and AI agent expose `/health`; keeper and indexer do not.

- [ ] Write one canonical public test smoke test and run it before inviting external users.
  Required flow:
  `connect wallet -> open market -> second wallet joins -> keeper locks -> keeper settles -> claim -> feed/positions/leaderboard update`.

- [ ] Confirm the single-keeper operating model and make sure only one keeper instance runs against Sepolia at a time.
  Why:
  The keeper is polling and state-file based; there is no distributed lock or leader election.

## Strongly Recommended Optimizations

- [ ] Replace gateway websocket polling with push/fanout.
  Evidence:
  [backend/gateway/src/index.ts](/Users/0t41k1/Documents/bitdrum/backend/gateway/src/index.ts) polls its own HTTP endpoints every `WS_REFRESH_MS` for every websocket client. This will get expensive fast.
  Related: the new USD price feed and wallet balance updates should also flow through this push channel rather than adding new polling loops.

- [ ] Stop recomputing all trader profiles on every claimable event.
  Evidence:
  [bitdrum.indexer.ts](/Users/0t41k1/Documents/bitdrum/backend/indexer/indexers/bitdrum.indexer.ts) loads all stakes and all markets in `recomputeTraderProfiles()`.

- [ ] Add short TTL caching for AI preview and market detail responses.
  Why:
  Preview traffic can spike on every keystroke or market selection. A 1-5 second cache in the gateway will reduce AI/gateway chatter.

- [ ] Centralize chain configuration so frontend, indexer, keeper, deploy scripts, and docs all read from one source of truth.
  Why:
  Right now addresses and environment defaults are duplicated across multiple services. The multi-token token list should live in this same config.

- [ ] Add structured logging and request correlation across gateway, keeper, indexer, and AI agent.
  Why:
  Public testing will generate “did my trade go through?” questions. Correlated logs will save time immediately. The wallet deposit/withdrawal events should be logged at the same level.

- [ ] Add frontend wallet session restore and cleaner offline/error handling.
  Why:
  Cartridge currently reconnects manually after refresh; that is usable but not ideal for testers. The internal balance state should persist across reconnects.

- [ ] Add endpoint-level timeouts and retry policies around RPC and AI-agent calls.
  Why:
  Several code paths assume healthy local services; public test traffic needs clearer degradation behavior.

## Nice To Have, Not Required For Sepolia Beta

- [ ] Premium alerts / push notifications mentioned in docs but not yet implemented.
- [ ] Mobile-specific session handling and JWT support mentioned in gateway docs.
- [ ] Full duration-based market selection if you decide to keep the beta on a single fixed market window for now.
- [ ] sBTC as a selectable deposit token (list it in the token config but keep it disabled until sBTC testnet liquidity is confirmed).
- [ ] Portfolio view inside `WalletDashboard`: cumulative P&L chart over time in USD.

## Verification Checklist Before Inviting Testers

- [ ] `cd contracts/bitdrum_starknet && scarb test`
- [ ] `cd backend/indexer && npm run db:migrate && npm run build && npm run start`
- [ ] `cd backend/ai-agent && python3 main.py`
- [ ] `cd backend/gateway && npm run build && npm start`
- [ ] `cd backend/keeper && npm run build && npm start`
- [ ] `cd frontend && npm run build && npm run dev`
- [ ] Verify [http://localhost:3001/health](http://localhost:3001/health) and [http://localhost:8000/health](http://localhost:8000/health)
- [ ] Confirm websocket updates arrive on `/ws` for `markets`, `feed`, `leaderboard`, and `positions`
- [ ] Complete a two-wallet end-to-end trade and claim flow on Sepolia

## Recommended Launch Order

1. Freeze the Sepolia beta scope — confirm STRK as the primary token with USD display and multi-token as a follow-on.
2. Build and ship the `WalletDashboard` (deposit, balance in USD, trade cooldown indicator) before any external invite.
3. Align token story and market-duration story with the actual deployment.
4. Replace mocked subscription gating or explicitly disable premium gating for beta.
5. Externalize addresses/env config and commit `.env.example` files; include token list config.
6. Add rate limiting, internal-route protection, and dependency health checks.
7. Switch gateway websocket to event-driven push; add USD price feed refresh to the push channel.
8. Deploy one shared Postgres, one indexer, one gateway, one AI agent, one keeper, and one frontend.
9. Run the full smoke test with two external wallets, including a deposit → trade → cooldown → claim cycle.

## Bottom Line

BitDrum is not far from a public Sepolia beta. The real blockers are configuration drift, mocked access control, missing deployment hardening, and a few product-spec mismatches. The new wallet dashboard, USD display, multi-token support, and cooldown UX are high-leverage additions: they remove per-trade friction, give users a clear balance picture, and keep the UI in sync with on-chain state. Build the wallet dashboard first — it touches the most user-facing pain points and unblocks the seamless trading experience the product needs.
