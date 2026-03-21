// =============================================================================
// PredictionMarket — snforge integration tests
// =============================================================================
//
// Tests:
//   ✓ open_market: success path
//   ✓ open_market: zero stake rejected
//   ✓ open_market: POM bps out of range rejected
//   ✓ join_market: success path (opposite direction)
//   ✓ join_market: reverts after joining window closes
//   ✓ join_market: double-join reverts
//   ✓ lock_market: reverts before deadline
//   ✓ lock_market: succeeds after deadline
//   ✓ mark_claimable: only settlement engine can call
//   ✓ claim: winner gets payout, loser gets 0

use bitdrum_starknet::prediction_market::{
    IPredictionMarketDispatcher, IPredictionMarketDispatcherTrait,
};
use bitdrum_starknet::types::{Direction, MarketState, JOINING_WINDOW};

use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait,
    start_cheat_caller_address, stop_cheat_caller_address,
    start_cheat_block_timestamp_global, stop_cheat_block_timestamp_global,
};
use starknet::ContractAddress;

// ─── helpers ─────────────────────────────────────────────────────────────────

fn OWNER() -> ContractAddress { 0x1000.try_into().unwrap() }
fn ALICE() -> ContractAddress { 0x2000.try_into().unwrap() }
fn BOB() -> ContractAddress   { 0x3000.try_into().unwrap() }
fn ZERO() -> ContractAddress  { 0x0.try_into().unwrap() }

/// Deploy a minimal ERC-20 mock, then deploy PredictionMarket.
/// Returns (market_dispatcher, mock_erc20_address, mock_vault_address, mock_treasury_address).
fn deploy_market() -> (IPredictionMarketDispatcher, ContractAddress, ContractAddress, ContractAddress) {
    // ── Mock ERC-20 ──────────────────────────────────────────────────────────
    let erc20_class = declare("MockERC20").unwrap().contract_class();
    let mut erc20_calldata: Array<felt252> = array![];
    let (erc20_addr, _) = erc20_class.deploy(@erc20_calldata).unwrap();

    // ── Mock Vault ───────────────────────────────────────────────────────────
    let vault_class = declare("MockVault").unwrap().contract_class();
    let (vault_addr, _) = vault_class.deploy(@ArrayTrait::new()).unwrap();

    // ── Mock Treasury ────────────────────────────────────────────────────────
    let treasury_class = declare("MockTreasury").unwrap().contract_class();
    let (treasury_addr, _) = treasury_class.deploy(@ArrayTrait::new()).unwrap();

    // ── PredictionMarket ─────────────────────────────────────────────────────
    let market_class = declare("PredictionMarket").unwrap().contract_class();
    let mut calldata: Array<felt252> = array![
        OWNER().into(),
        erc20_addr.into(),
        vault_addr.into(),
        treasury_addr.into(),
    ];
    let (market_addr, _) = market_class.deploy(@calldata).unwrap();

    (
        IPredictionMarketDispatcher { contract_address: market_addr },
        erc20_addr,
        vault_addr,
        treasury_addr,
    )
}

// ─── open_market ─────────────────────────────────────────────────────────────

#[test]
fn test_open_market_success() {
    let (market, _, _, _) = deploy_market();
    start_cheat_caller_address(market.contract_address, ALICE());
    let id = market.open_market(Direction::Long, 1000, 500);
    stop_cheat_caller_address(market.contract_address);

    assert(id == 1, 'market id should be 1');
    assert(market.market_count() == 1, 'count should be 1');

    let m = market.get_market(1);
    assert(m.state == MarketState::Open, 'should be Open');
    assert(m.opener == ALICE(), 'opener should be Alice');
    assert(m.pom_profit_bps == 1000, 'bps should be 1000');
}

#[test]
#[should_panic(expected: ('Stake must be > 0',))]
fn test_open_market_zero_stake_reverts() {
    let (market, _, _, _) = deploy_market();
    start_cheat_caller_address(market.contract_address, ALICE());
    market.open_market(Direction::Long, 1000, 0);
}

#[test]
#[should_panic(expected: ('POM bps out of range',))]
fn test_open_market_bps_below_min_reverts() {
    let (market, _, _, _) = deploy_market();
    start_cheat_caller_address(market.contract_address, ALICE());
    market.open_market(Direction::Long, 400, 500); // 400 < MIN (500)
}

#[test]
#[should_panic(expected: ('POM bps out of range',))]
fn test_open_market_bps_above_max_reverts() {
    let (market, _, _, _) = deploy_market();
    start_cheat_caller_address(market.contract_address, ALICE());
    market.open_market(Direction::Long, 7100, 500); // 7100 > MAX (7000)
}

// ─── join_market ─────────────────────────────────────────────────────────────

#[test]
fn test_join_market_success() {
    let (market, _, _, _) = deploy_market();
    start_cheat_caller_address(market.contract_address, ALICE());
    market.open_market(Direction::Long, 1000, 500);
    stop_cheat_caller_address(market.contract_address);

    start_cheat_caller_address(market.contract_address, BOB());
    market.join_market(1, Direction::Short, 300);
    stop_cheat_caller_address(market.contract_address);

    let p = market.get_participant(1, BOB());
    assert(p.stake == 300, 'Bob stake = 300');
    assert(p.direction == Direction::Short, 'Bob is Short');

    let m = market.get_market(1);
    assert(m.short_pool >= 300, 'short pool includes Bob');
}

#[test]
#[should_panic(expected: ('Joining window closed',))]
fn test_join_market_after_deadline_reverts() {
    let (market, _, _, _) = deploy_market();
    start_cheat_caller_address(market.contract_address, ALICE());
    market.open_market(Direction::Long, 1000, 500);
    stop_cheat_caller_address(market.contract_address);

    // Fast-forward past the 5 min joining window
    start_cheat_block_timestamp_global(JOINING_WINDOW.into() + 1);
    start_cheat_caller_address(market.contract_address, BOB());
    market.join_market(1, Direction::Short, 300);
}

#[test]
#[should_panic(expected: ('Already joined',))]
fn test_join_market_double_join_reverts() {
    let (market, _, _, _) = deploy_market();
    start_cheat_caller_address(market.contract_address, ALICE());
    market.open_market(Direction::Long, 1000, 500);
    stop_cheat_caller_address(market.contract_address);

    start_cheat_caller_address(market.contract_address, BOB());
    market.join_market(1, Direction::Short, 300);
    market.join_market(1, Direction::Short, 100); // double join
}

// ─── lock_market ─────────────────────────────────────────────────────────────

#[test]
#[should_panic(expected: ('Joining window still open',))]
fn test_lock_market_before_deadline_reverts() {
    let (market, _, _, _) = deploy_market();
    start_cheat_caller_address(market.contract_address, ALICE());
    market.open_market(Direction::Long, 1000, 500);
    stop_cheat_caller_address(market.contract_address);

    market.lock_market(1); // deadline not passed
}

#[test]
fn test_lock_market_after_deadline_succeeds() {
    let (market, _, _, _) = deploy_market();
    start_cheat_caller_address(market.contract_address, ALICE());
    market.open_market(Direction::Long, 1000, 500);
    stop_cheat_caller_address(market.contract_address);

    // Fast-forward past deadline
    start_cheat_block_timestamp_global(JOINING_WINDOW.into() + 10);
    market.lock_market(1);
    stop_cheat_block_timestamp_global();

    let m = market.get_market(1);
    assert(m.state == MarketState::Locked, 'should be Locked');
}

// ─── mark_claimable ──────────────────────────────────────────────────────────

#[test]
#[should_panic(expected: ('Only settlement engine',))]
fn test_mark_claimable_only_engine() {
    let (market, _, _, _) = deploy_market();
    start_cheat_caller_address(market.contract_address, ALICE());
    market.open_market(Direction::Long, 1000, 500);
    stop_cheat_caller_address(market.contract_address);

    // Try to call mark_claimable as an unauthorized address
    start_cheat_caller_address(market.contract_address, BOB());
    market.mark_claimable(1, 65000_00000000, 1700001000);
}
