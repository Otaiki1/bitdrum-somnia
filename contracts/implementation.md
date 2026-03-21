# Contracts Implementation Details

## Objectives

Implement the core logic of BitDrum on Starknet using Cairo. The system must be trustless, non-custodial, and verifiable.

## Implementation Steps

### 1. Market Lifecycle (PredictionMarket.cairo)
- Define `MarketState`: OPEN, LOCKED, SETTLED, CLAIMABLE, CLOSED.
- Functions: `open_market`, `join_market`, `lock_market`.
- Ensure users can only join during the `JOINING_WINDOW`.

### 2. Oracle Integration (SettlementEngine.cairo)
- Integrate **Pragma Oracle**'s pull model.
- Function: `settle(market_id, price_attestation)`.
- Validate attestation age and signature.

### 3. Payout Calculation (POM Logic)
- Apply the stored `pom_profit_pct` at settlement.
- Logic: `Winner_payout = stake + (stake * profit_pct / 10000)`.

### 4. Liquidity & Fees (Vault & Treasury)
- **Vault**: Automatically take the opposite side of the opener.
- **Treasury**: Deposit 2% protocol fee upon settlement.
- **Allocation**: 40% Vault, 35% AI fund, 25% Dev fund.

### 5. Reputation (LeaderboardRegistry.cairo)
- Update `TraderStats` (wins, losses, net P&L) during `settle`.

## Required Criteria

- [ ] All contracts must be written in **Cairo 1.x**.
- [ ] No single EOA should have access to user funds.
- [ ] Price attestations older than 30 seconds must be rejected.
- [ ] POM profit percentage must be strictly between 5% and 70%.
- [ ] 100% loss for the losing side must be correctly absorbed by the vault.
- [ ] Unit tests must cover all state transitions and edge cases (DRAW, empty pools).
