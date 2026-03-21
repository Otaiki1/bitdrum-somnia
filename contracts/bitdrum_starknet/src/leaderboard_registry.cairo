// =============================================================================
// LeaderboardRegistry — tracks trader reputation (wins, losses, net P&L)
// =============================================================================

use starknet::ContractAddress;
use super::types::TraderStats;

#[starknet::interface]
pub trait ILeaderboardRegistry<TContractState> {
    /// Called by SettlementEngine after a market settles.
    /// Only the authorised settlement engine may call this.
    fn record_result(
        ref self: TContractState,
        trader: ContractAddress,
        won: bool,
        pnl: i128,
    );

    /// Read-only stats for any address.
    fn get_stats(self: @TContractState, trader: ContractAddress) -> TraderStats;

    /// Update the authorised settlement engine address (owner only).
    fn set_settlement_engine(ref self: TContractState, engine: ContractAddress);
}

#[starknet::contract]
pub mod LeaderboardRegistry {
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess,
        Map, StorageMapReadAccess, StorageMapWriteAccess,
    };
    use super::super::types::TraderStats;

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------
    #[storage]
    struct Storage {
        owner: ContractAddress,
        settlement_engine: ContractAddress,
        stats: Map<ContractAddress, TraderStats>,
    }

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        ResultRecorded: ResultRecorded,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ResultRecorded {
        #[key]
        pub trader: ContractAddress,
        pub won: bool,
        pub pnl: i128,
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
    }

    // -------------------------------------------------------------------------
    // Implementation
    // -------------------------------------------------------------------------
    #[abi(embed_v0)]
    impl LeaderboardRegistryImpl of super::ILeaderboardRegistry<ContractState> {
        fn record_result(
            ref self: ContractState,
            trader: ContractAddress,
            won: bool,
            pnl: i128,
        ) {
            let caller = get_caller_address();
            assert(caller == self.settlement_engine.read(), 'Only settlement engine');

            let mut s = self.stats.read(trader);
            if won {
                s.wins += 1;
            } else {
                s.losses += 1;
            }
            s.net_pnl += pnl;
            self.stats.write(trader, s);

            self.emit(ResultRecorded { trader, won, pnl });
        }

        fn get_stats(self: @ContractState, trader: ContractAddress) -> TraderStats {
            self.stats.read(trader)
        }

        fn set_settlement_engine(ref self: ContractState, engine: ContractAddress) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner');
            self.settlement_engine.write(engine);
        }
    }
}
