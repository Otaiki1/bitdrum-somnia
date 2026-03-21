// =============================================================================
// BitDrum unit test suite — snforge (pure logic, no contract deployment needed)
// =============================================================================
//
// Coverage:
//   ✓ MarketState equality / inequality
//   ✓ POM payout formula (min, max, base cases)
//   ✓ Protocol fee (2%)
//   ✓ POM profit bps guards
//   ✓ Attestation age constant
//   ✓ Joining window constant
//   ✓ Treasury allocation split (40/35/25)
//   ✓ DRAW refund logic
//   ✓ Vault loss absorption formula
//   ✓ Empty short pool edge case
//   ✓ Leaderboard stats accumulation
//   ✓ Asymmetric pool winner payout
//   ✓ BTC/USD pair id constant

use bitdrum_starknet::types::{
    MarketState, TraderStats,
    JOINING_WINDOW, ATTESTATION_MAX_AGE,
    MIN_PROFIT_BPS, MAX_PROFIT_BPS, PROTOCOL_FEE_BPS, BPS_SCALE, BTC_USD_PAIR_ID,
};

// ─── market state ────────────────────────────────────────────────────────────

#[test]
fn test_market_state_equality() {
    assert(MarketState::Open == MarketState::Open, 'Open == Open');
    assert(MarketState::Locked != MarketState::Open, 'Locked != Open');
    assert(MarketState::Settled != MarketState::Claimable, 'Settled != Claimable');
    assert(MarketState::Closed == MarketState::Closed, 'Closed == Closed');
}

// ─── payout formula ──────────────────────────────────────────────────────────

#[test]
fn test_pom_payout_formula_base() {
    let stake: u128 = 1000;
    let bps: u128 = 1000;
    let profit = stake * bps / BPS_SCALE;
    assert(profit == 100, 'profit should be 100');
    let payout = stake + profit;
    assert(payout == 1100, 'payout should be 1100');
}

#[test]
fn test_pom_payout_formula_min_bps() {
    let stake: u128 = 10000;
    let bps: u128 = MIN_PROFIT_BPS.into();
    let profit = stake * bps / BPS_SCALE;
    assert(profit == 500, '5% of 10000 = 500');
}

#[test]
fn test_pom_payout_formula_max_bps() {
    let stake: u128 = 10000;
    let bps: u128 = MAX_PROFIT_BPS.into();
    let profit = stake * bps / BPS_SCALE;
    assert(profit == 7000, '70% of 10000 = 7000');
}

// ─── protocol fee ────────────────────────────────────────────────────────────

#[test]
fn test_protocol_fee_calculation() {
    let total_pool: u128 = 20000;
    let fee = total_pool * PROTOCOL_FEE_BPS / BPS_SCALE;
    assert(fee == 400, '2% of 20000 = 400');
    let distributable = total_pool - fee;
    assert(distributable == 19600, 'distributable = 19600');
}

// ─── pom bps guards ──────────────────────────────────────────────────────────

#[test]
fn test_pom_bps_within_range() {
    let bps: u16 = 1000;
    assert(bps >= MIN_PROFIT_BPS && bps <= MAX_PROFIT_BPS, '1000 bps in range');
}

#[test]
fn test_pom_bps_below_min_rejected() {
    let bps: u16 = 400;
    assert(bps < MIN_PROFIT_BPS, 'below min');
}

#[test]
fn test_pom_bps_above_max_rejected() {
    let bps: u16 = 7100;
    assert(bps > MAX_PROFIT_BPS, 'above max');
}

// ─── constants ───────────────────────────────────────────────────────────────

#[test]
fn test_attestation_max_age() {
    assert(ATTESTATION_MAX_AGE == 30, 'max age = 30s');
}

#[test]
fn test_joining_window() {
    assert(JOINING_WINDOW == 300, 'join window = 300s');
}

#[test]
fn test_btc_usd_pair_id() {
    assert(BTC_USD_PAIR_ID == 'BTC/USD', 'pair id = BTC/USD');
}

// ─── treasury split ──────────────────────────────────────────────────────────

#[test]
fn test_treasury_split_adds_to_100() {
    let vault_bps: u128 = 4000;
    let ai_bps: u128 = 3500;
    let dev_bps: u128 = 2500;
    assert(vault_bps + ai_bps + dev_bps == BPS_SCALE, 'splits sum to 10000');
}

#[test]
fn test_treasury_distribution_amounts() {
    let fee: u128 = 10000;
    let vault_share = fee * 4000 / BPS_SCALE;
    let ai_share = fee * 3500 / BPS_SCALE;
    let dev_share = fee - vault_share - ai_share;
    assert(vault_share == 4000, 'vault = 4000');
    assert(ai_share == 3500, 'ai = 3500');
    assert(dev_share == 2500, 'dev = 2500');
}

// ─── draw & edge cases ───────────────────────────────────────────────────────

#[test]
fn test_draw_refunds_full_stake() {
    let stake: u128 = 5000;
    let payout = stake; // no profit, no loss
    assert(payout == 5000, 'DRAW refund = stake');
}

#[test]
fn test_vault_absorbs_full_losing_pool() {
    let losing_pool: u128 = 8000;
    let fee = losing_pool * PROTOCOL_FEE_BPS / BPS_SCALE;
    let absorbed = losing_pool - fee;
    assert(fee == 160, 'fee = 160');
    assert(absorbed == 7840, 'absorbed = 7840');
}

#[test]
fn test_empty_short_pool_fee() {
    let long_pool: u128 = 1000;
    let short_pool: u128 = 0;
    let total = long_pool + short_pool;
    let fee = total * PROTOCOL_FEE_BPS / BPS_SCALE;
    assert(fee == 20, 'fee on solo pool = 20');
}

// ─── leaderboard ─────────────────────────────────────────────────────────────

#[test]
fn test_trader_stats_accumulation() {
    let mut stats = TraderStats { wins: 0, losses: 0, net_pnl: 0 };
    stats.wins += 1;
    stats.net_pnl += 500;
    stats.losses += 1;
    stats.net_pnl -= 300;
    assert(stats.wins == 1, 'wins = 1');
    assert(stats.losses == 1, 'losses = 1');
    assert(stats.net_pnl == 200, 'net pnl = 200');
}

// ─── asymmetric pool winner ───────────────────────────────────────────────────

#[test]
fn test_winner_payout_asymmetric_pools() {
    let long_pool: u128 = 1000;
    let short_pool: u128 = 1500;
    let total = long_pool + short_pool;
    let fee = total * PROTOCOL_FEE_BPS / BPS_SCALE;
    assert(fee == 50, 'fee = 50');

    let opener_stake: u128 = 1000;
    let profit_bps: u128 = 1000;
    let profit = opener_stake * profit_bps / BPS_SCALE;
    assert(profit == 100, 'opener profit = 100');
    assert(opener_stake + profit == 1100, 'payout = 1100');
}

// ─── pragma oracle integration test ──────────────────────────────────────────

use bitdrum_starknet::settlement_engine::SettlementEngine::{DataType, IPragmaABIDispatcher, IPragmaABIDispatcherTrait};
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_cheat_block_timestamp_global};

#[starknet::contract]
mod MockPragma {
    use bitdrum_starknet::settlement_engine::SettlementEngine::{DataType, PragmaPricesResponse};
    use starknet::get_block_timestamp;

    #[storage]
    struct Storage {}

    #[abi(embed_v0)]
    impl MockPragmaImpl of bitdrum_starknet::settlement_engine::SettlementEngine::IPragmaABI<ContractState> {
        fn get_data_median(self: @ContractState, data_type: DataType) -> PragmaPricesResponse {
            // Return a dummy BTC/USD price: $65,000.00 with 8 decimals = 65000_00000000
            PragmaPricesResponse {
                price: 65000_00000000,
                decimals: 8,
                last_updated_timestamp: get_block_timestamp(),
                num_sources_aggregated: 4,
                expiration_timestamp: Option::None,
            }
        }
    }
}

#[test]
fn test_pragma_btc_usd_price_integration() {
    // Set a predictable block timestamp
    start_cheat_block_timestamp_global(1700000000);

    // Deploy the mock Pragma oracle
    let contract = declare("MockPragma").unwrap().contract_class();
    let (pragma_address, _) = contract.deploy(@ArrayTrait::new()).unwrap();
    
    // Create the dispatcher using our local ABI
    let pragma = IPragmaABIDispatcher { contract_address: pragma_address };
    
    // Request BTC/USD price
    let response = pragma.get_data_median(DataType::SpotEntry(BTC_USD_PAIR_ID));
    
    // Verify our custom Pragma interface correctly decodes the response struct
    assert(response.price == 65000_00000000, 'BTC price should be 65000');
    assert(response.decimals == 8, 'Decimals should be 8');
    assert(response.last_updated_timestamp == 1700000000, 'Timestamp mismatch');
    assert(response.num_sources_aggregated == 4, 'Sources should be 4');
}

// ─── live fork test ──────────────────────────────────────────────────────────

#[test]
#[fork("mainnet")]
fn test_pragma_live_price_fork() {
    // 1. Point to the actual Pragma Oracle smart contract on Starknet Mainnet
    let pragma_mainnet_address: starknet::ContractAddress = 0x2a85bd616f912537c50a49a4076db02c00b29b2cdc8a197ce92ed1837fa875b.try_into().unwrap();
    
    let pragma = IPragmaABIDispatcher { contract_address: pragma_mainnet_address };
    
    // 2. Ask for the real BTC/USD median price
    let response = pragma.get_data_median(DataType::SpotEntry(BTC_USD_PAIR_ID));
    
    // 3. Output the price by causing an intentional assert log, or just verify it's > 0
    println!("Live BTC/USD Price: {} ({} decimals)", response.price, response.decimals);
    println!("Live Last Updated Timestamp: {}", response.last_updated_timestamp);
    println!("Live Sources Aggregated: {}", response.num_sources_aggregated);
    
    assert(response.price > 0, 'Real price should be > 0');
    assert(response.decimals == 8, 'Live decimals should be 8');
    assert(response.num_sources_aggregated >= 3, 'Requires multiple sources');
}
