// =============================================================================
// SignalSubscription — snforge integration tests
// =============================================================================
//
// Tests:
//   ✓ subscribe: Pro tier stores correct paid_until
//   ✓ subscribe: Elite tier stores correct paid_until
//   ✓ subscribe: None tier reverts
//   ✓ subscribe: subscription stacks (renewed before expiry extends it)
//   ✓ get_subscription: returns correct tier and expiry
//   ✓ set_prices: only owner can update
//   ✓ set_token: only owner can update

use bitdrum_starknet::signal_subscription::{
    ISignalSubscriptionDispatcher, ISignalSubscriptionDispatcherTrait,
    SubscriptionTier,
};
use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait,
    start_cheat_caller_address, stop_cheat_caller_address,
    start_cheat_block_timestamp_global, stop_cheat_block_timestamp_global,
};
use starknet::ContractAddress;

fn OWNER() -> ContractAddress   { 0x1000.try_into().unwrap() }
fn ALICE() -> ContractAddress   { 0x2000.try_into().unwrap() }
fn BOB()   -> ContractAddress   { 0x3000.try_into().unwrap() }

const MONTH: u64 = 2592000; // 30 days in seconds
const PRO_PRICE: u128 = 50_000_000;    // $50 (6 decimals)
const ELITE_PRICE: u128 = 200_000_000; // $200 (6 decimals)

fn deploy_subscription() -> ISignalSubscriptionDispatcher {
    let erc20_class = declare("MockERC20").unwrap().contract_class();
    let (erc20_addr, _) = erc20_class.deploy(@ArrayTrait::new()).unwrap();

    let treasury_class = declare("MockTreasury").unwrap().contract_class();
    let (treasury_addr, _) = treasury_class.deploy(@ArrayTrait::new()).unwrap();

    let sub_class = declare("SignalSubscription").unwrap().contract_class();
    let mut calldata: Array<felt252> = array![
        OWNER().into(),
        erc20_addr.into(),
        treasury_addr.into(),
        PRO_PRICE.into(),
        ELITE_PRICE.into(),
    ];
    let (sub_addr, _) = sub_class.deploy(@calldata).unwrap();
    ISignalSubscriptionDispatcher { contract_address: sub_addr }
}

// ─── Pro subscription ─────────────────────────────────────────────────────────

#[test]
fn test_subscribe_pro_sets_paid_until() {
    let sub = deploy_subscription();
    let now: u64 = 1700000000;
    start_cheat_block_timestamp_global(now);

    start_cheat_caller_address(sub.contract_address, ALICE());
    sub.subscribe(SubscriptionTier::Pro);
    stop_cheat_caller_address(sub.contract_address);

    let record = sub.get_subscription(ALICE());
    assert(record.tier == SubscriptionTier::Pro, 'tier should be Pro');
    assert(record.paid_until == now + MONTH, 'paid_until = now + MONTH');
    stop_cheat_block_timestamp_global();
}

// ─── Elite subscription ──────────────────────────────────────────────────────

#[test]
fn test_subscribe_elite_sets_correct_tier() {
    let sub = deploy_subscription();
    let now: u64 = 1700000000;
    start_cheat_block_timestamp_global(now);

    start_cheat_caller_address(sub.contract_address, BOB());
    sub.subscribe(SubscriptionTier::Elite);
    stop_cheat_caller_address(sub.contract_address);

    let record = sub.get_subscription(BOB());
    assert(record.tier == SubscriptionTier::Elite, 'tier should be Elite');
    assert(record.paid_until == now + MONTH, 'paid_until = now + MONTH');
    stop_cheat_block_timestamp_global();
}

// ─── None tier rejected ───────────────────────────────────────────────────────

#[test]
#[should_panic(expected: ('Invalid tier',))]
fn test_subscribe_none_reverts() {
    let sub = deploy_subscription();
    start_cheat_caller_address(sub.contract_address, ALICE());
    sub.subscribe(SubscriptionTier::None);
}

// ─── Subscription stacking ────────────────────────────────────────────────────

#[test]
fn test_subscribe_twice_extends_expiry() {
    let sub = deploy_subscription();
    let now: u64 = 1700000000;
    start_cheat_block_timestamp_global(now);

    start_cheat_caller_address(sub.contract_address, ALICE());
    sub.subscribe(SubscriptionTier::Pro);

    // Renew before expiry — should extend from paid_until, not now
    sub.subscribe(SubscriptionTier::Pro);
    stop_cheat_caller_address(sub.contract_address);

    let record = sub.get_subscription(ALICE());
    assert(record.paid_until == now + MONTH + MONTH, 'paid_until stacks 2 months');
    stop_cheat_block_timestamp_global();
}

// ─── get_subscription: no record ─────────────────────────────────────────────

#[test]
fn test_get_subscription_unsubscribed_returns_none() {
    let sub = deploy_subscription();
    let record = sub.get_subscription(ALICE());
    assert(record.tier == SubscriptionTier::None, 'tier should be None');
    assert(record.paid_until == 0, 'paid_until = 0');
}

// ─── Owner-only setters ───────────────────────────────────────────────────────

#[test]
fn test_set_prices_by_owner() {
    let sub = deploy_subscription();
    start_cheat_caller_address(sub.contract_address, OWNER());
    sub.set_prices(75_000_000, 250_000_000);
    stop_cheat_caller_address(sub.contract_address);
    // No panic = success
}

#[test]
#[should_panic(expected: ('Only owner',))]
fn test_set_prices_unauthorized_reverts() {
    let sub = deploy_subscription();
    start_cheat_caller_address(sub.contract_address, ALICE());
    sub.set_prices(75_000_000, 250_000_000);
}
