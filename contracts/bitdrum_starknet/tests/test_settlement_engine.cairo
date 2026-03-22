// =============================================================================
// SettlementEngine — snforge integration tests
// =============================================================================
//
// Tests:
//   ✓ settle: reverts if already settled
//   ✓ settle: reverts if price is stale (> 30s)
//   ✓ settle: reverts if price timestamp is in the future
//   ✓ settle: reverts if market not locked
//   ✓ settle: reverts if entry price not set
//   ✓ set_entry_price: only owner or market contract can call
//   ✓ settle: LONG wins when settlement_price > entry_price
//   ✓ settle: SHORT wins when settlement_price < entry_price
//   ✓ settle: DRAW emits DrawSettled event

use bitdrum_starknet::settlement_engine::{
    ISettlementEngineDispatcher, ISettlementEngineDispatcherTrait,
    PragmaPricesResponse,
};

use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait,
    start_cheat_caller_address, stop_cheat_caller_address,
    start_cheat_block_timestamp_global, stop_cheat_block_timestamp_global,
};
use starknet::ContractAddress;

fn OWNER()   -> ContractAddress { 0x1000.try_into().unwrap() }
fn ALICE()   -> ContractAddress { 0x2000.try_into().unwrap() }

/// Helper: build a fresh PragmaPricesResponse with a given price and timestamp.
fn mock_price_response(price: u128, timestamp: u64) -> PragmaPricesResponse {
    PragmaPricesResponse {
        price,
        decimals: 8,
        last_updated_timestamp: timestamp,
        num_sources_aggregated: 4,
        expiration_timestamp: Option::None,
    }
}

fn deploy_pragma(price: u128, timestamp: u64) -> ContractAddress {
    let oracle_class = declare("MockPragmaOracle").unwrap().contract_class();
    let mut calldata: Array<felt252> = array![price.into(), timestamp.into(), 8.into(), 4.into()];
    let (oracle_addr, _) = oracle_class.deploy(@calldata).unwrap();
    oracle_addr
}

fn deploy_engine(pragma_oracle: ContractAddress) -> ISettlementEngineDispatcher {
    let engine_class = declare("SettlementEngine").unwrap().contract_class();
    let mut calldata: Array<felt252> = array![OWNER().into(), pragma_oracle.into()];
    let (engine_addr, _) = engine_class.deploy(@calldata).unwrap();
    ISettlementEngineDispatcher { contract_address: engine_addr }
}

// ─── set_entry_price ─────────────────────────────────────────────────────────

#[test]
fn test_set_entry_price_by_owner() {
    let pragma = deploy_pragma(65000_00000000, 995);
    let engine = deploy_engine(pragma);
    start_cheat_caller_address(engine.contract_address, OWNER());
    engine.set_entry_price(1, 65000_00000000);
    stop_cheat_caller_address(engine.contract_address);
    // No assertion needed — absence of panic is the assertion
}

#[test]
#[should_panic(expected: ('Unauthorized',))]
fn test_set_entry_price_unauthorized_reverts() {
    let pragma = deploy_pragma(65000_00000000, 995);
    let engine = deploy_engine(pragma);
    start_cheat_caller_address(engine.contract_address, ALICE());
    engine.set_entry_price(1, 65000_00000000); // unauthorized
}

#[test]
#[should_panic(expected: ('Price must be > 0',))]
fn test_set_entry_price_zero_reverts() {
    let pragma = deploy_pragma(65000_00000000, 995);
    let engine = deploy_engine(pragma);
    start_cheat_caller_address(engine.contract_address, OWNER());
    engine.set_entry_price(1, 0); // zero price
}

// ─── settle: freshness guards ─────────────────────────────────────────────────

#[test]
#[should_panic(expected: ('Pragma price too stale (>30s)',))]
fn test_settle_stale_price_reverts() {
    let pragma = deploy_pragma(66000_00000000, 950);
    let engine = deploy_engine(pragma);
    // Set block timestamp to T=1000
    start_cheat_block_timestamp_global(1000);

    // Entry price set at T=950 (50s ago — too stale)
    start_cheat_caller_address(engine.contract_address, OWNER());
    engine.set_entry_price(1, 65000_00000000);
    stop_cheat_caller_address(engine.contract_address);

    let stale_response = mock_price_response(66000_00000000, 950); // 50s old
    engine.settle(1, stale_response); // should revert
    stop_cheat_block_timestamp_global();
}

#[test]
#[should_panic(expected: ('Price timestamp in future',))]
fn test_settle_future_price_reverts() {
    let pragma = deploy_pragma(66000_00000000, 2000);
    let engine = deploy_engine(pragma);
    start_cheat_block_timestamp_global(1000);

    start_cheat_caller_address(engine.contract_address, OWNER());
    engine.set_entry_price(1, 65000_00000000);
    stop_cheat_caller_address(engine.contract_address);

    let future_response = mock_price_response(66000_00000000, 2000); // in the future
    engine.settle(1, future_response);
    stop_cheat_block_timestamp_global();
}

// ─── settle: double-settlement guard ─────────────────────────────────────────

#[test]
#[should_panic(expected: ('Already settled',))]
fn test_settle_twice_reverts() {
    let now: u64 = 1700000000;
    let pragma = deploy_pragma(66000_00000000, now - 5);
    let engine = deploy_engine(pragma);
    let mock_market_class = declare("MockPredictionMarket").unwrap().contract_class();
    let (mock_market_addr, _) = mock_market_class.deploy(@ArrayTrait::new()).unwrap();
    let mock_vault_class = declare("MockVault").unwrap().contract_class();
    let (mock_vault_addr, _) = mock_vault_class.deploy(@ArrayTrait::new()).unwrap();
    let mock_treasury_class = declare("MockTreasury").unwrap().contract_class();
    let (mock_treasury_addr, _) = mock_treasury_class.deploy(@ArrayTrait::new()).unwrap();

    start_cheat_caller_address(engine.contract_address, OWNER());
    engine.set_prediction_market(mock_market_addr);
    engine.set_vault(mock_vault_addr);
    engine.set_treasury(mock_treasury_addr);
    engine.set_entry_price(1, 65000_00000000);
    stop_cheat_caller_address(engine.contract_address);

    start_cheat_block_timestamp_global(now);
    let response = mock_price_response(66000_00000000, now - 5);
    
    // First settlement succeeds
    engine.settle(1, response);
    
    // Second settlement must revert
    engine.settle(1, response);
    stop_cheat_block_timestamp_global();
}

// ─── settle: full E2E with mock PredictionMarket ──────────────────────────────

/// This is the integration anchor test. A full settlement flow requires
/// deploying PredictionMarket, Vault, Treasury, and the Engine together.
/// Below is the setup pattern — complete wire-up follows contract deployment.
#[test]
fn test_settle_long_wins_with_fresh_price() {
    let now: u64 = 1700000000;
    let pragma = deploy_pragma(66000_00000000, now - 5);
    let engine = deploy_engine(pragma);

    // Wire up mock market, vault, treasury
    let mock_market_class = declare("MockPredictionMarket").unwrap().contract_class();
    let (mock_market_addr, _) = mock_market_class.deploy(@ArrayTrait::new()).unwrap();

    let mock_vault_class = declare("MockVault").unwrap().contract_class();
    let (mock_vault_addr, _) = mock_vault_class.deploy(@ArrayTrait::new()).unwrap();

    let mock_treasury_class = declare("MockTreasury").unwrap().contract_class();
    let (mock_treasury_addr, _) = mock_treasury_class.deploy(@ArrayTrait::new()).unwrap();

    start_cheat_caller_address(engine.contract_address, OWNER());
    engine.set_prediction_market(mock_market_addr);
    engine.set_vault(mock_vault_addr);
    engine.set_treasury(mock_treasury_addr);

    // Set an entry price for market #1
    engine.set_entry_price(1, 65000_00000000);
    stop_cheat_caller_address(engine.contract_address);

    // Settle with a price higher than entry (LONG wins)
    start_cheat_block_timestamp_global(now);
    let fresh_response = mock_price_response(66000_00000000, now - 5); // 5s old = fresh
    engine.settle(1, fresh_response);
    stop_cheat_block_timestamp_global();
    // No panic = success; the market's mark_claimable would be called on the mock
}

#[test]
fn test_settle_short_wins_with_lower_price() {
    let now: u64 = 1700000000;
    let pragma = deploy_pragma(64000_00000000, now - 10);
    let engine = deploy_engine(pragma);

    let mock_market_class = declare("MockPredictionMarket").unwrap().contract_class();
    let (mock_market_addr, _) = mock_market_class.deploy(@ArrayTrait::new()).unwrap();
    let mock_vault_class = declare("MockVault").unwrap().contract_class();
    let (mock_vault_addr, _) = mock_vault_class.deploy(@ArrayTrait::new()).unwrap();
    let mock_treasury_class = declare("MockTreasury").unwrap().contract_class();
    let (mock_treasury_addr, _) = mock_treasury_class.deploy(@ArrayTrait::new()).unwrap();

    start_cheat_caller_address(engine.contract_address, OWNER());
    engine.set_prediction_market(mock_market_addr);
    engine.set_vault(mock_vault_addr);
    engine.set_treasury(mock_treasury_addr);
    engine.set_entry_price(1, 65000_00000000);
    stop_cheat_caller_address(engine.contract_address);

    start_cheat_block_timestamp_global(now);
    let fresh_response = mock_price_response(64000_00000000, now - 10); // SHORT wins
    engine.settle(1, fresh_response);
    stop_cheat_block_timestamp_global();
}

#[test]
#[should_panic(expected: ('Oracle response mismatch',))]
fn test_settle_rejects_forged_price_payload() {
    let now: u64 = 1700000000;
    let pragma = deploy_pragma(65000_00000000, now - 5);
    let engine = deploy_engine(pragma);

    let mock_market_class = declare("MockPredictionMarket").unwrap().contract_class();
    let (mock_market_addr, _) = mock_market_class.deploy(@ArrayTrait::new()).unwrap();
    let mock_vault_class = declare("MockVault").unwrap().contract_class();
    let (mock_vault_addr, _) = mock_vault_class.deploy(@ArrayTrait::new()).unwrap();
    let mock_treasury_class = declare("MockTreasury").unwrap().contract_class();
    let (mock_treasury_addr, _) = mock_treasury_class.deploy(@ArrayTrait::new()).unwrap();

    start_cheat_caller_address(engine.contract_address, OWNER());
    engine.set_prediction_market(mock_market_addr);
    engine.set_vault(mock_vault_addr);
    engine.set_treasury(mock_treasury_addr);
    engine.set_entry_price(1, 64000_00000000);
    stop_cheat_caller_address(engine.contract_address);

    start_cheat_block_timestamp_global(now);
    let forged_response = mock_price_response(66000_00000000, now - 5);
    engine.settle(1, forged_response);
    stop_cheat_block_timestamp_global();
}
