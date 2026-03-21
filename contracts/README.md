# BitDrum Core Contracts

This directory contains the Cairo smart contracts that power the BitDrum protocol on Starknet. These contracts are the source of truth for all market data, user stakes, and settlement logic.

## Contracts Overview

- **PredictionMarket**: Manages market lifecycle (Open, Join, Lock, Claim).
- **SettlementEngine**: Uses Pragma Oracle to compute outcomes and payout flags.
- **LiquidityVault**: Acts as the protocol's counterparty and manages the profit/loss pool.
- **Treasury**: Collects fees and redistributes funds to Vault and AI funds.
- **LeaderboardRegistry**: Stores on-chain trader performance statistics.
- **SignalSubscription**: Manages tiered access for Signal Pro and Signal Elite.

## Tools
- **Scarb**: Package management and compilation.
- **Starknet Foundry**: Testing and deployment.
- **Pragma Oracle**: External price feed integration.
