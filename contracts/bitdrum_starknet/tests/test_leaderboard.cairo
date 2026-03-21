// =============================================================================
// LeaderboardRegistry — snforge integration tests
// =============================================================================
//
// Tests:
//   ✓ record_result: unauthorized caller reverts
//   ✓ record_result: win increments wins counter
//   ✓ record_result: loss increments losses counter
//   ✓ record_result: net PnL accumulates correctly (positive + negative)
//   ✓ record_result: multiple markets accumulate correctly
//   ✓ get_stats: returns zero-state for new trader
//   ✓ set_settlement_engine: only owner can update

use bitdrum_starknet::leaderboard_registry::{
    ILeaderboardRegistryDispatcher, ILeaderboardRegistryDispatcherTrait,
};
use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait,
    start_cheat_caller_address, stop_cheat_caller_address,
};
use starknet::ContractAddress;

fn OWNER()  -> ContractAddress { 0x1000.try_into().unwrap() }
fn ENGINE() -> ContractAddress { 0x5000.try_into().unwrap() }
fn ALICE()  -> ContractAddress { 0x2000.try_into().unwrap() }

fn deploy_leaderboard() -> ILeaderboardRegistryDispatcher {
    let lb_class = declare("LeaderboardRegistry").unwrap().contract_class();
    let mut calldata: Array<felt252> = array![OWNER().into()];
    let (lb_addr, _) = lb_class.deploy(@calldata).unwrap();

    let lb = ILeaderboardRegistryDispatcher { contract_address: lb_addr };

    // Authorise the engine
    start_cheat_caller_address(lb_addr, OWNER());
    lb.set_settlement_engine(ENGINE());
    stop_cheat_caller_address(lb_addr);

    lb
}

// ─── Authorization ────────────────────────────────────────────────────────────

#[test]
#[should_panic(expected: ('Only settlement engine',))]
fn test_record_result_unauthorized_reverts() {
    let lb = deploy_leaderboard();
    start_cheat_caller_address(lb.contract_address, ALICE());
    lb.record_result(ALICE(), true, 500);
}

// ─── Win recording ────────────────────────────────────────────────────────────

#[test]
fn test_record_win_increments_wins() {
    let lb = deploy_leaderboard();
    start_cheat_caller_address(lb.contract_address, ENGINE());
    lb.record_result(ALICE(), true, 1000);
    stop_cheat_caller_address(lb.contract_address);

    let stats = lb.get_stats(ALICE());
    assert(stats.wins == 1, 'wins should be 1');
    assert(stats.losses == 0, 'losses should be 0');
    assert(stats.net_pnl == 1000, 'net_pnl should be 1000');
}

// ─── Loss recording ───────────────────────────────────────────────────────────

#[test]
fn test_record_loss_increments_losses() {
    let lb = deploy_leaderboard();
    start_cheat_caller_address(lb.contract_address, ENGINE());
    lb.record_result(ALICE(), false, -500);
    stop_cheat_caller_address(lb.contract_address);

    let stats = lb.get_stats(ALICE());
    assert(stats.wins == 0, 'wins should be 0');
    assert(stats.losses == 1, 'losses should be 1');
    assert(stats.net_pnl == -500, 'net_pnl should be -500');
}

// ─── PnL accumulation ────────────────────────────────────────────────────────

#[test]
fn test_pnl_accumulates_over_multiple_markets() {
    let lb = deploy_leaderboard();
    start_cheat_caller_address(lb.contract_address, ENGINE());
    lb.record_result(ALICE(), true,  1200);
    lb.record_result(ALICE(), false, -300);
    lb.record_result(ALICE(), true,  800);
    stop_cheat_caller_address(lb.contract_address);

    let stats = lb.get_stats(ALICE());
    assert(stats.wins == 2, 'wins should be 2');
    assert(stats.losses == 1, 'losses should be 1');
    assert(stats.net_pnl == 1700, 'net pnl = 1700');
}

// ─── New trader zero state ────────────────────────────────────────────────────

#[test]
fn test_get_stats_new_trader_returns_zero() {
    let lb = deploy_leaderboard();
    let stats = lb.get_stats(ALICE());
    assert(stats.wins == 0, 'wins should be 0');
    assert(stats.losses == 0, 'losses should be 0');
    assert(stats.net_pnl == 0, 'net_pnl should be 0');
}

// ─── Multiple traders ─────────────────────────────────────────────────────────

#[test]
fn test_different_traders_have_independent_stats() {
    let lb = deploy_leaderboard();
    let bob: ContractAddress = 0x3000.try_into().unwrap();

    start_cheat_caller_address(lb.contract_address, ENGINE());
    lb.record_result(ALICE(), true, 500);
    lb.record_result(bob, false, -200);
    stop_cheat_caller_address(lb.contract_address);

    let alice_stats = lb.get_stats(ALICE());
    let bob_stats = lb.get_stats(bob);

    assert(alice_stats.wins == 1, 'Alice should have 1 win');
    assert(alice_stats.net_pnl == 500, 'Alice pnl = 500');
    assert(bob_stats.losses == 1, 'Bob should have 1 loss');
    assert(bob_stats.net_pnl == -200, 'Bob pnl = -200');
}

// ─── Admin setters ────────────────────────────────────────────────────────────

#[test]
fn test_set_settlement_engine_by_owner() {
    let lb = deploy_leaderboard();
    let new_engine: ContractAddress = 0x9999.try_into().unwrap();
    start_cheat_caller_address(lb.contract_address, OWNER());
    lb.set_settlement_engine(new_engine);
    stop_cheat_caller_address(lb.contract_address);
    // No panic = success
}

#[test]
#[should_panic(expected: ('Only owner',))]
fn test_set_settlement_engine_unauthorized_reverts() {
    let lb = deploy_leaderboard();
    start_cheat_caller_address(lb.contract_address, ALICE());
    lb.set_settlement_engine(ENGINE());
}
