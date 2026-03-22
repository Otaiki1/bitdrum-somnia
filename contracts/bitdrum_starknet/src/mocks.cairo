// =============================================================================
// Mocks — BitDrum test utilities
// =============================================================================

#[starknet::contract]
pub mod MockERC20 {
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess,
        Map, StorageMapReadAccess, StorageMapWriteAccess,
    };

    #[storage]
    struct Storage {
        balances: Map<ContractAddress, u256>,
        allowances: Map<(ContractAddress, ContractAddress), u256>,
    }

    #[abi(embed_v0)]
    impl MockERC20Impl of bitdrum_starknet::erc20_dispatcher::IERC20<ContractState> {
        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            let b = self.balances.read(account);
            if b == 0 { 1000000_000000000000000000 } else { b }
        }
        fn allowance(self: @ContractState, owner: ContractAddress, spender: ContractAddress) -> u256 {
            self.allowances.read((owner, spender))
        }
        fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
            true
        }
        fn transfer_from(ref self: ContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool {
            true
        }
        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
            let caller = get_caller_address();
            self.allowances.write((caller, spender), amount);
            true
        }
    }
}

#[starknet::contract]
pub mod MockVault {
    use starknet::{ContractAddress};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess,
    };

    #[storage]
    struct Storage {
        total_liquidity_state: u128,
        settlement_engine: ContractAddress,
    }

    #[abi(embed_v0)]
    impl MockVaultImpl of bitdrum_starknet::vault_treasury::IVault<ContractState> {
        fn deposit(ref self: ContractState, amount: u128) {
            self.total_liquidity_state.write(self.total_liquidity_state.read() + amount);
        }
        fn withdraw(ref self: ContractState, amount: u128) {
            self.total_liquidity_state.write(self.total_liquidity_state.read() - amount);
        }
        fn total_liquidity(self: @ContractState) -> u128 {
            self.total_liquidity_state.read()
        }
        fn pay_winner(ref self: ContractState, recipient: ContractAddress, amount: u128) {
        }
        fn absorb_losses(ref self: ContractState, amount: u128) {
            self.total_liquidity_state.write(self.total_liquidity_state.read() + amount);
        }
        fn set_settlement_engine(ref self: ContractState, engine: ContractAddress) {
            self.settlement_engine.write(engine);
        }
    }
}

#[starknet::contract]
pub mod MockTreasury {
    use starknet::{ContractAddress};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess,
    };

    #[storage]
    struct Storage {
        settlement_engine: ContractAddress,
        token: ContractAddress,
    }

    #[abi(embed_v0)]
    impl MockTreasuryImpl of bitdrum_starknet::vault_treasury::ITreasury<ContractState> {
        fn receive_fee(ref self: ContractState, amount: u128) {
        }
        fn vault_balance(self: @ContractState) -> u128 { 0 }
        fn ai_fund_balance(self: @ContractState) -> u128 { 0 }
        fn dev_fund_balance(self: @ContractState) -> u128 { 0 }
        fn withdraw_vault_allocation(ref self: ContractState, to: ContractAddress, amount: u128) {}
        fn withdraw_ai_fund(ref self: ContractState, to: ContractAddress, amount: u128) {}
        fn withdraw_dev_fund(ref self: ContractState, to: ContractAddress, amount: u128) {}
        fn set_settlement_engine(ref self: ContractState, engine: ContractAddress) {
            self.settlement_engine.write(engine);
        }
        fn set_token(ref self: ContractState, token: ContractAddress) {
            self.token.write(token);
        }
    }
}

#[starknet::contract]
pub mod MockPredictionMarket {
    use starknet::{ContractAddress};
    use bitdrum_starknet::types::{Market, MarketState, Participant, Direction};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess,
    };

    #[storage]
    struct Storage {
        settlement_engine: ContractAddress,
        token: ContractAddress,
        vault: ContractAddress,
        treasury: ContractAddress,
    }

    #[abi(embed_v0)]
    impl MockPredictionMarketImpl of bitdrum_starknet::prediction_market::IPredictionMarket<ContractState> {
        fn open_market(ref self: ContractState, direction: Direction, pom_profit_bps: u16, stake: u128) -> u64 { 1 }
        fn join_market(ref self: ContractState, market_id: u64, direction: Direction, stake: u128) {}
        fn lock_market(ref self: ContractState, market_id: u64) {}
        fn mark_claimable(ref self: ContractState, market_id: u64, settlement_price: u128, settled_at: u64) {}
        fn claim(ref self: ContractState, market_id: u64) {}
        fn close_market(ref self: ContractState, market_id: u64) {}
        
        fn get_market(self: @ContractState, market_id: u64) -> Market {
            Market {
                id: 1,
                opener: core::num::traits::Zero::zero(),
                entry_price: 65000_00000000,
                join_deadline: 0,
                pom_profit_bps: 1000,
                opener_direction: Direction::Long,
                long_pool: 500,
                short_pool: 500,
                state: MarketState::Locked,
                settlement_price: 0,
                settled_at: 0,
            }
        }
        fn get_participant(self: @ContractState, market_id: u64, participant: ContractAddress) -> Participant {
             Participant { stake: 0, direction: Direction::Long, claimed: false }
        }
        fn market_count(self: @ContractState) -> u64 { 1 }
        fn set_settlement_engine(ref self: ContractState, engine: ContractAddress) {
            self.settlement_engine.write(engine);
        }
        fn set_token(ref self: ContractState, token: ContractAddress) {
            self.token.write(token);
        }
        fn set_vault(ref self: ContractState, vault: ContractAddress) {
            self.vault.write(vault);
        }
        fn set_treasury(ref self: ContractState, treasury: ContractAddress) {
            self.treasury.write(treasury);
        }
    }
}

#[starknet::contract]
pub mod MockPragmaOracle {
    use bitdrum_starknet::settlement_engine::{DataType, IPragmaABI, PragmaPricesResponse};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess,
    };

    #[storage]
    struct Storage {
        price: u128,
        decimals: u32,
        last_updated_timestamp: u64,
        num_sources_aggregated: u32,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        price: u128,
        last_updated_timestamp: u64,
        decimals: u32,
        num_sources_aggregated: u32,
    ) {
        self.price.write(price);
        self.decimals.write(decimals);
        self.last_updated_timestamp.write(last_updated_timestamp);
        self.num_sources_aggregated.write(num_sources_aggregated);
    }

    #[abi(embed_v0)]
    impl MockPragmaOracleImpl of IPragmaABI<ContractState> {
        fn get_data_median(self: @ContractState, data_type: DataType) -> PragmaPricesResponse {
            let _ = data_type;
            PragmaPricesResponse {
                price: self.price.read(),
                decimals: self.decimals.read(),
                last_updated_timestamp: self.last_updated_timestamp.read(),
                num_sources_aggregated: self.num_sources_aggregated.read(),
                expiration_timestamp: Option::None,
            }
        }
    }
}
