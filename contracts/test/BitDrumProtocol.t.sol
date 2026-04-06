// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {LeaderboardRegistry} from "../src/LeaderboardRegistry.sol";
import {LiquidityVault} from "../src/LiquidityVault.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";
import {SettlementEngine} from "../src/SettlementEngine.sol";
import {SubscriptionsContract} from "../src/SubscriptionsContract.sol";
import {Treasury} from "../src/Treasury.sol";
import {Direction, Market, MarketState, OracleData, Outcome, Tier} from "../src/Types.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract BitDrumProtocolTest is Test {
    uint256 internal constant ONE_WBTC = 1e8;

    address internal user1 = makeAddr("user1");
    address internal user2 = makeAddr("user2");
    address internal aiFund = makeAddr("aiFund");
    address internal reserveFund = makeAddr("reserveFund");
    address internal signalRevenuePool = makeAddr("signalRevenuePool");

    MockERC20 internal wbtc;
    LiquidityVault internal vault;
    Treasury internal treasury;
    LeaderboardRegistry internal leaderboard;
    PredictionMarket internal market;
    SettlementEngine internal settlementEngine;
    SubscriptionsContract internal subscriptions;

    function setUp() external {
        wbtc = new MockERC20("Wrapped Bitcoin", "WBTC", 8);
        vault = new LiquidityVault(address(wbtc), address(this));
        treasury = new Treasury(address(wbtc), address(vault), aiFund, reserveFund, address(this));
        leaderboard = new LeaderboardRegistry(address(this));
        market = new PredictionMarket(address(wbtc), address(vault), address(treasury), address(this));
        settlementEngine = new SettlementEngine(address(market), address(leaderboard), address(this));
        subscriptions = new SubscriptionsContract(address(wbtc), signalRevenuePool, address(this));

        vault.setPredictionMarket(address(market));
        market.setSettlementEngine(address(settlementEngine));
        leaderboard.setSettlementEngine(address(settlementEngine));

        wbtc.mint(address(this), 10_000 * ONE_WBTC);
        wbtc.mint(user1, 10 * ONE_WBTC);
        wbtc.mint(user2, 10 * ONE_WBTC);

        wbtc.approve(address(vault), type(uint256).max);
        vault.deposit(2_000 * ONE_WBTC);

        vm.prank(user1);
        wbtc.approve(address(market), type(uint256).max);
        vm.prank(user1);
        wbtc.approve(address(subscriptions), type(uint256).max);

        vm.prank(user2);
        wbtc.approve(address(market), type(uint256).max);
        vm.prank(user2);
        wbtc.approve(address(subscriptions), type(uint256).max);
    }

    function testOpenJoinSettleAndClaimLifecycle() external {
        OracleData memory strikeData = OracleData({price: uint128(100_000 * ONE_WBTC), timestamp: uint128(block.timestamp)});

        vm.prank(user1);
        uint256 marketId = market.openMarket(Direction.UP, 60, ONE_WBTC, strikeData);

        vm.prank(user2);
        market.joinMarket(marketId, Direction.DOWN, ONE_WBTC);

        market.setPomProfitBps(marketId, 2_000);

        Market memory openedMarket = market.getMarket(marketId);
        vm.warp(openedMarket.joiningWindowEnd);
        market.lockMarket(marketId);

        vm.warp(openedMarket.expiryAt);
        settlementEngine.settle(
            marketId,
            OracleData({price: uint128(101_000 * ONE_WBTC), timestamp: uint128(block.timestamp)})
        );

        Market memory settledMarket = market.getMarket(marketId);
        assertEq(uint256(settledMarket.state), uint256(MarketState.CLAIMABLE));
        assertEq(uint256(settledMarket.outcome), uint256(Outcome.UP));
        assertEq(wbtc.balanceOf(address(treasury)), 8_000_000);

        vm.prank(user1);
        market.claimPayout(marketId);

        vm.prank(user2);
        market.claimPayout(marketId);

        Market memory closedMarket = market.getMarket(marketId);
        assertEq(uint256(closedMarket.state), uint256(MarketState.CLOSED));
        assertEq(wbtc.balanceOf(user1), 10 * ONE_WBTC + 20_000_000);
        assertEq(wbtc.balanceOf(user2), 9 * ONE_WBTC);

        (uint256 totalMarkets1, uint256 wins1, uint256 losses1, uint256 draws1, int256 netPnl1) =
            leaderboard.records(user1);
        assertEq(totalMarkets1, 1);
        assertEq(wins1, 1);
        assertEq(losses1, 0);
        assertEq(draws1, 0);
        assertEq(netPnl1, int256(20_000_000));

        (uint256 totalMarkets2, uint256 wins2, uint256 losses2, uint256 draws2, int256 netPnl2) =
            leaderboard.records(user2);
        assertEq(totalMarkets2, 1);
        assertEq(wins2, 0);
        assertEq(losses2, 1);
        assertEq(draws2, 0);
        assertEq(netPnl2, -int256(ONE_WBTC));
    }

    function testDrawRefundsStakeAndReturnsVaultLiquidity() external {
        OracleData memory strikeData = OracleData({price: uint128(99_500 * ONE_WBTC), timestamp: uint128(block.timestamp)});

        vm.prank(user1);
        uint256 marketId = market.openMarket(Direction.UP, 30, 2 * ONE_WBTC, strikeData);

        uint256 vaultBalanceBefore = wbtc.balanceOf(address(vault));
        Market memory openedMarket = market.getMarket(marketId);

        vm.warp(openedMarket.joiningWindowEnd);
        market.lockMarket(marketId);

        vm.warp(openedMarket.expiryAt);
        settlementEngine.settle(
            marketId,
            OracleData({price: strikeData.price, timestamp: uint128(block.timestamp)})
        );

        Market memory settledMarket = market.getMarket(marketId);
        assertEq(uint256(settledMarket.outcome), uint256(Outcome.DRAW));
        assertEq(wbtc.balanceOf(address(treasury)), 0);
        assertEq(wbtc.balanceOf(address(vault)), vaultBalanceBefore + 2 * ONE_WBTC);

        vm.prank(user1);
        market.claimPayout(marketId);

        assertEq(wbtc.balanceOf(user1), 10 * ONE_WBTC);
    }

    function testSubscriptionsAndTreasuryDistribution() external {
        vm.prank(user1);
        subscriptions.subscribe(Tier.PRO);

        assertEq(wbtc.balanceOf(signalRevenuePool), subscriptions.PRO_FEE_WBTC());
        assertTrue(subscriptions.isActive(user1, Tier.PRO));

        wbtc.mint(address(treasury), 100 * ONE_WBTC);
        treasury.distribute();

        assertEq(wbtc.balanceOf(address(vault)), 2_000 * ONE_WBTC + 40 * ONE_WBTC);
        assertEq(wbtc.balanceOf(aiFund), 35 * ONE_WBTC);
        assertEq(wbtc.balanceOf(reserveFund), 25 * ONE_WBTC);
    }
}
