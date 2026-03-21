# BitDrum Keeper Bot

The Keeper Bot is an automation service responsible for polling Starknet for expired markets and triggering the settlement process. It ensures that payouts are processed as soon as a market expires.

## Role in the System
- Monitors market expiry block/timestamp.
- Fetches real-time price attestations from Pragma Oracle.
- Submits `settle` transactions to the Settlement Engine.

## Stack
- Node.js / TypeScript
- Starkzap Server SDK
- Pragma SDK
