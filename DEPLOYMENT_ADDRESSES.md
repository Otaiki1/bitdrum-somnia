# BitDrum Somnia Deployment Addresses

**Last Updated**: 2026-04-03  
**Network**: Somnia (Testnet: Shannon ID 50312 | Mainnet ID 5031)

---

## Testnet (Shannon) - Deployment Status: ⏳ Pending Phase 1

### Smart Contracts

| Contract | Address | Explorer | Verified | Notes |
|----------|---------|----------|----------|-------|
| PredictionMarket | `0x[TBD]` | [Link](#) | ⏳ | Core market logic |
| SettlementEngine | `0x[TBD]` | [Link](#) | ⏳ | Oracle settlement |
| LiquidityVault | `0x[TBD]` | [Link](#) | ⏳ | Counterparty funding |
| Treasury | `0x[TBD]` | [Link](#) | ⏳ | Fee allocation |
| LeaderboardRegistry | `0x[TBD]` | [Link](#) | ⏳ | Trader stats |
| SubscriptionsContract | `0x[TBD]` | [Link](#) | ⏳ | Signal tier gating |

### External Contracts (Already on Somnia Shannon)

| Contract | Address | Purpose |
|----------|---------|---------|
| WBTC (ERC-20) | `0x[find]` | Staking token |
| DIA Oracle | `0x[find]` | Primary price feed |
| Protofire Oracle | `0x[find]` | Fallback price feed |
| EntryPoint v0.7 | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` | ERC-4337 |

### Backend Services URLs

| Service | URL | Status |
|---------|-----|--------|
| API Gateway | `http://localhost:3001/api` | ⏳ |
| AI Agent | `http://localhost:8000` | ⏳ |
| WebSocket | `ws://localhost:3001/ws` | ⏳ |

### Environment Variables (Testnet)

```bash
# Contracts
NEXT_PUBLIC_PREDICTION_MARKET_ADDR=0x[TBD]
NEXT_PUBLIC_SETTLEMENT_ENGINE_ADDR=0x[TBD]
NEXT_PUBLIC_LIQUIDITY_VAULT_ADDR=0x[TBD]
NEXT_PUBLIC_TREASURY_ADDR=0x[TBD]
NEXT_PUBLIC_LEADERBOARD_REGISTRY_ADDR=0x[TBD]
NEXT_PUBLIC_SUBSCRIPTIONS_ADDR=0x[TBD]
NEXT_PUBLIC_WBTC_ADDR=0x[find]

# Oracles
DIA_ORACLE_ADDR=0x[find]
PROTOFIRE_ORACLE_ADDR=0x[find]

# RPC & Chain
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
NEXT_PUBLIC_CHAIN_ID=50312
```

---

## Mainnet - Deployment Status: ⏳ Pending Phase 5

### Smart Contracts

| Contract | Address | Explorer | Verified | Deployment Date |
|----------|---------|----------|----------|-----------------|
| PredictionMarket | `0x[TBD]` | [Link](#) | ⏳ | TBD |
| SettlementEngine | `0x[TBD]` | [Link](#) | ⏳ | TBD |
| LiquidityVault | `0x[TBD]` | [Link](#) | ⏳ | TBD |
| Treasury | `0x[TBD]` | [Link](#) | ⏳ | TBD |
| LeaderboardRegistry | `0x[TBD]` | [Link](#) | ⏳ | TBD |
| SubscriptionsContract | `0x[TBD]` | [Link](#) | ⏳ | TBD |

### External Contracts (Already on Somnia Mainnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| WBTC (ERC-20) | `0x[find]` | Staking token |
| DIA Oracle | `0x[find]` | Primary price feed |
| Protofire Oracle | `0x[find]` | Fallback price feed |
| EntryPoint v0.7 | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` | ERC-4337 |
| Gnosis Safe | `0x[TBD]` | Multisig for deployment |

### Backend Services URLs (Mainnet)

| Service | URL | Status |
|---------|-----|--------|
| API Gateway | `https://api.bitdrum.xyz` | ⏳ |
| AI Agent | `https://ai.bitdrum.xyz` | ⏳ |
| WebSocket | `wss://api.bitdrum.xyz/ws` | ⏳ |
| Frontend | `https://bitdrum.xyz` | ⏳ |

### Environment Variables (Mainnet)

```bash
# Contracts
NEXT_PUBLIC_PREDICTION_MARKET_ADDR=0x[TBD]
NEXT_PUBLIC_SETTLEMENT_ENGINE_ADDR=0x[TBD]
NEXT_PUBLIC_LIQUIDITY_VAULT_ADDR=0x[TBD]
NEXT_PUBLIC_TREASURY_ADDR=0x[TBD]
NEXT_PUBLIC_LEADERBOARD_REGISTRY_ADDR=0x[TBD]
NEXT_PUBLIC_SUBSCRIPTIONS_ADDR=0x[TBD]
NEXT_PUBLIC_WBTC_ADDR=0x[TBD]

# Oracles
DIA_ORACLE_ADDR=0x[TBD]
PROTOFIRE_ORACLE_ADDR=0x[TBD]

# RPC & Chain
SOMNIA_RPC_URL=https://api.infra.mainnet.somnia.network
NEXT_PUBLIC_CHAIN_ID=5031

# API URLs
NEXT_PUBLIC_API_URL=https://api.bitdrum.xyz
NEXT_PUBLIC_WS_URL=wss://api.bitdrum.xyz/ws
```

---

## Deployment Checklist

### Before Testnet Deployment (Phase 1)
- [ ] All contracts pass `forge test`
- [ ] All contracts compile without warnings
- [ ] Deployment script ready (`script/Deploy.s.sol`)
- [ ] Testnet RPC endpoint verified working
- [ ] Deployer account funded with STT (gas)

### Before Mainnet Deployment (Phase 5)
- [ ] Security audit passed
- [ ] All Phase 4 tests passing
- [ ] Contracts verified on Testnet Explorer
- [ ] Mainnet RPC endpoint verified working
- [ ] Multisig signers ready (2-of-3)
- [ ] Gas price estimated
- [ ] Deployment script ready for mainnet
- [ ] Backup of all private keys (hardware wallet or vault)

---

## Contract Addresses Discovery

### Finding WBTC on Somnia

```bash
# Testnet
curl https://shannon-explorer.somnia.network/api?module=account&action=getERC20Tokens&address=0x...

# Mainnet
curl https://explorer.somnia.network/api?module=account&action=getERC20Tokens&address=0x...
```

### DIA Oracle Address

Check official DIA Docs: https://docs.diadata.org

For Somnia mainnet and testnet, query:
```bash
cast call 0x... "getValue(string)" '"BTC/USD"' \
  --rpc-url https://dream-rpc.somnia.network
```

---

## Updating This Document

**After each major deployment**:
1. Record contract addresses with explorer links
2. Update environment variables sections
3. Mark verification status
4. Include deployment date + commit hash
5. Commit with: `git commit -am "deploy: record <phase> contract addresses"`

---

**Template Version**: 1.0  
**Status**: Awaiting Phase 1 Deployment  
**Next Update**: After Phase 1 Testnet Deployment
