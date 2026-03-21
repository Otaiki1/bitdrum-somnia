// =============================================================================
// SettlementEngine — oracle-driven market settlement via Pragma
// =============================================================================
//
// Flow:
//   1. Anyone calls `settle(market_id)`.
//   2. Engine calls Pragma oracle: `get_data_median(DataType::SpotEntry(BTC_USD))`.
//   3. Validates freshness: `last_updated_timestamp` must be within 30 seconds.
//   4. Determines winning direction vs market entry_price.
//   5. Calculates 2% protocol fee; routes to Treasury.
//   6. Directs Vault to absorb losing pool.
//   7. Marks market as CLAIMABLE via PredictionMarket.

use starknet::ContractAddress;

#[starknet::interface]
pub trait ISettlementEngine<TContractState> {
    /// Settle a locked market — fetches live BTC/USD price from Pragma.
    fn settle(ref self: TContractState, market_id: u64);

    /// Set the entry price for a locked market (called at lock time).
    fn set_entry_price(ref self: TContractState, market_id: u64, price: u128);

    // --- Config (owner only) ---
    fn set_prediction_market(ref self: TContractState, market: ContractAddress);
    fn set_vault(ref self: TContractState, vault: ContractAddress);
    fn set_treasury(ref self: TContractState, treasury: ContractAddress);
    fn set_leaderboard(ref self: TContractState, leaderboard: ContractAddress);
    fn set_pragma_oracle(ref self: TContractState, oracle: ContractAddress);
}

#[starknet::contract]
pub mod SettlementEngine {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess,
        Map, StorageMapReadAccess, StorageMapWriteAccess,
    };

    // ── Pragma oracle local definitions ────────────────────────────────────
    #[derive(Drop, Serde, Copy)]
    pub enum DataType {
        SpotEntry: felt252,
        FutureEntry: (felt252, u64),
        GenericEntry: felt252,
    }

    #[derive(Drop, Serde, Copy)]
    pub struct PragmaPricesResponse {
        pub price: u128,
        pub decimals: u32,
        pub last_updated_timestamp: u64,
        pub num_sources_aggregated: u32,
        pub expiration_timestamp: Option<u64>,
    }

    #[starknet::interface]
    pub trait IPragmaABI<TContractState> {
        fn get_data_median(self: @TContractState, data_type: DataType) -> PragmaPricesResponse;
    }

    // ── BitDrum internals ─────────────────────────────────────────────────
    use super::super::types::{
        MarketState, Direction,
        ATTESTATION_MAX_AGE, PROTOCOL_FEE_BPS, BPS_SCALE, BTC_USD_PAIR_ID,
    };
    use super::super::prediction_market::{
        IPredictionMarketDispatcher, IPredictionMarketDispatcherTrait,
    };
    use super::super::vault_treasury::{
        IVaultDispatcher, IVaultDispatcherTrait,
        ITreasuryDispatcher, ITreasuryDispatcherTrait,
    };

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------
    #[storage]
    struct Storage {
        owner: ContractAddress,
        prediction_market: ContractAddress,
        vault: ContractAddress,
        treasury: ContractAddress,
        leaderboard: ContractAddress,
        /// Pragma oracle contract address on Starknet.
        pragma_oracle: ContractAddress,
        settled_markets: Map<u64, bool>,
        /// Entry prices set at lock time (market_id → price).
        entry_prices: Map<u64, u128>,
    }

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        MarketSettled: MarketSettled,
        DrawSettled: DrawSettled,
    }

    #[derive(Drop, starknet::Event)]
    pub struct MarketSettled {
        #[key]
        pub market_id: u64,
        pub settlement_price: u128,
        pub winning_direction: Direction,
        pub protocol_fee: u128,
    }

    #[derive(Drop, starknet::Event)]
    pub struct DrawSettled {
        #[key]
        pub market_id: u64,
        pub entry_price: u128,
        pub settlement_price: u128,
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        pragma_oracle: ContractAddress,
    ) {
        self.owner.write(owner);
        self.pragma_oracle.write(pragma_oracle);
    }

    // -------------------------------------------------------------------------
    // Public implementation
    // -------------------------------------------------------------------------
    #[abi(embed_v0)]
    impl SettlementEngineImpl of super::ISettlementEngine<ContractState> {
        fn settle(ref self: ContractState, market_id: u64) {
            // Guard: already settled?
            assert(!self.settled_markets.read(market_id), 'Already settled');

            // ── 1. Fetch BTC/USD price from Pragma ────────────────────────
            let pragma = IPragmaABIDispatcher {
                contract_address: self.pragma_oracle.read(),
            };
            let response: PragmaPricesResponse = pragma
                .get_data_median(DataType::SpotEntry(BTC_USD_PAIR_ID));

            let settlement_price = response.price;
            let price_timestamp = response.last_updated_timestamp;

            // ── 2. Freshness check ─────────────────────────────────────────
            let now = get_block_timestamp();
            assert(now >= price_timestamp, 'Price timestamp in future');
            assert(
                now - price_timestamp <= ATTESTATION_MAX_AGE,
                'Pragma price too stale (>30s)',
            );

            // ── 3. Fetch market ────────────────────────────────────────────
            let pm = IPredictionMarketDispatcher {
                contract_address: self.prediction_market.read(),
            };
            let market = pm.get_market(market_id);
            assert(market.state == MarketState::Locked, 'Market not locked');

            // Entry price was stored when the market was locked.
            let entry_price = self.entry_prices.read(market_id);
            assert(entry_price > 0, 'Entry price not set');

            // ── 4. Protocol fee (2% of total pool) ────────────────────────
            let total_pool = market.long_pool + market.short_pool;
            let protocol_fee = total_pool * PROTOCOL_FEE_BPS / BPS_SCALE;

            // ── 5. Route fee to Treasury ───────────────────────────────────
            if protocol_fee > 0 {
                let treasury = ITreasuryDispatcher { contract_address: self.treasury.read() };
                treasury.receive_fee(protocol_fee);
            }

            // ── 6. Vault absorbs losing pool ───────────────────────────────
            let vault = IVaultDispatcher { contract_address: self.vault.read() };

            if settlement_price > entry_price {
                // LONG wins → vault absorbs short losses (minus fee).
                let short_loss = market.short_pool * (BPS_SCALE - PROTOCOL_FEE_BPS) / BPS_SCALE;
                vault.absorb_losses(short_loss);
                self.emit(MarketSettled {
                    market_id,
                    settlement_price,
                    winning_direction: Direction::Long,
                    protocol_fee,
                });
            } else if settlement_price < entry_price {
                // SHORT wins → vault absorbs long losses (minus fee).
                let long_loss = market.long_pool * (BPS_SCALE - PROTOCOL_FEE_BPS) / BPS_SCALE;
                vault.absorb_losses(long_loss);
                self.emit(MarketSettled {
                    market_id,
                    settlement_price,
                    winning_direction: Direction::Short,
                    protocol_fee,
                });
            } else {
                // DRAW — everyone gets a full refund during `claim()`.
                self.emit(DrawSettled { market_id, entry_price, settlement_price });
            }

            // ── 7. Mark settled, then transition market to CLAIMABLE ───────
            self.settled_markets.write(market_id, true);
            pm.mark_claimable(market_id, settlement_price, now);
        }

        fn set_entry_price(ref self: ContractState, market_id: u64, price: u128) {
            // Called by an authorised locker when lock_market is triggered.
            let caller = get_caller_address();
            assert(
                caller == self.owner.read() || caller == self.prediction_market.read(),
                'Unauthorized',
            );
            assert(price > 0, 'Price must be > 0');
            self.entry_prices.write(market_id, price);
        }

        fn set_prediction_market(ref self: ContractState, market: ContractAddress) {
            self._only_owner();
            self.prediction_market.write(market);
        }

        fn set_vault(ref self: ContractState, vault: ContractAddress) {
            self._only_owner();
            self.vault.write(vault);
        }

        fn set_treasury(ref self: ContractState, treasury: ContractAddress) {
            self._only_owner();
            self.treasury.write(treasury);
        }

        fn set_leaderboard(ref self: ContractState, leaderboard: ContractAddress) {
            self._only_owner();
            self.leaderboard.write(leaderboard);
        }

        fn set_pragma_oracle(ref self: ContractState, oracle: ContractAddress) {
            self._only_owner();
            self.pragma_oracle.write(oracle);
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
    }
}
