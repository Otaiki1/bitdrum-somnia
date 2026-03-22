# BitDrum
### The Intelligent Decentralized Prediction Protocol
### Built on Starknet · Powered by Starkzap SDK · Augmented by AI

---

> **BitDrum is a trustless Bitcoin price prediction protocol that merges on-chain transparency with AI-driven trading intelligence, a capped dynamic payout engine, and a social reputation layer — giving every user the edge of a seasoned trader without requiring them to be one.**

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Core Protocol (Inherited from BitDrum)](#2-core-protocol)
3. [Extended Feature Pillars](#3-extended-feature-pillars)
4. [System Architecture](#4-system-architecture)
5. [Smart Contract Layer](#5-smart-contract-layer)
6. [AI Agent System](#6-ai-agent-system)
7. [Dynamic Payout Engine](#7-dynamic-payout-engine)
8. [Social Layer & Reputation System](#8-social-layer--reputation-system)
9. [Starknet & Starkzap Integration](#9-starknet--starkzap-integration)
10. [User Flows](#10-user-flows)
11. [Data Architecture](#11-data-architecture)
12. [Economic Model](#12-economic-model)
13. [Security Model](#13-security-model)
14. [Frontend Architecture](#14-frontend-architecture)
15. [Backend & Keeper Infrastructure](#15-backend--keeper-infrastructure)
16. [Deployment & Environment Strategy](#16-deployment--environment-strategy)
17. [Glossary](#17-glossary)

---

## 1. Executive Summary

BitDrum is a next-generation decentralized prediction protocol built on Starknet. It inherits the trustless, transparent core of BitDrum — where users stake on Bitcoin's short-term price direction through smart contracts — and extends it with three high-value intelligent layers:

| Layer | What It Does | Why It Matters |
|---|---|---|
| **AI Signal Agent** | Analyzes top-performing traders and surfaces actionable UP/DOWN signals; operates a subscription profit model | Democratizes edge — every user gets institutional-grade insight with a clear value exchange |
| **Dynamic Payout Engine** | AI models probable outcomes; winners earn up to **+70% profit** on stake; losers absorb **100% loss** | Capped, honest risk/reward — no hidden rakes or variable house cuts |
| **Social Reputation Layer** | Ranks traders by accuracy, P&L, and consistency — publicly, on-chain | Builds trust, drives engagement, creates a meritocratic community |

All three layers operate on top of the same non-custodial, oracle-settled, immutable smart contracts that define the base protocol. The AI and social layers are advisory and informational — they never hold funds, alter settlement logic, or introduce a trusted third party into the custody chain.

---

## 2. Core Protocol

> The following is the immutable foundation BitDrum is built upon. It is not modified by the extended features — it is augmented.

### 2.1 The Prediction Market

BitDrum operates around one question:

> **Will Bitcoin's price be higher or lower than it is right now, after a set amount of time?**

Users stake on:
- **UP** — BTC price will be higher at expiry
- **DOWN** — BTC price will be lower at expiry

Durations: **30 seconds**, **1 minute**, **5 minutes**

### 2.2 Market Lifecycle

```
OPEN
 │  Strike price recorded on-chain
 │  Liquidity Vault fills opposite side
 │  AI Agent signal is surfaced to users
 │  Dynamic multiplier estimate displayed
 │
 ▼
LOCKED
 │  Joining window closed
 │  Pool is fixed
 │  Expiry countdown runs
 │
 ▼
SETTLED
 │  Keeper triggers settlement
 │  Oracle price compared to strike
 │  AI Agent outcome logged (for accuracy tracking)
 │  Dynamic multiplier finalised
 │
 ▼
CLAIMABLE
 │  Winners claim proportional payout
 │  Social layer records trade result per user
 │
 ▼
CLOSED
     All claims processed
     Trader stats updated on leaderboard
```

### 2.3 The Payout Structure

BitDrum uses a **fixed-outcome binary model**, not a parimutuel pool. The payout rules are simple and known before every market closes:

```
WIN  → Stake returned + AI-determined profit (between +5% and +70% of stake)
LOSE → 100% of stake lost
DRAW → Full stake refunded
```

The exact profit percentage for a given market is determined by the **Probable Outcome Multiplier (POM)** — an AI engine that evaluates pool conditions, BTC volatility, top-trader positioning, and signal confidence at market open. The POM is fixed once the joining window closes and stored on-chain. There are no surprises at settlement.

The Liquidity Vault funds winner profits and absorbs loser stakes. The protocol's structural edge is the spread between 100% loser absorption and the ≤70% profit cap — meaning the vault is profitable at any POM value.

### 2.4 The Liquidity Vault

On every new market, the protocol's **Liquidity Vault** automatically stakes on the opposite side of the opener. This guarantees:
- Every market always has a counterparty
- No voids, no refunds due to lack of participation
- A working UX from day one, before the user base grows

The vault is replenished by protocol fees and operates as a market-making function, not a house edge.

### 2.5 Settlement

Settlement is triggered by a **keeper bot** that polls for expired markets every **3 seconds**. The keeper fetches a signed price attestation from a pull oracle, submits it on-chain, and the smart contract executes settlement deterministically — applying the POM profit percentage that was stored at market open. The keeper is an automation convenience — it does not control outcomes or payout rates.

---

## 3. Extended Feature Pillars

### Pillar 1 — AI Signal Agent

The AI Signal Agent observes the trading behaviour of the protocol's top-performing traders and distils their collective positioning into a single structured signal displayed before and during the joining window of every market.

**What it produces:**
- A directional bias: `BULLISH`, `BEARISH`, or `NEUTRAL`
- A confidence score: `0–100`
- A rationale: short natural-language explanation citing key inputs
- Historical accuracy of the signal type on similar conditions

**What it does not do:**
- It does not place trades on behalf of users
- It does not guarantee an outcome
- It does not alter the smart contract logic in any way

The signal is surfaced as informational UI. The user retains full autonomy over their decision.

#### AI Signal Agent — Profit Model

The Signal Agent is a **revenue-generating product layer** within BitDrum, not a free feature. It operates on a tiered access model:

| Tier | Access | Cost | Included |
|---|---|---|---|
| **Free** | Basic signal direction only (no confidence, no rationale) | $0 | BULLISH / BEARISH / NEUTRAL label |
| **Signal Pro** | Full signal: confidence score + rationale + accuracy history | $9.99/month in sBTC | All signal fields per market |
| **Signal Elite** | Signal Pro + real-time ORACLE-trader position alerts + POM priority feed | $24.99/month in sBTC | Signal Pro + trader copy-alerts + early POM access |

**Revenue flow:**
```
Subscription payments (sBTC) → Signal Revenue Pool
  50% → Protocol Treasury (infrastructure and vault)
  30% → AI model improvement fund (compute, retraining)
  20% → ORACLE-tier trader reward pool
      (top traders whose positioning feeds the model earn
       a proportional share of Signal Elite revenue each month)
```

This creates a **closed economic loop**: top traders are financially rewarded for trading on-chain with high accuracy, which enriches the AI signal, which drives subscription revenue, which rewards top traders further.

**Payment mechanics (via Starkzap):**
- Subscriptions are paid monthly in sBTC directly from the user's wallet
- Payments are non-custodial: the subscription contract deducts exactly one monthly fee on renewal
- No auto-renewal without wallet signature — users must re-authorize each period or set a session-scoped auto-renewal approval
- Cancellation takes effect at end of current billing period

---

### Pillar 2 — Dynamic Payout Engine

The Dynamic Payout Engine governs BitDrum's core risk/reward structure. It operates on a **fixed outcome model**:

- **WIN** — the user's stake returns their original amount plus **up to +70% profit**. The AI-derived Probable Outcome Multiplier (POM) determines where within the 0–70% range the actual profit lands, based on real-time market intelligence.
- **LOSE** — the user's entire staked amount is lost. **There is no partial loss.** The position is binary.

This model replaces the open-ended parimutuel multiplier with a capped, transparent, and honest structure. Users know their maximum upside before staking. The protocol absorbs the counterparty risk via the Liquidity Vault.

**Inputs to the POM model:**
- Current pool ratio (UP vs DOWN liquidity)
- Recent BTC price volatility (1m, 5m, 15m windows)
- Time of day and day-of-week momentum patterns
- Top-trader positioning on this and similar recent markets
- Historical accuracy of current market conditions

**Output:**
- A displayed profit percentage estimate per side: e.g., `UP: +42%` | `DOWN: +61%`
- The profit percentage is capped at **+70%** regardless of pool imbalance
- Minimum displayed profit is **+5%** — markets where the POM calculates below this threshold are not surfaced

The POM resolves at settlement. Losers receive nothing.

---

### Pillar 3 — Social Reputation Layer

The Social Layer transforms BitDrum from a protocol into a community. Every wallet that trades on-chain automatically builds a public trading profile derived entirely from verifiable, on-chain data.

**Each trader profile shows:**
- Total markets entered
- Win rate (% of settled markets on winning side)
- Net P&L in sBTC/STRK over time
- Average stake size and risk profile
- Current ranking (global and weekly)
- Signal alignment rate (how often they followed AI signals, and whether that correlated with wins)

**Leaderboard tiers:**
- `ORACLE` — Top 1% by win rate + volume (minimum 50 markets)
- `PROPHET` — Top 5%
- `TRADER` — Top 20%
- `SCOUT` — All other active participants

Top traders in the `ORACLE` and `PROPHET` tiers have their positioning patterns fed into the AI Signal Agent model, closing the loop between social performance and AI intelligence.

---

## 4. System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              USER LAYER                                  │
│           Web · Mobile (React Native) · Progressive Web App              │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────────┐
│                           FRONTEND LAYER                                 │
│                                                                          │
│  ┌────────────────┐  ┌─────────────────┐  ┌───────────────────────────┐ │
│  │  Trading UI    │  │  AI Signal UI   │  │  Social / Leaderboard UI  │ │
│  │  ──────────    │  │  ────────────   │  │  ────────────────────────  │ │
│  │  Market feed   │  │  Signal cards   │  │  Trader profiles           │ │
│  │  BTC chart     │  │  Confidence     │  │  Rankings & tiers          │ │
│  │  Open/Join     │  │  Rationale      │  │  P&L history               │ │
│  │  Claim         │  │  History        │  │  Social follows            │ │
│  └────────────────┘  └─────────────────┘  └───────────────────────────┘ │
│                                                                          │
│                  Powered by Starkzap SDK (TypeScript)                    │
│          Wallet Auth · Token Ops · Tx Builder · Cross-Platform           │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
┌────────▼───────┐   ┌──────────▼──────────┐  ┌───────▼────────────────┐
│  SMART CONTRACT│   │   AI AGENT LAYER     │  │  SOCIAL INDEXER LAYER  │
│  LAYER         │   │                      │  │                        │
│  (Starknet)    │   │  Signal Engine       │  │  On-chain event        │
│                │   │  POM Engine          │  │  listener              │
│  Prediction    │   │  Top-trader          │  │                        │
│  Market        │   │  aggregator          │  │  Trader stat           │
│                │   │                      │  │  computation           │
│  Settlement    │   │  LLM inference       │  │                        │
│  Engine        │   │  layer               │  │  Leaderboard DB        │
│                │   │                      │  │                        │
│  Liquidity     │   │  REST/WebSocket      │  │  Profile API           │
│  Vault         │   │  API                 │  │                        │
│                │   │                      │  │  Feed API              │
│  Treasury      │   └──────────────────────┘  └────────────────────────┘
└────────┬───────┘
         │
┌────────▼───────────────────────────────────────────────────────────────┐
│                        AUTOMATION LAYER                                 │
│                                                                         │
│   Keeper Bot                                                            │
│   ─────────                                                             │
│   Polls for expired markets every 3s                                    │
│   Fetches oracle price attestation                                      │
│   Triggers settlement transaction                                       │
│   Emits settlement events → Social Indexer                              │
│   Emits settlement events → AI Agent (accuracy feedback loop)           │
└────────┬───────────────────────────────────────────────────────────────┘
         │
┌────────▼───────────────────────────────────────────────────────────────┐
│                          ORACLE LAYER                                   │
│    Pull oracle · BTC/USD · Multi-source aggregated                      │
│    Signed price attestations · Staleness-protected                      │
│    Pragma Oracle (Starknet-native)                                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Smart Contract Layer

All contracts are written in **Cairo** and deployed on **Starknet mainnet**. Once deployed, contracts are immutable. Starknet's native account abstraction eliminates the need for users to manage EOA private keys directly.

### 5.1 Prediction Market Contract

**Responsibilities:**
- Accept new market openings with strike price and duration
- Record opener's direction, stake, and block timestamp
- Accept participant stakes during the joining window
- Track `up_pool` and `down_pool` balances per market
- Hold all staked funds in escrow
- Enforce market state transitions (OPEN → LOCKED → SETTLED → CLAIMABLE → CLOSED)
- Enforce staleness protection on oracle prices

**Key storage:**
```
markets: Map<MarketId, MarketState>
stakes: Map<(MarketId, Address), StakeRecord>
pools: Map<MarketId, PoolSnapshot>
```

**Key entry points:**
```
open_market(direction, duration, stake_amount, strike_price_attestation)
join_market(market_id, direction, stake_amount)
claim_payout(market_id)
```

---

### 5.2 Settlement Engine Contract

**Responsibilities:**
- Receive settlement trigger from keeper with oracle price attestation
- Verify oracle signature and price freshness
- Compare final price to stored strike price
- Determine winning direction (UP / DOWN / DRAW)
- Calculate each winner's proportional payout from pool data
- Route 2% protocol fee to Treasury
- Unlock CLAIMABLE state so winners can withdraw

**Settlement logic (Cairo pseudocode):**
```rust
fn settle(market_id, price_attestation) {
    let market = storage.markets.get(market_id);
    assert market.state == LOCKED && block.timestamp >= market.expiry;
    
    let final_price = oracle.verify_and_extract(price_attestation);
    
    let outcome = match final_price.cmp(market.strike_price) {
        Greater => Direction::UP,
        Less    => Direction::DOWN,
        Equal   => Direction::DRAW,
    };
    
    let total_pool = market.up_pool + market.down_pool;
    let fee = total_pool * PROTOCOL_FEE_BPS / 10000; // 200 BPS = 2%
    let net_pool = total_pool - fee;
    
    treasury.deposit(fee);
    market.net_pool = net_pool;
    market.outcome = outcome;
    market.state = CLAIMABLE;
    
    emit MarketSettled { market_id, outcome, net_pool, final_price };
}
```

---

### 5.3 Liquidity Vault Contract

**Responsibilities:**
- Automatically stake on the opposite side of any new market opener
- Cap vault exposure per market at `max_vault_stake` (configurable by governance)
- Proportionally reduce vault exposure as organic participation fills the opposite side
- Receive replenishment from Treasury
- Never borrow — operates only on accumulated reserves

**Vault exposure reduction logic:**
```
vault_net_exposure = min(opener_stake, max_vault_stake)
for each joiner on opposite_side:
    vault_net_exposure -= joiner.stake
    if vault_net_exposure <= 0: vault_net_exposure = 0; break
```

---

### 5.4 Treasury Contract

**Responsibilities:**
- Receive 2% protocol fee from each settled market
- Allocate fees to: Vault replenishment, AI infrastructure, development reserve
- Emit allocation events for on-chain auditability

**Fee allocation (default):**
```
Liquidity Vault replenishment:  40%
AI & infrastructure fund:       35%
Protocol development reserve:   25%
```

Allocation ratios are governance-adjustable via a timelocked multisig. They cannot be changed in real time.

---

### 5.5 Leaderboard Registry Contract

**Responsibilities:**
- Store verifiable on-chain trading stats per wallet address
- Updated by the Settlement Engine on every settled market
- Readable by anyone — fully public
- Powers the Social Layer without requiring a trusted off-chain database

**Key storage:**
```
trader_stats: Map<Address, TraderStats>
// TraderStats: { markets_entered, wins, losses, draws, total_staked, total_claimed, last_active }
```

This contract is the source of truth for leaderboard rankings. The off-chain Social Indexer reads from it to build richer derived metrics but cannot alter what is stored here.

---

### 5.6 Signal Subscription Contract (New)

**Responsibilities:**
- Accept monthly subscription payments in sBTC from Signal Pro and Signal Elite subscribers
- Store subscription status and tier per wallet address — read by the API Gateway to gate signal access
- Emit payment events to the Signal Revenue Pool distribution logic
- Distribute subscription revenue: 50% to Treasury, 30% to AI fund, 20% to ORACLE Tier Reward Pool
- Handle cancellations and non-renewals cleanly — access gates update at period end

**Key storage:**
```
subscriptions: Map<Address, SubscriptionRecord>
// SubscriptionRecord: { tier, paid_until, total_paid_lifetime }

oracle_reward_pool: u256  // accumulated monthly, distributed to ORACLE-tier wallets
```

**Key entry points:**
```
subscribe(tier)              // deducts sBTC, sets paid_until = now + 30 days
renew(tier)                  // re-authorizes for next period
cancel()                     // flags for non-renewal; access continues until paid_until
distribute_oracle_rewards()  // callable monthly; splits oracle_reward_pool by TIS weight
```

**Access gating:**
The API Gateway checks `subscriptions[caller_address].paid_until > now` before serving Signal Pro or Signal Elite content. This check is read-only against the on-chain contract state — no off-chain session tokens are used for tier gating.

---

## 6. AI Agent System

The AI Agent System is a **server-side inference service** that operates independently of the smart contracts. It has no on-chain permissions and cannot move funds. Its sole function is to produce intelligence that helps users make better decisions.

### 6.1 System Components

```
┌──────────────────────────────────────────────────────────┐
│                    AI AGENT SERVICE                       │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              DATA INGESTION PIPELINE                │  │
│  │                                                     │  │
│  │  On-chain events (new markets, stakes, settlements) │  │
│  │  Oracle price feed (real-time BTC/USD)              │  │
│  │  Leaderboard Registry (top trader positions)        │  │
│  │  Historical market database                         │  │
│  └───────────────────────┬─────────────────────────────┘  │
│                          │                                │
│  ┌───────────────────────▼─────────────────────────────┐  │
│  │              FEATURE EXTRACTION                     │  │
│  │                                                     │  │
│  │  Top-trader position aggregation                    │  │
│  │  Pool imbalance ratio                               │  │
│  │  Price momentum (Δ1m, Δ5m, Δ15m, Δ1h)              │  │
│  │  Volatility regime (ATR, Bollinger Band width)      │  │
│  │  Time-of-day and session patterns                   │  │
│  │  Recent signal accuracy feedback                    │  │
│  └───────────────────────┬─────────────────────────────┘  │
│                          │                                │
│  ┌───────────────────────▼─────────────────────────────┐  │
│  │           SIGNAL INFERENCE ENGINE                   │  │
│  │                                                     │  │
│  │  Primary model: fine-tuned time-series classifier   │  │
│  │  Secondary model: LLM rationale generator           │  │
│  │  Output: direction bias + confidence + rationale    │  │
│  └───────────────────────┬─────────────────────────────┘  │
│                          │                                │
│  ┌───────────────────────▼─────────────────────────────┐  │
│  │         PROBABLE OUTCOME MULTIPLIER ENGINE          │  │
│  │                                                     │  │
│  │  Inputs: pool ratio + volatility + signal confidence│  │
│  │  Output: profit % per side (5%–70% cap)             │  │
│  │  Computed once at joining window close · Immutable  │  │
│  └───────────────────────┬─────────────────────────────┘  │
│                          │                                │
│  ┌───────────────────────▼─────────────────────────────┐  │
│  │                   API LAYER                         │  │
│  │                                                     │  │
│  │  REST: GET /signal/:market_id                       │  │
│  │  REST: GET /pom/:market_id                          │  │
│  │  WebSocket: /stream/signals                         │  │
│  │  WebSocket: /stream/pom                             │  │
│  └─────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 6.2 Top-Trader Aggregation Logic

The AI Agent defines "top traders" as wallets that meet all of the following thresholds:
- Minimum **50 settled markets** in the last 90 days
- Win rate **≥ 58%** across all durations
- Net P&L **positive** over the measurement period
- Not flagged as a vault-adjacent or bot-controlled address

Qualifying wallets are assigned a **Trader Influence Score (TIS)** based on recency-weighted win rate and net P&L. The TIS determines how heavily their current positioning is weighted in the signal.

**Aggregation formula:**
```
signal_weight[trader] = TIS[trader] / sum(TIS for all qualifying traders)
direction_bias = sum(signal_weight[t] × direction_vote[t])
// direction_vote: +1 for UP stake, -1 for DOWN stake
// confidence = |direction_bias| × 100 → clamped to [0, 100]
```

A `confidence` of 70+ is considered **high signal strength**. Below 40 is **NEUTRAL** — no directional call is surfaced.

### 6.3 Signal Output Schema

```json
{
  "market_id": "0xabc123...",
  "signal": {
    "direction": "UP",
    "confidence": 74,
    "rationale": "7 of 9 qualifying Oracle-tier traders are positioned UP on this market. BTC is in a 5-minute upward momentum channel with low volatility. Pool is balanced — risk/reward is fair.",
    "top_trader_alignment": 0.78,
    "price_momentum_1m": "+0.12%",
    "price_momentum_5m": "+0.31%",
    "signal_accuracy_last_30d": "64.2%",
    "generated_at": "2025-01-15T14:23:07Z"
  }
}
```

### 6.4 Accuracy Feedback Loop

Every settled market triggers an event consumed by the AI Agent service. The agent:
1. Looks up the signal it generated for that market
2. Compares signal direction to actual outcome
3. Records the result in the **Signal Accuracy Log**
4. Uses rolling accuracy metrics to recalibrate feature weights in the inference model

This creates a self-improving signal that gets more accurate as more markets are settled and more top-trader behaviour is observed.

---

## 7. Dynamic Payout Engine

### 7.1 The Payout Model — Fixed Outcome, Capped Profit

BitDrum operates a **binary fixed-outcome model**:

| Outcome | Result |
|---|---|
| **Correct direction** | User receives original stake back + **AI-determined profit (0% to 70% of stake)** |
| **Wrong direction** | User loses **100% of staked amount** — no partial recovery |
| **DRAW** | User receives **full stake refund** — no profit, no loss |

This is a deliberate design decision. The fixed binary outcome model:
- Makes risk/reward immediately legible to any user, including those new to crypto
- Eliminates the confusion of parimutuel multiplier math at claim time
- Allows the AI agent to price outcomes meaningfully within a bounded range
- Creates a clear, auditable obligation on the smart contract side

### 7.2 The Probable Outcome Multiplier (POM)

The POM is the AI engine that determines how much profit a winning user earns — expressed as a percentage of their stake, bounded between **+5% and +70%**.

**The POM is set once at market open and does not change** after the joining window closes. The profit percentage users see when joining is the profit percentage they will receive if they win.

**POM Inputs:**

| Input | Weight | Description |
|---|---|---|
| Pool imbalance ratio | 30% | Ratio of UP vs DOWN liquidity at join time |
| BTC price volatility | 25% | ATR over 1m, 5m, 15m windows |
| Top-trader alignment strength | 25% | How concentrated ORACLE/PROPHET positioning is |
| Time-of-day session patterns | 10% | Historical outcome rates at this hour/day |
| Signal confidence score | 10% | How confident the AI Signal is on direction |

**POM Calculation:**

```
raw_pom = weighted_sum(inputs) → normalized to [0, 1]

// Map to profit range [0.05, 0.70]
profit_pct = 0.05 + (raw_pom × 0.65)

// Hard clamp — no exceptions
profit_pct = clamp(profit_pct, 0.05, 0.70)

// Final payout if user wins:
payout = stake + (stake × profit_pct)

// Final payout if user loses:
payout = 0
```

**Example outcomes:**

```
User stakes 0.01 sBTC
POM determines: +58% profit

  WIN  → receives 0.01 + (0.01 × 0.58) = 0.0158 sBTC
  LOSS → receives 0.00 sBTC (100% of stake lost)
  DRAW → receives 0.01 sBTC (full refund)
```

### 7.3 How the Protocol Funds Winners

In the parimutuel base model, winners were funded by losers' stakes. In BitDrum's fixed-outcome model, the protocol must guarantee the profit payout regardless of loser pool size. This is handled by the **Liquidity Vault**:

```
Total loser stakes     → flow to Liquidity Vault
Winner profit payouts  → funded from Liquidity Vault
Winner stake returns   → funded from winner's own escrowed stake

Net vault flow per market:
  Vault income = sum(all losing stakes)
  Vault outgo  = sum(winner_stake × profit_pct) for all winners
  Net = Vault income − Vault outgo
```

At balanced participation (50/50 split), the vault's net exposure is:

```
Vault income = 50% of total pool (losing side)
Vault outgo  = winning side × avg profit_pct (max 70%)

Net vault profit at 50/50 split with avg 40% POM:
  Pool = 1 sBTC (0.5 each side)
  Vault receives: 0.5 sBTC from losers
  Vault pays out: 0.5 × 0.40 = 0.2 sBTC to winners
  Vault net gain: +0.3 sBTC
```

The vault is structurally profitable at all POM levels below 100%, which the 70% cap guarantees. The protocol's edge is the spread between the 100% loss absorbed by losers and the ≤70% profit paid to winners.

### 7.4 Settlement Contract — Payout Logic Update

```rust
fn settle(market_id, price_attestation) {
    let market = storage.markets.get(market_id);
    let final_price = oracle.verify_and_extract(price_attestation);
    let outcome = compare(final_price, market.strike_price); // UP / DOWN / DRAW

    if outcome == DRAW {
        // Full refund — return all stakes, no vault interaction
        refund_all_stakes(market_id);
        return;
    }

    let profit_pct = market.pom_profit_pct; // stored at market open, immutable
    assert profit_pct >= 500 && profit_pct <= 7000; // BPS: 5% to 70%

    for each stake in market.stakes {
        if stake.direction == outcome {
            // Winner: return stake + profit
            let profit = stake.amount * profit_pct / 10000;
            let payout = stake.amount + profit;
            vault.pay_winner(stake.address, payout, profit);
        } else {
            // Loser: entire stake absorbed by vault
            vault.absorb_loss(stake.amount);
        }
    }

    treasury.deposit(protocol_fee); // 2% of total pool
    market.state = CLAIMABLE;
    emit MarketSettled { market_id, outcome, profit_pct };
}
```

### 7.5 POM Display in UI

For each open market, the joining window UI shows:

```
╔═══════════════════════════════════════════════╗
║          PROFIT IF YOUR CALL IS RIGHT         ║
║                                               ║
║    UP  ▲          +58% profit on stake        ║
║    DOWN ▼         +41% profit on stake        ║
║                                               ║
║    If wrong: 100% of stake lost               ║
║                                               ║
║    AI Signal: ↑ UP (74% confidence)           ║
║    Pool: 0.031 sBTC UP | 0.014 sBTC DOWN      ║
║                                               ║
║    ⚡ Profit rate locked at market open       ║
╚═══════════════════════════════════════════════╝
```

### 7.6 Special Scenarios

| Scenario | Behaviour |
|---|---|
| **DRAW outcome** | All stakes refunded in full. No profit, no loss, no vault interaction |
| **POM below 5%** | Market is not surfaced in the UI — minimum viable reward enforced |
| **All participants on same side** | Vault is sole counterparty on the other side. Market still settles normally |
| **Signal contradicts pool majority** | POM surface flags `CONTRARIAN OPPORTUNITY` — profit % on minority side shown prominently |
| **High volatility regime** | POM skews toward higher profit % (closer to 70%) to reflect elevated risk |
| **Low volatility regime** | POM skews toward lower profit % (closer to 5–30%) — calmer conditions, tighter edge |

---

## 8. Social Layer & Reputation System

### 8.1 Trader Profile

Every wallet address that has participated in at least one settled market has a public trader profile. Profiles are derived from on-chain data — no off-chain identity is required.

**Profile data fields:**

| Field | Source | Description |
|---|---|---|
| `wallet` | On-chain | Truncated address (e.g. `0x1a2b...3c4d`) |
| `display_name` | Optional user-set | Starknet ID or custom handle |
| `tier` | Computed | ORACLE / PROPHET / TRADER / SCOUT |
| `markets_entered` | Leaderboard Contract | Total settled markets |
| `win_rate` | Leaderboard Contract | Wins / (Wins + Losses) |
| `net_pnl_sbtc` | Leaderboard Contract | Total claimed − total staked |
| `avg_stake` | Leaderboard Contract | Mean stake size across markets |
| `signal_alignment_rate` | Social Indexer | % of trades where user followed AI signal |
| `signal_alignment_accuracy` | Social Indexer | Win rate when following AI signal |
| `streak` | Social Indexer | Current consecutive win streak |
| `rank_global` | Social Indexer | Rank among all-time traders |
| `rank_weekly` | Social Indexer | Rank in current 7-day window |
| `joined` | On-chain event | First market timestamp |
| `last_active` | On-chain event | Most recent settled market |

### 8.2 Leaderboard Tiers

Tiers are computed weekly from the preceding 90 days of activity. Minimum thresholds prevent sybil-gaming with low volume.

| Tier | Requirements | Benefits |
|---|---|---|
| **ORACLE** | Top 1% by composite score · ≥50 markets | Fed into AI Signal Model · Special UI badge · Featured on front page |
| **PROPHET** | Top 5% · ≥30 markets | Fed into AI Signal Model · Profile badge |
| **TRADER** | Top 20% · ≥10 markets | Public ranking displayed |
| **SCOUT** | All active wallets | Basic profile visible |

**Composite score formula:**
```
composite_score = (win_rate × 0.40) + (net_pnl_normalized × 0.40) + (consistency_score × 0.20)
// consistency_score = 1 − std_dev(rolling_7d_win_rate) — rewards stable performance over lucky streaks
```

### 8.3 The Social Feed

The Social Feed is a real-time event stream showing market activity across the protocol, filtered by social signals:

- **"Following" feed** — activity from wallets the user follows
- **"ORACLE feed"** — all markets opened or joined by ORACLE-tier traders
- **"Trending"** — markets with rapidly growing pool sizes in the last 60 seconds

Each feed item shows:
```
[Avatar] [Tier Badge] 0x1a2b...3c4d
  → Opened UP market · 5m · 0.005 sBTC
  → Current pool: 0.031 UP | 0.014 DOWN
  → AI Signal: ↑ UP (74%)
  [JOIN THIS MARKET] button
```

### 8.4 Following & Notifications

Users can follow specific wallet addresses. Following is off-chain and does not require a transaction. Followed wallets' market activity triggers:
- Push notifications (mobile)
- In-app alerts (web)
- Feed prioritisation

Users can also set alerts for: specific tier traders opening markets, AI signal confidence above a threshold, pool sizes crossing a defined value.

### 8.5 Anti-Gaming Protections

The Social Layer uses several protections to prevent manipulation of rankings:

- **Minimum market threshold** — no tier assigned below minimums (prevents sybil accounts)
- **Stake floor** — markets below 0.001 sBTC minimum are excluded from stat tracking
- **Consistency penalty** — win rates from fewer than 10 markets are displayed with a `low sample` warning
- **Self-referral detection** — wallets that consistently appear to open and immediately counter their own markets are flagged for review
- **Vault exclusion** — the Liquidity Vault address is excluded from all trader profiles and rankings

---

## 9. Starknet & Starkzap Integration

BitDrum is built on **Starknet** and uses the **Starkzap TypeScript SDK** for all client-side blockchain interactions.

### 9.1 Why Starknet

| Property | Benefit for BitDrum |
|---|---|
| **Native Account Abstraction** | Users authenticate with email, social login, or passkeys — no seed phrase or MetaMask required |
| **Low fees** | Prediction markets with small stakes (< 0.01 BTC) are economically viable |
| **Cairo contracts** | Proven language for financial logic with built-in safety guarantees |
| **Pragma Oracle** | Native Starknet oracle for BTC/USD with sub-second latency |
| **sBTC support** | Native wrapped Bitcoin on Starknet used as the staking token |

### 9.2 Starkzap SDK Usage

Starkzap handles all wallet interaction, transaction construction, and token operations. The frontend never talks to raw Starknet RPCs.

**Authentication (via Cartridge + Starkzap):**
```typescript
import { StarkZap } from 'starkzap';

const zap = new StarkZap({
  network: 'sepolia',
});

const wallet = await zap.connectCartridge({
  preset: process.env.NEXT_PUBLIC_CARTRIDGE_PRESET,
});

await wallet.ensureReady({ deploy: 'if_needed' });
```

**Opening a market:**
```typescript
const tx = await zap.contracts.predictionMarket.openMarket({
  direction: 'UP',
  duration: 60,        // 1 minute in seconds
  stakeAmount: '500000000000000',  // 0.0005 sBTC in wei
  strikePriceAttestation: oracleAttestation,
});

const result = await zap.transactions.execute(tx);
```

**Claiming a payout:**
```typescript
const claim = await zap.contracts.predictionMarket.claimPayout({
  marketId: '0xabc123...',
});
await zap.transactions.execute(claim);
```

**Checking token balance:**
```typescript
const balance = await zap.tokens.erc20.balance({
  token: 'sBTC',
  address: wallet.address,
});
```

### 9.3 Wallet Options (via Starkzap)

| Wallet Type | Auth Method | Best For |
|---|---|---|
| **Cartridge Controller** | Google, passkeys, device biometrics | Default BitDrum onboarding with guided approvals |
| **Argent** | Seed phrase or biometrics | Future expansion for existing Starknet users |
| **Braavos** | Seed phrase or biometrics | Future expansion for existing Starknet users |

### 9.4 Gasless Transactions (AVNU Paymaster)

BitDrum integrates **AVNU Paymaster** via Starkzap to allow users to pay transaction fees in sBTC rather than STRK. For ORACLE and PROPHET tier traders, the protocol may optionally subsidize gas fees entirely as a retention incentive, paid from the treasury's AI & infrastructure fund.

```typescript
const zap = new StarkZap({
  network: 'mainnet',
  paymaster: {
    type: 'avnu',
    apiKey: process.env.AVNU_API_KEY,
    gasToken: 'sBTC',  // Pay gas in sBTC, not STRK
  },
});
```

---

## 10. User Flows

### 10.1 New User (First-Time, No Crypto Experience)

```
1. Opens BitDrum web or mobile app

2. Clicks "Connect Cartridge"
   → Cartridge Controller modal appears
   → Signs in with Google or a passkey
   → Controller wallet is connected and deployed if needed

3. Sees tutorial overlay:
   → "Deposit sBTC to start trading"
   → Starkzap handles STRK → sBTC swap if needed
   → Or direct sBTC deposit from exchange

4. Lands on Live Market Feed:
   → Active markets with countdown timers
   → Pool sizes and profit rates per side
   → AI Signal cards for each market (direction label — free tier)

5. Picks a market:
   → Sees free-tier AI Signal: "↑ BULLISH"
   → Sees Profit Display: "UP wins → +52% profit | DOWN wins → +38% profit"
   → Sees clear risk notice: "Wrong direction = 100% stake lost"
   → Decides to stake 0.001 sBTC on UP

6. Stakes:
   → Enters amount
   → App shows: "If UP wins you receive 0.00152 sBTC · If DOWN wins you receive 0.00000 sBTC"
   → Clicks "Stake UP"
   → Starkzap builds and signs transaction
   → Gasless via AVNU (user pays in sBTC)
   → Transaction confirms in ~2 seconds on Starknet

7. Waits for expiry:
   → Countdown timer visible
   → Live BTC price chart with strike price line marked
   → Profit rate locked — no changes during wait

8. Market settles:
   → WIN: Claim button appears — "Claim 0.00152 sBTC (+52%)"
   → LOSS: Market closes — "Result: DOWN won · 0.00000 sBTC"

9. Claims winnings:
   → One-tap claim
   → sBTC lands in wallet immediately

10. Profile updated:
    → First win recorded on Leaderboard Registry
    → SCOUT tier badge assigned
    → AI Agent starts tracking this wallet
```

---

### 10.2 Experienced Trader — Signal-Led Workflow

```
1. Opens Signal Elite subscription dashboard
   → Sees real-time ORACLE-trader alert: "3 ORACLE wallets opened UP in last 90s"

2. Checks full AI Signal for the most active market:
   → "↑ UP · 82% confidence · 8 of 10 Oracle traders aligned"
   → Sees rationale: "Strong momentum channel, low ATR, high top-trader concentration"

3. Reviews profit display:
   → "UP wins → +34% profit on stake"
   → "DOWN wins → +67% profit on stake"
   → Notes the higher profit on DOWN — contrarian opportunity flag visible

4. Decides to take the contrarian position (DOWN) for higher profit rate

5. Stakes 0.01 sBTC on DOWN during joining window
   → App confirms: "If DOWN wins you receive 0.0167 sBTC · If UP wins you receive 0.00000 sBTC"
   → POM is now locked at +67% for DOWN on this market

6. Market locks — joining window closes

7. BTC drops 0.08% in the 1-minute window — DOWN wins

8. Claims payout:
   → 0.01 sBTC stake + (0.01 × 0.67) = 0.0167 sBTC
   → Net profit: +0.0067 sBTC (+67% on stake)

9. Profile updated:
   → Net P&L increases
   → Win streak increments
   → Signal alignment rate tracked (went against signal direction but won)
   → Composite score recalculated — accuracy and P&L both improve
```

---

### 10.3 Leaderboard Climber — Social Loop

```
1. Trader has 45 markets played, 62% win rate, net +0.18 sBTC
   → Currently TRADER tier, rank #312

2. Checks what separates them from PROPHET tier:
   → Needs 30 more markets, win rate must stay above threshold
   → Consistency score is low — too many impulsive off-signal trades

3. Subscribes to Signal Pro ($9.99/month in sBTC)
   → Now sees full confidence scores, rationale, and accuracy history
   → Begins following signals more consistently — consistency score improves

4. After 30 more markets: promoted to PROPHET tier
   → Badge displayed on profile
   → Their on-chain positioning now feeds into AI Signal model

5. Other users start following their wallet:
   → Their market opens appear in ORACLE feed for followers
   → Community effect: more users join their markets → more loser stakes flow to vault
   → Bigger pools → more protocol revenue

6. Reaches ORACLE tier after continued performance:
   → Upgraded to Signal Elite (free — ORACLE subsidised by treasury)
   → Begins receiving monthly share of ORACLE Tier Reward Pool (20% of Signal Elite revenue)
   → Effectively gets paid for trading well — the more Signal Elite subscribers, the larger the reward

7. Protocol benefits:
   → More ORACLE data → better AI signals → more Signal subscribers
   → More subscribers → larger reward pool → more incentive to trade honestly at the top
```

---

### 10.4 Signal Subscription Purchase Flow

```
1. New user has been trading for 2 weeks on the Free tier
   → Sees signal direction labels but no confidence, rationale, or accuracy data
   → Notices a market where the direction label contradicts the pool positioning
   → Wants to see why — clicks "Upgrade for full signal"

2. Subscription modal opens:
   → Signal Pro: $9.99/month — confidence + rationale + history
   → Signal Elite: $24.99/month — Pro + ORACLE trader alerts
   → Both show: "Paid in sBTC · Non-custodial · Cancel anytime"

3. User selects Signal Pro
   → App calculates sBTC equivalent at current BTC/USD rate
   → Starkzap constructs subscription transaction:
       zap.contracts.signalSubscription.subscribe({ tier: 'PRO' })
   → Post-condition: wallet balance decreases by exactly the sBTC subscription fee
   → User signs — transaction confirms in ~2 seconds

4. Access granted immediately:
   → Signal cards now show: confidence score, rationale paragraph, 30d accuracy
   → All existing open markets refresh with full signal data
   → Subscription status visible in account settings

5. Renewal at 30 days:
   → App shows reminder 3 days before renewal date
   → User must re-sign the renewal transaction (no silent auto-charge)
   → If user does not renew: access reverts to Free tier at period end
   → All trade history and social profile data is preserved

6. ORACLE Tier reward (if applicable):
   → At month end, the Subscription Distributor triggers distribute_oracle_rewards()
   → ORACLE-tier wallets receive proportional sBTC share based on their TIS weight
   → Payment appears in wallet with on-chain event: "Signal Reward: +0.0023 sBTC"
```

### 11.1 On-Chain Data (Source of Truth)

All financial data lives on Starknet and is immutable.

| Contract | Data Stored | Read By |
|---|---|---|
| Prediction Market | Market states, stakes, pools, strike prices | Frontend, Keeper, Social Indexer |
| Settlement Engine | Settlement outcomes, payout records | Frontend, Social Indexer |
| Liquidity Vault | Vault positions, replenishment history | Frontend |
| Treasury | Fee accumulation, allocation history | Frontend, Analytics |
| Leaderboard Registry | Per-wallet win/loss/P&L stats | Social Indexer, AI Agent, Frontend |

### 11.2 Off-Chain Data (Derived & Indexed)

The **Social Indexer** is an off-chain service that listens to Starknet events and maintains a fast, queryable database of derived metrics.

| Table | Contents | TTL |
|---|---|---|
| `trader_profiles` | Enriched profiles with computed scores | Updated on each settled market |
| `leaderboard_snapshots` | Weekly and all-time ranking snapshots | Refreshed every 10 minutes |
| `signal_log` | All AI signals generated, with outcomes | Permanent |
| `signal_accuracy` | Rolling accuracy metrics per signal type | Recomputed daily |
| `social_follows` | Off-chain follow graph | Persistent, user-deletable |
| `market_history` | Enriched market metadata for analysis | Permanent |

### 11.3 AI Agent Data Stores

| Store | Contents | Purpose |
|---|---|---|
| `feature_cache` | Computed feature vectors per market | Fast inference without recomputing |
| `model_weights` | Signal inference model weights | Loaded on service start, updated weekly |
| `top_trader_positions` | Current open positions of qualifying traders | Core input to signal engine |
| `pom_cache` | Latest POM estimate per active market | Served to frontend via WebSocket |

---

## 12. Economic Model

### 12.1 Revenue Streams

| Source | Rate | Flows To |
|---|---|---|
| Protocol fee | 2% of every settled pool | Treasury |
| Signal Pro subscriptions | $9.99/month per subscriber (in sBTC) | Signal Revenue Pool |
| Signal Elite subscriptions | $24.99/month per subscriber (in sBTC) | Signal Revenue Pool |
| Vault margin | Spread between 100% loser absorption and ≤70% winner payout | Liquidity Vault |

### 12.2 Vault Economics — The Protocol's Structural Edge

The vault's edge is the guaranteed spread between what losers lose (100%) and what winners receive (max 70%):

```
At 50/50 pool split, avg POM = 45%:

  Total pool:       1.00 sBTC
  Losing side:      0.50 sBTC → absorbed by vault
  Winning side profit payout: 0.50 × 0.45 = 0.225 sBTC → paid by vault
  Winner stake returns:       0.50 sBTC → returned from escrow (not vault)

  Vault net gain:   0.50 − 0.225 = +0.275 sBTC per 1 sBTC of volume

  Before protocol fee (2%):
    Fee = 1.00 × 0.02 = 0.02 sBTC → Treasury
    Vault net after fee: +0.255 sBTC
```

The vault is structurally profitable at any POM cap below 100%, which the 70% ceiling guarantees. Even at the maximum POM of 70% and a 50/50 pool split, the vault earns 30 cents per sBTC of volume.

### 12.3 Treasury Allocation

```
2% protocol fee from every settled market:

  40% → Liquidity Vault replenishment
  35% → AI & infrastructure fund
  25% → Protocol development reserve

Signal Revenue Pool (subscription income):

  50% → Protocol Treasury
  30% → AI model improvement fund (compute, retraining)
  20% → ORACLE-tier trader reward pool
```

### 12.4 Fee Sustainability Model

At steady-state volume of **1,000 markets/day**, average pool **0.02 sBTC**, avg POM **40%**, 50/50 split:

```
Daily pool volume:           20 sBTC
Protocol fee (2%):            0.40 sBTC/day
Vault gross margin:           20 × 0.50 × (1 − 0.40) = 6.0 sBTC/day
Less vault fee contribution:  −0.16 sBTC (40% of 0.40)
Vault net daily:              5.84 sBTC

Monthly treasury from fees:   12 sBTC
Monthly vault funding (40%):   4.8 sBTC → vault reserve
Monthly AI infra (35%):        4.2 sBTC
Monthly dev reserve (25%):     3.0 sBTC

Signal subscriptions (est. 500 Signal Pro + 100 Signal Elite):
  Monthly: (500 × 9.99) + (100 × 24.99) = $7,494 in sBTC
  Treasury share (50%): ~$3,747 equivalent
```

### 12.5 Dynamic Payout — Protocol Alignment

The fixed-outcome model directly aligns the protocol's financial health with user volume:
- Higher volume → more losing stakes flow to vault → deeper vault reserves
- Deeper vault → protocol can handle larger markets and more simultaneous open positions
- Better-funded vault → no market voids → better UX → more users
- More users → more signal subscribers → more ORACLE-tier trader rewards → better AI signals

The AI agent subscription revenue breaks the pure volume-dependency by adding a recurring SaaS revenue layer that grows with user engagement rather than just trading volume.

---

## 13. Security Model

### 13.1 Non-Custodial Architecture

No BitDrum contract, administrator, AI agent, or keeper ever has unilateral access to user funds. Stakes are locked in the prediction market contract and can only exit through:
1. A settlement payout (winning claim)
2. A DRAW refund

No emergency withdrawal, admin override, or AI-triggered fund movement exists by design.

### 13.2 AI Agent Isolation

The AI Agent System is **fully isolated from the smart contract layer**. It:
- Has no private keys with on-chain permissions
- Cannot submit transactions to any protocol contract
- Cannot alter oracle prices, settlement logic, or payout calculations
- Can only read public on-chain data and serve API responses to the frontend

If the AI Agent service goes offline, the protocol continues to function normally. Markets open, settle, and pay out without any dependency on the AI layer.

### 13.3 Social Layer Isolation

The Social Leaderboard Registry contract is **append-only** from the settlement engine's perspective. The Social Indexer reads from it — it cannot write to it. All writes to the registry come only from the Settlement Engine contract at settlement time.

### 13.4 Oracle Security

- **Pull oracle model**: Keeper fetches a signed price attestation from Pragma Oracle at settlement
- **Signature verification**: Smart contract verifies the Pragma signing key before accepting any price
- **Staleness protection**: Price attestations older than 30 seconds are rejected — keeper must retry with a fresh attestation
- **Strike price immutability**: Strike price is recorded on-chain at market open, included in the opening transaction data, and cannot be altered post-confirmation

### 13.5 Keeper Trust Model

The keeper is a convenience bot — not a trust dependency. Settlement logic is entirely in the smart contract. If the keeper:
- Goes offline → users can manually trigger settlement by calling the contract directly
- Submits a stale price → the smart contract rejects the transaction
- Submits the wrong market ID → the contract validates against stored market data

Anyone in the world can trigger settlement on any expired market. The keeper simply does it automatically.

### 13.6 Starknet Account Abstraction Security

Starkzap leverages Starknet's native account abstraction for security benefits:
- **Post-condition protection**: Every transaction specifies exactly how funds should move. A mismatched outcome causes automatic rejection before execution.
- **Controller approvals (Cartridge)**: Transactions are approved directly through Cartridge Controller, and optional session keys can later scope repeated actions.
- **Account deployment safety**: The frontend ensures controller accounts are deployed before trading, preventing partial execution flows for new wallets.

---

## 14. Frontend Architecture

### 14.1 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Blockchain | Starkzap SDK (TypeScript) |
| State management | Zustand + React Query |
| Real-time data | WebSocket (market feed, POM, social feed) |
| Charts | TradingView Lightweight Charts (BTC price) |
| Mobile | React Native (Expo) with Starkzap SDK |

### 14.2 Page Structure

```
/                       → Home / Live Market Feed
/market/:id             → Single market detail + AI signal + POM + profit display
/leaderboard            → Global rankings + tier overview
/profile/:address       → Trader profile page
/signals                → AI Signal history and accuracy stats
/portfolio              → User's own trade history and P&L
/deposit                → sBTC deposit via Starkzap token ops
/subscribe              → Signal Pro / Signal Elite subscription management
```

### 14.3 Real-Time Data Flow

```
Starknet Events (WebSocket via StarkZap)
    │
    ├── New market opened → Update market feed
    ├── Stake added → Update pool sizes + POM
    ├── Market locked → Update state display
    └── Market settled → Update outcomes + social stats

AI Agent WebSocket (/stream/signals, /stream/pom)
    │
    ├── New signal generated → Update signal card
    └── POM updated → Update multiplier display (5s refresh)

Social Indexer WebSocket (/stream/feed)
    └── New market activity from followed wallets → Update feed
```

### 14.4 Wallet Connection UX

BitDrum defaults to Cartridge Controller onboarding. The frontend calls Starkzap's `connectCartridge()` helper, then waits for the controller account to be ready before any trade is submitted. Additional wallet connectors can be added later, but the current production path is Cartridge-only.

---

## 15. Backend & Keeper Infrastructure

### 15.1 Services Overview

| Service | Language | Role |
|---|---|---|
| **Keeper Bot** | TypeScript / Node.js | Settlement automation (3s polling) |
| **AI Agent Service** | Python (FastAPI) | Signal + POM inference |
| **Social Indexer** | TypeScript / Node.js | On-chain event processing + leaderboard DB |
| **API Gateway** | Node.js / Express | Unified REST + WebSocket entry point; subscription tier gating |
| **Subscription Distributor** | TypeScript / Node.js | Monthly ORACLE reward pool distribution trigger |

### 15.2 Keeper Bot

```
Loop (every 3 seconds):
  1. Query Starknet: get all markets where state == LOCKED and expiry_block <= current_block
  2. For each expired market:
     a. Fetch signed BTC/USD attestation from Pragma Oracle
     b. Verify attestation age < 30 seconds
     c. Submit settlement transaction to Starknet via Starkzap server SDK
     d. Log settlement event
  3. Check vault exposure — replenish if below threshold
  4. Emit settled market IDs to Social Indexer and AI Agent via internal event bus
```

### 15.3 AI Agent Service

- **Language**: Python with FastAPI
- **Inference**: ONNX runtime for the time-series classifier; OpenAI API (or self-hosted LLM) for natural language rationale generation
- **Signal scheduling**: Generated at market open, refreshed every 30 seconds during joining window
- **POM scheduling**: Computed once when the joining window closes — written to the smart contract as part of the lock transaction; not dynamically updated after that point
- **Subscription gating**: API Gateway reads `subscriptions` contract state to determine whether to serve full signal fields or free-tier direction label only

### 15.4 Social Indexer

- **Language**: TypeScript / Node.js
- **Event source**: Starknet event stream via Starknet.js
- **Database**: PostgreSQL (trader stats, leaderboard snapshots, signal log, social graph)
- **Cache**: Redis (live leaderboard rankings, active feed events)
- **Indexing latency**: < 5 seconds from on-chain event to database update

---

## 16. Deployment & Environment Strategy

### 16.1 Environments

| Environment | Network | Purpose |
|---|---|---|
| **Development** | Starknet Sepolia testnet | Local development and feature testing |
| **Staging** | Starknet Sepolia testnet | QA, integration testing, partner review |
| **Production** | Starknet Mainnet | Live user traffic |

### 16.2 Infrastructure

All backend services deployed on cloud infrastructure with:
- **Containerization**: Docker + Docker Compose per service
- **Orchestration**: Kubernetes (production) for auto-scaling and health management
- **Monitoring**: Datadog for latency, error rates, and keeper uptime
- **Alerting**: PagerDuty for keeper downtime > 15 seconds or oracle attestation failures

### 16.3 Smart Contract Deployment

1. Contracts written and tested in Cairo using Starknet Foundry
2. Deployed to Sepolia for staging validation
3. Security audit before mainnet deployment
4. Mainnet deployment via multisig — no single developer can deploy unilaterally
5. Contracts verified on Starkscan block explorer
6. Contract addresses published in open-source repository

### 16.4 Upgradability Policy

Smart contracts are **not upgradeable by default**. If a critical bug requires a contract fix:
1. New contract version is deployed
2. Existing markets settle on the old contract
3. Users are migrated to the new contract UI
4. Old contract remains live for historical claim resolution

No admin function can pause settlement, freeze funds, or alter payout math in any deployed contract version.

---

## 17. Glossary

| Term | Definition |
|---|---|
| **sBTC** | Wrapped Bitcoin on Starknet — the primary staking token in BitDrum |
| **Strike Price** | The BTC/USD price recorded on-chain at the moment a market opens |
| **Fixed-Outcome Model** | BitDrum's payout structure: correct call earns stake + up to 70% profit; wrong call loses 100% of stake |
| **POM** | Probable Outcome Multiplier — the AI-determined profit percentage (5%–70%) a winner receives on their stake |
| **POM Cap** | The hard ceiling of +70% profit on a winning stake — cannot be exceeded regardless of pool conditions |
| **Keeper** | Automated bot that polls Starknet every 3 seconds and triggers settlement on expired markets |
| **Pull Oracle** | A price oracle model where the price is fetched and submitted on-demand, not pushed continuously |
| **Pragma Oracle** | Starknet-native decentralized price oracle used by BitDrum for BTC/USD settlement prices |
| **Liquidity Vault** | Protocol-owned reserve that funds winner payouts and absorbs loser stakes; structurally profitable due to POM cap |
| **Vault Margin** | The spread between 100% loser absorption and ≤70% winner profit payout — the protocol's structural edge |
| **TIS** | Trader Influence Score — a metric determining how heavily a top trader's positioning is weighted in the AI signal |
| **AI Signal Agent** | The AI system that aggregates top-trader behaviour and generates directional trading signals |
| **Signal Pro** | Paid subscription tier ($9.99/month) unlocking full AI signal: confidence score, rationale, accuracy history |
| **Signal Elite** | Premium subscription tier ($24.99/month) unlocking Signal Pro plus real-time ORACLE-trader position alerts |
| **Signal Revenue Pool** | Revenue from Signal subscriptions split between Treasury, AI fund, and ORACLE-tier trader rewards |
| **ORACLE Tier Reward Pool** | 20% of Signal Elite revenue distributed monthly to ORACLE-tier traders whose positioning feeds the AI model |
| **Composite Score** | The ranking metric used to assign leaderboard tiers: 40% win rate + 40% net P&L + 20% consistency |
| **ORACLE Tier** | Top 1% of traders by composite score with ≥50 markets — their positioning feeds directly into the AI model |
| **Starkzap SDK** | TypeScript SDK for building Starknet consumer applications — handles wallet auth, token ops, and transaction construction |
| **Account Abstraction** | Starknet's native feature allowing any wallet to define its own signing logic — enables social login and gasless transactions |
| **AVNU Paymaster** | Service integrated via Starkzap that allows users to pay gas fees in sBTC instead of STRK |
| **Social Indexer** | Off-chain service that listens to Starknet events and builds enriched trader profiles and leaderboard data |
| **Leaderboard Registry** | On-chain contract storing verifiable win/loss/P&L data per wallet — the source of truth for all social layer rankings |
| **Signal Accuracy Log** | Database record of every AI signal generated and its eventual accuracy — used to retrain and recalibrate the model |
| **DRAW** | A settlement outcome where the final BTC price equals the strike price — all participants receive a full refund |
| **Joining Window** | The period after market open during which other users can stake on either side (≈ 1/3 of total duration) |

---

> **BitDrum — trustless prediction markets, intelligent signals, and a community of on-chain traders.**
>
> *Built on Starknet. Powered by Starkzap. Guided by AI. Ranked by the market. Capped at 70. All or nothing.*
