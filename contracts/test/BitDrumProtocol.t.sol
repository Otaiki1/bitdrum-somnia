// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {LeaderboardRegistry} from "../src/LeaderboardRegistry.sol";
import {LiquidityVault} from "../src/LiquidityVault.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";
import {SettlementEngine} from "../src/SettlementEngine.sol";
import {SubscriptionsContract} from "../src/SubscriptionsContract.sol";
import {Treasury} from "../src/Treasury.sol";
import {Direction, Market, MarketState, OracleData, Outcome, Tier, TraderRecord} from "../src/Types.sol";

contract BitDrumProtocolTest is Test {
    // All amounts in native STT (18 decimals)
    uint256 internal constant ONE_STT = 1 ether;

    address internal user1 = makeAddr("user1");
    address internal user2 = makeAddr("user2");
    address internal aiFund = makeAddr("aiFund");
    address internal reserveFund = makeAddr("reserveFund");
    address internal signalRevenuePool = makeAddr("signalRevenuePool");

    LiquidityVault internal vault;
    Treasury internal treasury;
    LeaderboardRegistry internal leaderboard;
    PredictionMarket internal market;
    SettlementEngine internal settlementEngine;
    SubscriptionsContract internal subscriptions;

    receive() external payable {}

    function setUp() external {
        // Fund test accounts with native STT
        vm.deal(address(this), 100 ether);
        vm.deal(user1, 20 ether);
        vm.deal(user2, 20 ether);

        // Deploy contracts — no token address needed, all native STT
        vault = new LiquidityVault(address(this));
        treasury = new Treasury(address(vault), aiFund, reserveFund, address(this));
        leaderboard = new LeaderboardRegistry(address(this));
        market = new PredictionMarket(address(vault), address(treasury), address(this));
        settlementEngine = new SettlementEngine(address(market), address(leaderboard), address(this));
        subscriptions = new SubscriptionsContract(signalRevenuePool, address(this));

        // Wire contracts together
        vault.setPredictionMarket(address(market));
        market.setSettlementEngine(address(settlementEngine));
        leaderboard.setSettlementEngine(address(settlementEngine));

        // Seed vault with 10 STT so it can match user stakes immediately
        vault.deposit{value: 10 ether}();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 1: Full lifecycle — open, join, lock, settle, claim
    // ─────────────────────────────────────────────────────────────────────────

    function testOpenJoinSettleAndClaimLifecycle() external {
        OracleData memory strikeData = OracleData({
            price: uint128(100_000e8),   // $100,000 in 8-decimal format
            timestamp: uint128(block.timestamp)
        });

        // user1 opens UP with 1 STT
        vm.prank(user1);
        uint256 marketId = market.openMarket{value: ONE_STT}(Direction.UP, 60, strikeData);

        // user2 joins DOWN with 1 STT
        vm.prank(user2);
        market.joinMarket{value: ONE_STT}(marketId, Direction.DOWN);

        // Owner sets POM to 20%
        market.setPomProfitBps(marketId, 2_000);

        Market memory openedMarket = market.getMarket(marketId);

        // Warp past joining window and lock
        vm.warp(openedMarket.joiningWindowEnd);
        market.lockMarket(marketId);

        // Warp to expiry and settle with a higher price → UP wins
        vm.warp(openedMarket.expiryAt);
        settlementEngine.settle(
            marketId,
            OracleData({price: uint128(101_000e8), timestamp: uint128(block.timestamp)})
        );

        // Verify settled state
        Market memory settledMarket = market.getMarket(marketId);
        assertEq(uint256(settledMarket.state), uint256(MarketState.CLAIMABLE));
        assertEq(uint256(settledMarket.outcome), uint256(Outcome.UP));

        // Protocol fee: totalPool (4 STT) × 2% = 0.08 STT
        assertEq(address(treasury).balance, 80_000_000_000_000_000);

        // user1 (winner) claims: principal 1 STT + 20% profit = 1.2 STT
        uint256 user1Before = address(user1).balance;
        vm.prank(user1);
        market.claimPayout(marketId);
        assertEq(address(user1).balance, user1Before + 1.2 ether);

        // user2 (loser) claimPayout is a no-op — no payout, no revert
        uint256 user2Before = address(user2).balance;
        vm.prank(user2);
        market.claimPayout(marketId);
        assertEq(address(user2).balance, user2Before);

        // Market closes after all claims
        Market memory closedMarket = market.getMarket(marketId);
        assertEq(uint256(closedMarket.state), uint256(MarketState.CLOSED));

        // Leaderboard: user1 won 0.2 STT profit; user2 lost 1 STT
        (uint256 tm1, uint256 w1, uint256 l1, uint256 d1, int256 pnl1) = leaderboard.records(user1);
        assertEq(tm1, 1);
        assertEq(w1, 1);
        assertEq(l1, 0);
        assertEq(d1, 0);
        assertEq(pnl1, int256(0.2 ether));

        (uint256 tm2, uint256 w2, uint256 l2, uint256 d2, int256 pnl2) = leaderboard.records(user2);
        assertEq(tm2, 1);
        assertEq(w2, 0);
        assertEq(l2, 1);
        assertEq(d2, 0);
        assertEq(pnl2, -int256(ONE_STT));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 2: Draw — refunds user stake, returns vault liquidity
    // ─────────────────────────────────────────────────────────────────────────

    function testDrawRefundsStakeAndReturnsVaultLiquidity() external {
        OracleData memory strikeData = OracleData({
            price: uint128(99_500e8),
            timestamp: uint128(block.timestamp)
        });

        // user1 opens UP with 2 STT — no second participant
        vm.prank(user1);
        uint256 marketId = market.openMarket{value: 2 * ONE_STT}(Direction.UP, 30, strikeData);

        // Capture vault balance after vault already matched user1's stake
        uint256 vaultBalanceBefore = address(vault).balance;

        Market memory openedMarket = market.getMarket(marketId);

        // Lock and settle with identical price → DRAW
        vm.warp(openedMarket.joiningWindowEnd);
        market.lockMarket(marketId);

        vm.warp(openedMarket.expiryAt);
        settlementEngine.settle(
            marketId,
            OracleData({price: strikeData.price, timestamp: uint128(block.timestamp)})
        );

        Market memory settledMarket = market.getMarket(marketId);
        assertEq(uint256(settledMarket.outcome), uint256(Outcome.DRAW));

        // Draw: no protocol fee
        assertEq(address(treasury).balance, 0);

        // Vault gets back its committed liquidity (2 STT)
        assertEq(address(vault).balance, vaultBalanceBefore + 2 ether);

        // user1 reclaims original stake in full
        uint256 user1Before = address(user1).balance;
        vm.prank(user1);
        market.claimPayout(marketId);
        assertEq(address(user1).balance, user1Before + 2 ether);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 3: Subscriptions and treasury fee distribution
    // ─────────────────────────────────────────────────────────────────────────

    function testSubscriptionsAndTreasuryDistribution() external {
        // user1 subscribes PRO (10 STT) — single payable transaction, no approval.
        // Read PRO_FEE before vm.prank so the static call doesn't consume the prank.
        uint256 proFee = subscriptions.PRO_FEE();
        vm.prank(user1);
        subscriptions.subscribe{value: proFee}(Tier.PRO);

        assertEq(address(signalRevenuePool).balance, proFee);
        assertTrue(subscriptions.isActive(user1, Tier.PRO));

        // Simulate treasury receiving 100 STT in protocol fees
        vm.deal(address(treasury), 100 ether);
        treasury.distribute();

        // 40% to vault (10 STT seed + 40 STT distribute = 50 STT)
        assertEq(address(vault).balance, 10 ether + 40 ether);
        // 35% to AI fund
        assertEq(address(aiFund).balance, 35 ether);
        // 25% to reserve
        assertEq(address(reserveFund).balance, 25 ether);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 4: Cannot join after joining window closes
    // ─────────────────────────────────────────────────────────────────────────

    function testCannotJoinAfterJoiningWindowClosed() external {
        OracleData memory strikeData = OracleData({
            price: uint128(50_000e8),
            timestamp: uint128(block.timestamp)
        });

        vm.prank(user1);
        uint256 marketId = market.openMarket{value: ONE_STT}(Direction.UP, 30, strikeData);

        Market memory openedMarket = market.getMarket(marketId);
        vm.warp(openedMarket.joiningWindowEnd + 1);

        vm.expectRevert(PredictionMarket.JoiningWindowClosed.selector);
        vm.prank(user2);
        market.joinMarket{value: ONE_STT}(marketId, Direction.DOWN);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 5: Cannot settle before expiry
    // ─────────────────────────────────────────────────────────────────────────

    function testCannotSettleBeforeExpiry() external {
        OracleData memory strikeData = OracleData({
            price: uint128(50_000e8),
            timestamp: uint128(block.timestamp)
        });

        vm.prank(user1);
        uint256 marketId = market.openMarket{value: ONE_STT}(Direction.UP, 30, strikeData);

        Market memory openedMarket = market.getMarket(marketId);
        vm.warp(openedMarket.joiningWindowEnd);
        market.lockMarket(marketId);

        // Still before expiryAt — should revert
        vm.expectRevert(SettlementEngine.MarketNotExpired.selector);
        settlementEngine.settle(
            marketId,
            OracleData({price: uint128(51_000e8), timestamp: uint128(block.timestamp)})
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 6: Cannot claim twice
    // ─────────────────────────────────────────────────────────────────────────

    function testCannotClaimTwice() external {
        OracleData memory strikeData = OracleData({
            price: uint128(50_000e8),
            timestamp: uint128(block.timestamp)
        });

        vm.prank(user1);
        uint256 marketId = market.openMarket{value: ONE_STT}(Direction.UP, 30, strikeData);

        vm.prank(user2);
        market.joinMarket{value: ONE_STT}(marketId, Direction.DOWN);

        Market memory openedMarket = market.getMarket(marketId);
        vm.warp(openedMarket.joiningWindowEnd);
        market.lockMarket(marketId);

        vm.warp(openedMarket.expiryAt);
        settlementEngine.settle(
            marketId,
            OracleData({price: uint128(49_000e8), timestamp: uint128(block.timestamp)})
        );

        // user2 (DOWN) wins — claim once
        vm.prank(user2);
        market.claimPayout(marketId);

        // Second claim should revert
        vm.expectRevert(PredictionMarket.AlreadyClaimed.selector);
        vm.prank(user2);
        market.claimPayout(marketId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 7: Zero-value open reverts
    // ─────────────────────────────────────────────────────────────────────────

    function testZeroStakeReverts() external {
        OracleData memory strikeData = OracleData({
            price: uint128(50_000e8),
            timestamp: uint128(block.timestamp)
        });

        vm.expectRevert(PredictionMarket.InvalidStake.selector);
        vm.prank(user1);
        market.openMarket{value: 0}(Direction.UP, 30, strikeData);
    }
}
