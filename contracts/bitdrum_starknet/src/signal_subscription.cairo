// =============================================================================
// SignalSubscription — tiered gating for AI signals
// =============================================================================
//
// Tiers:
//   PRO:   $50 / month  (50,000,000 token units if 6 decimals)
//   ELITE: $200 / month (200,000,000 token units if 6 decimals)
//
// Funds are routed to the Treasury for allocation.

use starknet::ContractAddress;

#[allow(starknet::store_no_default_variant)]
#[derive(Drop, Serde, starknet::Store, PartialEq, Copy)]
pub enum SubscriptionTier {
    None,
    Pro,
    Elite,
}

#[derive(Drop, Serde, starknet::Store, Copy)]
pub struct SubscriptionRecord {
    pub tier: SubscriptionTier,
    pub paid_until: u64,
}

#[starknet::interface]
pub trait ISignalSubscription<TContractState> {
    /// Subscribe to a tier for 30 days.
    fn subscribe(ref self: TContractState, tier: SubscriptionTier);

    /// Check if a user has an active subscription.
    fn get_subscription(self: @TContractState, user: ContractAddress) -> SubscriptionRecord;

    /// Config (owner only).
    fn set_token(ref self: TContractState, token: ContractAddress);
    fn set_treasury(ref self: TContractState, treasury: ContractAddress);
    fn set_prices(ref self: TContractState, pro_price: u128, elite_price: u128);
}

#[starknet::contract]
pub mod SignalSubscription {
    use starknet::{ContractAddress, get_caller_address, get_contract_address, get_block_timestamp};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess,
        Map, StorageMapReadAccess, StorageMapWriteAccess,
    };
    use super::{SubscriptionTier, SubscriptionRecord};
    use super::super::erc20_dispatcher::{IERC20Dispatcher, IERC20DispatcherTrait};
    use super::super::vault_treasury::{ITreasuryDispatcher, ITreasuryDispatcherTrait};

    const MONTH_SECONDS: u64 = 2592000; // 30 days

    #[storage]
    struct Storage {
        owner: ContractAddress,
        token: ContractAddress,
        treasury: ContractAddress,
        pro_price: u128,
        elite_price: u128,
        subscriptions: Map<ContractAddress, SubscriptionRecord>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        Subscribed: Subscribed,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Subscribed {
        #[key]
        pub user: ContractAddress,
        pub tier: SubscriptionTier,
        pub paid_until: u64,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        token: ContractAddress,
        treasury: ContractAddress,
        pro_price: u128,
        elite_price: u128,
    ) {
        self.owner.write(owner);
        self.token.write(token);
        self.treasury.write(treasury);
        self.pro_price.write(pro_price);
        self.elite_price.write(elite_price);
    }

    #[abi(embed_v0)]
    impl SignalSubscriptionImpl of super::ISignalSubscription<ContractState> {
        fn subscribe(ref self: ContractState, tier: SubscriptionTier) {
            assert(tier != SubscriptionTier::None, 'Invalid tier');
            let caller = get_caller_address();
            let now = get_block_timestamp();

            let price = match tier {
                SubscriptionTier::Pro => self.pro_price.read(),
                SubscriptionTier::Elite => self.elite_price.read(),
                SubscriptionTier::None => 0,
            };

            // Pull payment.
            let token = IERC20Dispatcher { contract_address: self.token.read() };
            token.transfer_from(caller, get_contract_address(), price.into());

            // Approve and route to Treasury.
            token.approve(self.treasury.read(), price.into());
            let treasury = ITreasuryDispatcher { contract_address: self.treasury.read() };
            treasury.receive_fee(price);

            // Update record.
            let mut record = self.subscriptions.read(caller);
            let start_time = if record.paid_until > now { record.paid_until } else { now };
            let new_expiry = start_time + MONTH_SECONDS;

            record.tier = tier;
            record.paid_until = new_expiry;
            self.subscriptions.write(caller, record);

            self.emit(Subscribed { user: caller, tier, paid_until: new_expiry });
        }

        fn get_subscription(self: @ContractState, user: ContractAddress) -> SubscriptionRecord {
            self.subscriptions.read(user)
        }

        fn set_token(ref self: ContractState, token: ContractAddress) {
            self._only_owner();
            self.token.write(token);
        }

        fn set_treasury(ref self: ContractState, treasury: ContractAddress) {
            self._only_owner();
            self.treasury.write(treasury);
        }

        fn set_prices(ref self: ContractState, pro_price: u128, elite_price: u128) {
            self._only_owner();
            self.pro_price.write(pro_price);
            self.elite_price.write(elite_price);
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _only_owner(ref self: ContractState) {
            assert(get_caller_address() == self.owner.read(), 'Only owner');
        }
    }
}
