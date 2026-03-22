// =============================================================================
// PredictionMarket — market lifecycle management
// =============================================================================
//
// State machine:
//   OPEN → LOCKED → SETTLED → CLAIMABLE → CLOSED
//
// Participants join during the JOINING_WINDOW (Open state).
// The locker closes the market after the window expires.
// SettlementEngine drives SETTLED → CLAIMABLE → CLOSED.

use starknet::ContractAddress;
use super::types::{Market, Participant, Direction};

#[starknet::interface]
pub trait IPredictionMarket<TContractState> {
    /// Open a new market. Opener specifies direction, profit bps, and stake.
    fn open_market(
        ref self: TContractState,
        direction: Direction,
        pom_profit_bps: u16,
        stake: u128,
    ) -> u64;

    /// Join an existing market. Caller may choose Long or Short.
    fn join_market(ref self: TContractState, market_id: u64, direction: Direction, stake: u128);

    /// Lock the market after the joining window has expired.
    /// Anyone may call this to prevent stall attacks.
    fn lock_market(ref self: TContractState, market_id: u64);

    /// Persist the strike / entry price once the joining window closes.
    fn set_entry_price(ref self: TContractState, market_id: u64, entry_price: u128);

    /// Mark market as CLAIMABLE (called by SettlementEngine).
    fn mark_claimable(ref self: TContractState, market_id: u64, settlement_price: u128, settled_at: u64);

    /// Winner claims their payout.
    fn claim(ref self: TContractState, market_id: u64);

    /// Close the market (admin cleanup after all claims).
    fn close_market(ref self: TContractState, market_id: u64);

    // --- View functions ---
    fn get_market(self: @TContractState, market_id: u64) -> Market;
    fn get_participant(
        self: @TContractState, market_id: u64, participant: ContractAddress,
    ) -> Participant;
    fn market_count(self: @TContractState) -> u64;

    // --- Config ---
    fn set_settlement_engine(ref self: TContractState, engine: ContractAddress);
    fn set_token(ref self: TContractState, token: ContractAddress);
    fn set_vault(ref self: TContractState, vault: ContractAddress);
    fn set_treasury(ref self: TContractState, treasury: ContractAddress);
}

#[starknet::contract]
pub mod PredictionMarket {
    use starknet::{ContractAddress, get_caller_address, get_contract_address, get_block_timestamp};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess,
        Map, StorageMapReadAccess, StorageMapWriteAccess,
    };
    use super::super::types::{
        Market, Participant, MarketState, Direction,
        JOINING_WINDOW, MIN_PROFIT_BPS, MAX_PROFIT_BPS, BPS_SCALE,
    };
    use super::super::erc20_dispatcher::{IERC20Dispatcher, IERC20DispatcherTrait};
    use super::super::vault_treasury::{IVaultDispatcher, IVaultDispatcherTrait};

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------
    #[storage]
    struct Storage {
        owner: ContractAddress,
        settlement_engine: ContractAddress,
        token: ContractAddress,
        vault: ContractAddress,
        treasury: ContractAddress,
        market_count: u64,
        markets: Map<u64, Market>,
        participants: Map<(u64, ContractAddress), Participant>,
    }

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        MarketOpened: MarketOpened,
        MarketJoined: MarketJoined,
        MarketLocked: MarketLocked,
        MarketClaimable: MarketClaimable,
        Claimed: Claimed,
        MarketClosed: MarketClosed,
    }

    #[derive(Drop, starknet::Event)]
    pub struct MarketOpened {
        #[key]
        pub market_id: u64,
        pub opener: ContractAddress,
        pub direction: Direction,
        pub pom_profit_bps: u16,
        pub stake: u128,
        pub join_deadline: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct MarketJoined {
        #[key]
        pub market_id: u64,
        #[key]
        pub participant: ContractAddress,
        pub direction: Direction,
        pub stake: u128,
    }

    #[derive(Drop, starknet::Event)]
    pub struct MarketLocked {
        #[key]
        pub market_id: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct MarketClaimable {
        #[key]
        pub market_id: u64,
        pub settlement_price: u128,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Claimed {
        #[key]
        pub market_id: u64,
        #[key]
        pub participant: ContractAddress,
        pub payout: u128,
    }

    #[derive(Drop, starknet::Event)]
    pub struct MarketClosed {
        #[key]
        pub market_id: u64,
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        token: ContractAddress,
        vault: ContractAddress,
        treasury: ContractAddress,
    ) {
        self.owner.write(owner);
        self.token.write(token);
        self.vault.write(vault);
        self.treasury.write(treasury);
    }

    // -------------------------------------------------------------------------
    // Public implementation
    // -------------------------------------------------------------------------
    #[abi(embed_v0)]
    impl PredictionMarketImpl of super::IPredictionMarket<ContractState> {
        fn open_market(
            ref self: ContractState,
            direction: Direction,
            pom_profit_bps: u16,
            stake: u128,
        ) -> u64 {
            assert(stake > 0, 'Stake must be > 0');
            assert(
                pom_profit_bps >= MIN_PROFIT_BPS && pom_profit_bps <= MAX_PROFIT_BPS,
                'POM bps out of range',
            );
            assert(direction != Direction::Placeholder, 'Invalid direction');

            let opener = get_caller_address();
            let now = get_block_timestamp();
            let join_deadline = now + JOINING_WINDOW;
            let id = self.market_count.read() + 1;
            self.market_count.write(id);

            // Pull stake from opener.
            self._pull_tokens(opener, stake);

            // Vault automatically takes the counter-side by depositing matching stake.
            // (Vault must already hold sufficient liquidity.)
            let vault_dispatcher = IVaultDispatcher { contract_address: self.vault.read() };
            // For the opener's direction, vault counter-backs the opposite pool.
            match direction {
                Direction::Long => {
                    // Vault goes short: increase short pool on behalf of vault.
                    // We record vault as a "participant" with the contract address.
                    let vault_addr = self.vault.read();
                    let vault_participant = Participant {
                        stake, direction: Direction::Short, claimed: false,
                    };
                    self.participants.write((id, vault_addr), vault_participant);
                },
                Direction::Short => {
                    let vault_addr = self.vault.read();
                    let vault_participant = Participant {
                        stake, direction: Direction::Long, claimed: false,
                    };
                    self.participants.write((id, vault_addr), vault_participant);
                },
                Direction::Placeholder => { panic!("Invalid direction"); }
            }
            // Vault funds stay in vault contract; we just track the exposure.
            // vault_dispatcher is used during settlement to pay out / absorb.
            let _ = vault_dispatcher;

            // Opener is long → vault counters short, and vice versa.
            // Both sides start equal so long_pool == short_pool == stake.

            // Build market.
            let market = Market {
                id,
                opener,
                entry_price: 0, // Set by SettlementEngine at lock
                join_deadline,
                pom_profit_bps,
                opener_direction: direction,
                long_pool: match direction { Direction::Long => stake, Direction::Short => stake, Direction::Placeholder => 0 },
                short_pool: match direction { Direction::Long => stake, Direction::Short => stake, Direction::Placeholder => 0 },
                state: MarketState::Open,
                settlement_price: 0,
                settled_at: 0,
            };
            self.markets.write(id, market);

            // Record opener as participant.
            let opener_participant = Participant { stake, direction, claimed: false };
            self.participants.write((id, opener), opener_participant);

            self.emit(MarketOpened {
                market_id: id,
                opener,
                direction,
                pom_profit_bps,
                stake,
                join_deadline,
            });

            id
        }

        fn join_market(
            ref self: ContractState,
            market_id: u64,
            direction: Direction,
            stake: u128,
        ) {
            assert(stake > 0, 'Stake must be > 0');
            assert(direction != Direction::Placeholder, 'Invalid direction');
            let mut market = self.markets.read(market_id);
            assert(market.state == MarketState::Open, 'Market not open');
            let now = get_block_timestamp();
            assert(now <= market.join_deadline, 'Joining window closed');

            let caller = get_caller_address();
            // Prevent double-joining.
            let existing = self.participants.read((market_id, caller));
            assert(existing.stake == 0, 'Already joined');

            self._pull_tokens(caller, stake);

            // Update pool totals.
            match direction {
                Direction::Long => { market.long_pool += stake; },
                Direction::Short => { market.short_pool += stake; },
                Direction::Placeholder => { panic!("Invalid direction"); }
            }
            self.markets.write(market_id, market);

            let participant = Participant { stake, direction, claimed: false };
            self.participants.write((market_id, caller), participant);

            self.emit(MarketJoined { market_id, participant: caller, direction, stake });
        }

        fn lock_market(ref self: ContractState, market_id: u64) {
            let mut market = self.markets.read(market_id);
            assert(market.state == MarketState::Open, 'Market not open');
            let now = get_block_timestamp();
            assert(now > market.join_deadline, 'Joining window still open');

            market.state = MarketState::Locked;
            self.markets.write(market_id, market);
            self.emit(MarketLocked { market_id });
        }

        fn set_entry_price(ref self: ContractState, market_id: u64, entry_price: u128) {
            let caller = get_caller_address();
            assert(
                caller == self.owner.read() || caller == self.settlement_engine.read(),
                'Unauthorized',
            );
            assert(entry_price > 0, 'Entry price must be > 0');

            let mut market = self.markets.read(market_id);
            market.entry_price = entry_price;
            self.markets.write(market_id, market);
        }

        fn mark_claimable(
            ref self: ContractState,
            market_id: u64,
            settlement_price: u128,
            settled_at: u64,
        ) {
            let caller = get_caller_address();
            assert(caller == self.settlement_engine.read(), 'Only settlement engine');
            let mut market = self.markets.read(market_id);
            // Engine calls this after validating the attestation; market arrives Locked.
            assert(market.state == MarketState::Locked, 'Market not locked');

            market.settlement_price = settlement_price;
            market.settled_at = settled_at;
            market.state = MarketState::Claimable;
            self.markets.write(market_id, market);

            self.emit(MarketClaimable { market_id, settlement_price });
        }

        fn claim(ref self: ContractState, market_id: u64) {
            let market = self.markets.read(market_id);
            assert(market.state == MarketState::Claimable, 'Not claimable');

            let caller = get_caller_address();
            let mut participant = self.participants.read((market_id, caller));
            assert(participant.stake > 0, 'No stake found');
            assert(!participant.claimed, 'Already claimed');

            // Determine winning direction.
            let winning_direction = if market.settlement_price > market.entry_price {
                Direction::Long
            } else if market.settlement_price < market.entry_price {
                Direction::Short
            } else {
                // DRAW: refund stake to everyone.
                let draw_stake = participant.stake;
                participant.claimed = true;
                self.participants.write((market_id, caller), participant);
                self._send_tokens(caller, draw_stake);
                self.emit(Claimed { market_id, participant: caller, payout: draw_stake });
                return;
            };

            let is_winner = participant.direction == winning_direction;
            if !is_winner {
                // Losing side – no payout (loss absorbed by vault).
                participant.claimed = true;
                self.participants.write((market_id, caller), participant);
                self.emit(Claimed { market_id, participant: caller, payout: 0 });
                return;
            }

            // Winner payout = stake + (stake * profit_bps / 10000).
            let winner_stake = participant.stake;
            let profit = winner_stake * market.pom_profit_bps.into() / BPS_SCALE;
            let payout = winner_stake + profit;

            participant.claimed = true;
            self.participants.write((market_id, caller), participant);

            // Source of the profit portion is the vault.
            let vault = IVaultDispatcher { contract_address: self.vault.read() };
            // Transfer stake back from contract itself.
            self._send_tokens(caller, winner_stake);
            // Request vault to pay the profit portion.
            vault.pay_winner(caller, profit);

            self.emit(Claimed { market_id, participant: caller, payout });
        }

        fn close_market(ref self: ContractState, market_id: u64) {
            let mut market = self.markets.read(market_id);
            assert(market.state == MarketState::Claimable, 'Not claimable');
            // Only owner or settlement engine.
            let caller = get_caller_address();
            assert(
                caller == self.owner.read() || caller == self.settlement_engine.read(),
                'Unauthorized',
            );
            market.state = MarketState::Closed;
            self.markets.write(market_id, market);
            self.emit(MarketClosed { market_id });
        }

        fn get_market(self: @ContractState, market_id: u64) -> Market {
            self.markets.read(market_id)
        }

        fn get_participant(
            self: @ContractState,
            market_id: u64,
            participant: ContractAddress,
        ) -> Participant {
            self.participants.read((market_id, participant))
        }

        fn market_count(self: @ContractState) -> u64 {
            self.market_count.read()
        }

        fn set_settlement_engine(ref self: ContractState, engine: ContractAddress) {
            self._only_owner();
            self.settlement_engine.write(engine);
        }

        fn set_token(ref self: ContractState, token: ContractAddress) {
            self._only_owner();
            self.token.write(token);
        }

        fn set_vault(ref self: ContractState, vault: ContractAddress) {
            self._only_owner();
            self.vault.write(vault);
        }

        fn set_treasury(ref self: ContractState, treasury: ContractAddress) {
            self._only_owner();
            self.treasury.write(treasury);
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

        fn _pull_tokens(ref self: ContractState, from: ContractAddress, amount: u128) {
            let token = IERC20Dispatcher { contract_address: self.token.read() };
            let success = token.transfer_from(from, get_contract_address(), amount.into());
            assert(success, 'Token transfer failed');
        }

        fn _send_tokens(ref self: ContractState, to: ContractAddress, amount: u128) {
            let token = IERC20Dispatcher { contract_address: self.token.read() };
            let success = token.transfer(to, amount.into());
            assert(success, 'Token send failed');
        }
    }
}
