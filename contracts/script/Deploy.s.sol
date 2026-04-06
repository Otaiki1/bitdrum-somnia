// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {LeaderboardRegistry} from "../src/LeaderboardRegistry.sol";
import {LiquidityVault} from "../src/LiquidityVault.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";
import {SettlementEngine} from "../src/SettlementEngine.sol";
import {SubscriptionsContract} from "../src/SubscriptionsContract.sol";
import {Treasury} from "../src/Treasury.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        MockERC20 wbtc = new MockERC20("Wrapped Bitcoin", "WBTC", 8);
        LiquidityVault vault = new LiquidityVault(address(wbtc), deployer);
        Treasury treasury = new Treasury(address(wbtc), address(vault), deployer, deployer, deployer);
        LeaderboardRegistry leaderboard = new LeaderboardRegistry(deployer);
        PredictionMarket market = new PredictionMarket(address(wbtc), address(vault), address(treasury), deployer);
        SettlementEngine settlementEngine = new SettlementEngine(address(market), address(leaderboard), deployer);
        SubscriptionsContract subscriptions = new SubscriptionsContract(address(wbtc), deployer, deployer);

        vault.setPredictionMarket(address(market));
        market.setSettlementEngine(address(settlementEngine));
        leaderboard.setSettlementEngine(address(settlementEngine));

        vm.stopBroadcast();
    }
}
