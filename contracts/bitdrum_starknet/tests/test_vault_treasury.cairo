// =============================================================================
// Vault & Treasury — snforge integration tests
// =============================================================================
//
// Tests:
//   ✓ Vault: deposit increases total_liquidity
//   ✓ Vault: withdraw reduces total_liquidity
//   ✓ Vault: withdraw more than balance reverts
//   ✓ Vault: pay_winner only callable by settlement engine
//   ✓ Vault: absorb_losses only callable by settlement engine
//   ✓ Treasury: receive_fee splits correctly (40/35/25)
//   ✓ Treasury: receive_fee caller-gated to engine
//   ✓ Treasury: withdraw functions reduce correct balances
//   ✓ Treasury: zero fee reverts

use bitdrum_starknet::vault_treasury::{
    IVaultDispatcher, IVaultDispatcherTrait,
    ITreasuryDispatcher, ITreasuryDispatcherTrait,
};
use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait,
    start_cheat_caller_address, stop_cheat_caller_address,
};
use starknet::ContractAddress;

fn OWNER() -> ContractAddress   { 0x1000.try_into().unwrap() }
fn ENGINE() -> ContractAddress  { 0x5000.try_into().unwrap() }
fn ALICE() -> ContractAddress   { 0x2000.try_into().unwrap() }

fn deploy_vault_and_treasury() -> (IVaultDispatcher, ITreasuryDispatcher, ContractAddress) {
    // ── Mock ERC-20
    let erc20_class = declare("MockERC20").unwrap().contract_class();
    let (erc20_addr, _) = erc20_class.deploy(@ArrayTrait::new()).unwrap();

    // ── Vault
    let vault_class = declare("Vault").unwrap().contract_class();
    let mut vault_cd: Array<felt252> = array![OWNER().into(), erc20_addr.into()];
    let (vault_addr, _) = vault_class.deploy(@vault_cd).unwrap();

    // ── Treasury
    let treasury_class = declare("Treasury").unwrap().contract_class();
    let mut treasury_cd: Array<felt252> = array![OWNER().into(), erc20_addr.into()];
    let (treasury_addr, _) = treasury_class.deploy(@treasury_cd).unwrap();

    // Authorise mock engine
    let vault = IVaultDispatcher { contract_address: vault_addr };
    start_cheat_caller_address(vault_addr, OWNER());
    vault.set_settlement_engine(ENGINE());
    stop_cheat_caller_address(vault_addr);

    let treasury = ITreasuryDispatcher { contract_address: treasury_addr };
    start_cheat_caller_address(treasury_addr, OWNER());
    treasury.set_settlement_engine(ENGINE());
    stop_cheat_caller_address(treasury_addr);

    (vault, treasury, erc20_addr)
}

// ─── Vault tests ─────────────────────────────────────────────────────────────

#[test]
fn test_vault_deposit_increases_liquidity() {
    let (vault, _, _) = deploy_vault_and_treasury();
    // ALICE deposits 1000 (MockERC20 auto-approves)
    start_cheat_caller_address(vault.contract_address, ALICE());
    vault.deposit(1000);
    stop_cheat_caller_address(vault.contract_address);

    assert(vault.total_liquidity() == 1000, 'liquidity should be 1000');
}

#[test]
fn test_vault_withdraw_reduces_liquidity() {
    let (vault, _, _) = deploy_vault_and_treasury();
    start_cheat_caller_address(vault.contract_address, ALICE());
    vault.deposit(1000);
    vault.withdraw(400);
    stop_cheat_caller_address(vault.contract_address);

    assert(vault.total_liquidity() == 600, 'liquidity should be 600');
}

#[test]
#[should_panic(expected: ('Insufficient liquidity',))]
fn test_vault_withdraw_over_balance_reverts() {
    let (vault, _, _) = deploy_vault_and_treasury();
    start_cheat_caller_address(vault.contract_address, ALICE());
    vault.deposit(100);
    vault.withdraw(200); // over balance
}

#[test]
#[should_panic(expected: ('Only settlement engine',))]
fn test_vault_pay_winner_unauthorized_reverts() {
    let (vault, _, _) = deploy_vault_and_treasury();
    start_cheat_caller_address(vault.contract_address, ALICE());
    vault.deposit(1000);
    stop_cheat_caller_address(vault.contract_address);

    // Try to call pay_winner as unauthorized caller
    start_cheat_caller_address(vault.contract_address, ALICE());
    vault.pay_winner(ALICE(), 100);
}

#[test]
fn test_vault_pay_winner_engine_succeeds() {
    let (vault, _, _) = deploy_vault_and_treasury();
    start_cheat_caller_address(vault.contract_address, ALICE());
    vault.deposit(1000);
    stop_cheat_caller_address(vault.contract_address);

    start_cheat_caller_address(vault.contract_address, ENGINE());
    vault.pay_winner(ALICE(), 500);
    stop_cheat_caller_address(vault.contract_address);

    assert(vault.total_liquidity() == 500, 'liquidity=500 after pay');
}

#[test]
#[should_panic(expected: ('Only settlement engine',))]
fn test_vault_absorb_losses_unauthorized_reverts() {
    let (vault, _, _) = deploy_vault_and_treasury();
    start_cheat_caller_address(vault.contract_address, ALICE());
    vault.absorb_losses(500); // unauthorized
}

#[test]
fn test_vault_absorb_losses_engine_succeeds() {
    let (vault, _, _) = deploy_vault_and_treasury();

    // Engine absorbs losses (funds already in the contract via transfer logic)
    start_cheat_caller_address(vault.contract_address, ENGINE());
    vault.absorb_losses(800);
    stop_cheat_caller_address(vault.contract_address);

    // Total liquidity should reflect the absorbed amount
    assert(vault.total_liquidity() == 800, 'liquidity=800 after absorb');
}

// ─── Treasury tests ───────────────────────────────────────────────────────────

#[test]
fn test_treasury_fee_split_amounts() {
    let (_, treasury, _) = deploy_vault_and_treasury();
    let fee: u128 = 10000;

    start_cheat_caller_address(treasury.contract_address, ENGINE());
    treasury.receive_fee(fee);
    stop_cheat_caller_address(treasury.contract_address);

    assert(treasury.vault_balance() == 4000, 'vault_balance = 4000');
    assert(treasury.ai_fund_balance() == 3500, 'ai_fund_balance = 3500');
    assert(treasury.dev_fund_balance() == 2500, 'dev_fund_balance = 2500');
}

#[test]
#[should_panic(expected: ('Only settlement engine',))]
fn test_treasury_receive_fee_unauthorized_reverts() {
    let (_, treasury, _) = deploy_vault_and_treasury();
    start_cheat_caller_address(treasury.contract_address, ALICE());
    treasury.receive_fee(1000);
}

#[test]
#[should_panic(expected: ('Zero fee',))]
fn test_treasury_receive_zero_fee_reverts() {
    let (_, treasury, _) = deploy_vault_and_treasury();
    start_cheat_caller_address(treasury.contract_address, ENGINE());
    treasury.receive_fee(0);
}

#[test]
fn test_treasury_withdraw_vault_allocation() {
    let (_, treasury, _) = deploy_vault_and_treasury();
    start_cheat_caller_address(treasury.contract_address, ENGINE());
    treasury.receive_fee(10000);
    stop_cheat_caller_address(treasury.contract_address);

    start_cheat_caller_address(treasury.contract_address, OWNER());
    treasury.withdraw_vault_allocation(ALICE(), 2000);
    stop_cheat_caller_address(treasury.contract_address);

    assert(treasury.vault_balance() == 2000, 'vault_balance should be 2000');
}

#[test]
#[should_panic(expected: ('Insufficient vault balance',))]
fn test_treasury_withdraw_over_vault_balance_reverts() {
    let (_, treasury, _) = deploy_vault_and_treasury();
    start_cheat_caller_address(treasury.contract_address, ENGINE());
    treasury.receive_fee(10000);
    stop_cheat_caller_address(treasury.contract_address);

    start_cheat_caller_address(treasury.contract_address, OWNER());
    treasury.withdraw_vault_allocation(ALICE(), 9000); // vault only has 4000
}

#[test]
fn test_treasury_accumulates_multiple_fees() {
    let (_, treasury, _) = deploy_vault_and_treasury();
    start_cheat_caller_address(treasury.contract_address, ENGINE());
    treasury.receive_fee(10000);
    treasury.receive_fee(10000);
    stop_cheat_caller_address(treasury.contract_address);

    assert(treasury.vault_balance() == 8000, 'vault=8000 after 2 fees');
    assert(treasury.ai_fund_balance() == 7000, 'ai should be 7000 after 2 fees');
    assert(treasury.dev_fund_balance() == 5000, 'dev should be 5000 after 2 fees');
}
