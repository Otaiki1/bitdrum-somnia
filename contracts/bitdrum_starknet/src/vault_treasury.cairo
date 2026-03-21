// =============================================================================
// Vault — provides liquidity by taking the opposite side of the market opener.
// Treasury — collects protocol fees and routes fund allocations.
// =============================================================================
//
// Architecture:
//   • Vault holds LP capital and automatically backs the counter-position.
//   • When winners are paid out, the vault absorbs 100% of the losing pool.
//   • Treasury receives 2% of gross settlement volume.
//   • Allocation from treasury: 40% Vault, 35% AI fund, 25% Dev fund.

use starknet::ContractAddress;

// ---------------------------------------------------------------------------
// Vault interface
// ---------------------------------------------------------------------------
#[starknet::interface]
pub trait IVault<TContractState> {
    /// Deposit liquidity into the vault (ERC-20 token, approved beforehand).
    fn deposit(ref self: TContractState, amount: u128);

    /// Withdraw liquidity (proportional to LP share).
    fn withdraw(ref self: TContractState, amount: u128);

    /// Called by the settlement engine: transfer `amount` OUT of vault to `recipient`.
    /// Only the settlement engine may call this.
    fn pay_winner(ref self: TContractState, recipient: ContractAddress, amount: u128);

    /// Called by the settlement engine: receive losing pool into vault.
    fn absorb_losses(ref self: TContractState, amount: u128);

    /// Total liquidity currently in the vault.
    fn total_liquidity(self: @TContractState) -> u128;

    /// Set the authorised settlement engine (owner only).
    fn set_settlement_engine(ref self: TContractState, engine: ContractAddress);
}

// ---------------------------------------------------------------------------
// Treasury interface
// ---------------------------------------------------------------------------
#[starknet::interface]
pub trait ITreasury<TContractState> {
    /// Receive protocol fee and trigger allocation logic.
    /// Only the settlement engine may call this.
    fn receive_fee(ref self: TContractState, amount: u128);

    /// Accumulated balances per fund.
    fn vault_balance(self: @TContractState) -> u128;
    fn ai_fund_balance(self: @TContractState) -> u128;
    fn dev_fund_balance(self: @TContractState) -> u128;

    /// Owner can withdraw from a specific fund.
    fn withdraw_vault_allocation(ref self: TContractState, to: ContractAddress, amount: u128);
    fn withdraw_ai_fund(ref self: TContractState, to: ContractAddress, amount: u128);
    fn withdraw_dev_fund(ref self: TContractState, to: ContractAddress, amount: u128);

    /// Config setters (owner only).
    fn set_settlement_engine(ref self: TContractState, engine: ContractAddress);
    fn set_token(ref self: TContractState, token: ContractAddress);
}

// ---------------------------------------------------------------------------
// Vault implementation
// ---------------------------------------------------------------------------
#[starknet::contract]
pub mod Vault {
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use super::super::erc20_dispatcher::{IERC20Dispatcher, IERC20DispatcherTrait};

    #[storage]
    struct Storage {
        owner: ContractAddress,
        settlement_engine: ContractAddress,
        token: ContractAddress,
        total_liquidity: u128,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        Deposited: Deposited,
        Withdrawn: Withdrawn,
        WinnerPaid: WinnerPaid,
        LossesAbsorbed: LossesAbsorbed,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Deposited {
        #[key]
        pub provider: ContractAddress,
        pub amount: u128,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Withdrawn {
        #[key]
        pub provider: ContractAddress,
        pub amount: u128,
    }

    #[derive(Drop, starknet::Event)]
    pub struct WinnerPaid {
        #[key]
        pub recipient: ContractAddress,
        pub amount: u128,
    }

    #[derive(Drop, starknet::Event)]
    pub struct LossesAbsorbed {
        pub amount: u128,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, token: ContractAddress) {
        self.owner.write(owner);
        self.token.write(token);
    }

    #[abi(embed_v0)]
    impl VaultImpl of super::IVault<ContractState> {
        fn deposit(ref self: ContractState, amount: u128) {
            assert(amount > 0, 'Amount must be > 0');
            let caller = get_caller_address();
            let token = IERC20Dispatcher { contract_address: self.token.read() };
            token.transfer_from(caller, get_contract_address(), amount.into());
            self.total_liquidity.write(self.total_liquidity.read() + amount);
            self.emit(Deposited { provider: caller, amount });
        }

        fn withdraw(ref self: ContractState, amount: u128) {
            let caller = get_caller_address();
            // Simple proportional withdrawal — extend with LP-share logic as needed.
            assert(amount <= self.total_liquidity.read(), 'Insufficient liquidity');
            let token = IERC20Dispatcher { contract_address: self.token.read() };
            self.total_liquidity.write(self.total_liquidity.read() - amount);
            token.transfer(caller, amount.into());
            self.emit(Withdrawn { provider: caller, amount });
        }

        fn pay_winner(ref self: ContractState, recipient: ContractAddress, amount: u128) {
            let caller = get_caller_address();
            assert(caller == self.settlement_engine.read(), 'Only settlement engine');
            assert(amount <= self.total_liquidity.read(), 'Insufficient vault liquidity');
            let token = IERC20Dispatcher { contract_address: self.token.read() };
            self.total_liquidity.write(self.total_liquidity.read() - amount);
            token.transfer(recipient, amount.into());
            self.emit(WinnerPaid { recipient, amount });
        }

        fn absorb_losses(ref self: ContractState, amount: u128) {
            let caller = get_caller_address();
            assert(caller == self.settlement_engine.read(), 'Only settlement engine');
            // Funds have already been transferred to this contract by the engine.
            self.total_liquidity.write(self.total_liquidity.read() + amount);
            self.emit(LossesAbsorbed { amount });
        }

        fn total_liquidity(self: @ContractState) -> u128 {
            self.total_liquidity.read()
        }

        fn set_settlement_engine(ref self: ContractState, engine: ContractAddress) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner');
            self.settlement_engine.write(engine);
        }
    }
}

// ---------------------------------------------------------------------------
// Treasury implementation
// ---------------------------------------------------------------------------
#[starknet::contract]
pub mod Treasury {
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use super::super::erc20_dispatcher::{IERC20Dispatcher, IERC20DispatcherTrait};
    use super::super::types::{BPS_SCALE};

    // Allocation percentages (basis points of collected fee).
    const VAULT_BPS: u128 = 4000;   // 40%
    const AI_BPS: u128 = 3500;      // 35%
    const DEV_BPS: u128 = 2500;     // 25%

    #[storage]
    struct Storage {
        owner: ContractAddress,
        settlement_engine: ContractAddress,
        token: ContractAddress,
        vault_balance: u128,
        ai_fund_balance: u128,
        dev_fund_balance: u128,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        FeeReceived: FeeReceived,
        FundsWithdrawn: FundsWithdrawn,
    }

    #[derive(Drop, starknet::Event)]
    pub struct FeeReceived {
        pub amount: u128,
        pub vault_share: u128,
        pub ai_share: u128,
        pub dev_share: u128,
    }

    #[derive(Drop, starknet::Event)]
    pub struct FundsWithdrawn {
        #[key]
        pub to: ContractAddress,
        pub amount: u128,
        pub fund: felt252,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, token: ContractAddress) {
        self.owner.write(owner);
        self.token.write(token);
    }

    #[abi(embed_v0)]
    impl TreasuryImpl of super::ITreasury<ContractState> {
        fn receive_fee(ref self: ContractState, amount: u128) {
            let caller = get_caller_address();
            assert(caller == self.settlement_engine.read(), 'Only settlement engine');
            assert(amount > 0, 'Zero fee');

            // Transfer tokens to this contract (engine must have already approved).
            let token = IERC20Dispatcher { contract_address: self.token.read() };
            token.transfer_from(caller, get_contract_address(), amount.into());

            // Allocate shares.
            let vault_share = amount * VAULT_BPS / BPS_SCALE;
            let ai_share = amount * AI_BPS / BPS_SCALE;
            // Dev gets the remainder to avoid rounding dust loss.
            let dev_share = amount - vault_share - ai_share;

            self.vault_balance.write(self.vault_balance.read() + vault_share);
            self.ai_fund_balance.write(self.ai_fund_balance.read() + ai_share);
            self.dev_fund_balance.write(self.dev_fund_balance.read() + dev_share);

            self.emit(FeeReceived { amount, vault_share, ai_share, dev_share });
        }

        fn vault_balance(self: @ContractState) -> u128 {
            self.vault_balance.read()
        }

        fn ai_fund_balance(self: @ContractState) -> u128 {
            self.ai_fund_balance.read()
        }

        fn dev_fund_balance(self: @ContractState) -> u128 {
            self.dev_fund_balance.read()
        }

        fn withdraw_vault_allocation(ref self: ContractState, to: ContractAddress, amount: u128) {
            self._only_owner();
            assert(amount <= self.vault_balance.read(), 'Insufficient vault balance');
            self.vault_balance.write(self.vault_balance.read() - amount);
            self._transfer(to, amount);
            self.emit(FundsWithdrawn { to, amount, fund: 'vault' });
        }

        fn withdraw_ai_fund(ref self: ContractState, to: ContractAddress, amount: u128) {
            self._only_owner();
            assert(amount <= self.ai_fund_balance.read(), 'Insufficient AI balance');
            self.ai_fund_balance.write(self.ai_fund_balance.read() - amount);
            self._transfer(to, amount);
            self.emit(FundsWithdrawn { to, amount, fund: 'ai' });
        }

        fn withdraw_dev_fund(ref self: ContractState, to: ContractAddress, amount: u128) {
            self._only_owner();
            assert(amount <= self.dev_fund_balance.read(), 'Insufficient dev balance');
            self.dev_fund_balance.write(self.dev_fund_balance.read() - amount);
            self._transfer(to, amount);
            self.emit(FundsWithdrawn { to, amount, fund: 'dev' });
        }

        fn set_settlement_engine(ref self: ContractState, engine: ContractAddress) {
            self._only_owner();
            self.settlement_engine.write(engine);
        }

        fn set_token(ref self: ContractState, token: ContractAddress) {
            self._only_owner();
            self.token.write(token);
        }
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------
    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _only_owner(ref self: ContractState) {
            assert(get_caller_address() == self.owner.read(), 'Only owner');
        }

        fn _transfer(ref self: ContractState, to: ContractAddress, amount: u128) {
            let token = IERC20Dispatcher { contract_address: self.token.read() };
            token.transfer(to, amount.into());
        }
    }
}
