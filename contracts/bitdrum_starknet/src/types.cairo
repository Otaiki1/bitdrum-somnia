// =============================================================================
// BitDrum shared types & constants
// =============================================================================

use starknet::ContractAddress;

// ---------------------------------------------------------------------------
// Market state machine
// ---------------------------------------------------------------------------
#[allow(starknet::store_no_default_variant)]
#[derive(Drop, Serde, starknet::Store, PartialEq, Copy)]
pub enum MarketState {
    /// Market is open and accepting participants.
    Open,
    /// Joining window has closed; no new participants allowed.
    Locked,
    /// Price has been settled by the oracle.
    Settled,
    /// Winners have been calculated; claims are open.
    Claimable,
    /// All claims have been processed; market is archived.
    Closed,
}

// ---------------------------------------------------------------------------
// Prediction direction
// ---------------------------------------------------------------------------
#[allow(starknet::store_no_default_variant)]
#[derive(Drop, Serde, starknet::Store, PartialEq, Copy)]
pub enum Direction {
    Long,
    Short,
}

// ---------------------------------------------------------------------------
// Core market struct
// ---------------------------------------------------------------------------
#[derive(Drop, Serde, starknet::Store)]
pub struct Market {
    pub id: u64,
    pub opener: ContractAddress,
    /// BTC/USD entry price (8 decimal places, matching Pragma)
    pub entry_price: u128,
    /// Timestamp (seconds) when the joining window closes.
    pub join_deadline: u64,
    /// POM profit percentage in basis points (500 = 5%, 7000 = 70%).
    pub pom_profit_bps: u16,
    /// Direction the opener is betting: Long or Short.
    pub opener_direction: Direction,
    /// Total stake from all longs (in token base units).
    pub long_pool: u128,
    /// Total stake from all shorts (in token base units).
    pub short_pool: u128,
    /// Current state of the market.
    pub state: MarketState,
    /// Final settlement price (0 until settled).
    pub settlement_price: u128,
    /// Timestamp of settlement.
    pub settled_at: u64,
}

// ---------------------------------------------------------------------------
// Participant entry
// ---------------------------------------------------------------------------
#[derive(Drop, Serde, starknet::Store, Copy)]
pub struct Participant {
    pub stake: u128,
    pub direction: Direction,
    pub claimed: bool,
}

// ---------------------------------------------------------------------------
// Trader stats (for leaderboard)
// ---------------------------------------------------------------------------
#[derive(Drop, Serde, starknet::Store)]
pub struct TraderStats {
    pub wins: u64,
    pub losses: u64,
    /// Net P&L in token base units (signed via i128).
    pub net_pnl: i128,
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
pub const JOINING_WINDOW: u64 = 300; // 5 minutes
pub const ATTESTATION_MAX_AGE: u64 = 30; // 30-second freshness window
pub const MIN_PROFIT_BPS: u16 = 500;  // 5 %
pub const MAX_PROFIT_BPS: u16 = 7000; // 70%
pub const PROTOCOL_FEE_BPS: u128 = 200; // 2%
pub const BPS_SCALE: u128 = 10000;
/// BTC/USD Pragma pair_id = felt252 encoding of "BTC/USD" = 18669995996566340
pub const BTC_USD_PAIR_ID: felt252 = 18669995996566340;
