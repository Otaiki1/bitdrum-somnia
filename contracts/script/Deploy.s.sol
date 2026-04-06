// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {LeaderboardRegistry} from "../src/LeaderboardRegistry.sol";
import {LiquidityVault} from "../src/LiquidityVault.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";
import {SettlementEngine} from "../src/SettlementEngine.sol";
import {SubscriptionsContract} from "../src/SubscriptionsContract.sol";
import {Treasury} from "../src/Treasury.sol";
import {WrappedSTT} from "../src/WrappedSTT.sol";

contract DeployScript is Script {
    /// Vault seed: 100 STT wrapped and deposited so the vault can pay winners
    /// immediately after the first market settles. Adjust as needed.
    uint256 constant VAULT_SEED_STT = 100 ether;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy WSTT — the native STT wrapper used as staking token
        WrappedSTT wstt = new WrappedSTT();

        // 2. Core protocol contracts (pass wstt wherever wbtc was expected)
        LiquidityVault vault = new LiquidityVault(address(wstt), deployer);
        Treasury treasury = new Treasury(address(wstt), address(vault), deployer, deployer, deployer);
        LeaderboardRegistry leaderboard = new LeaderboardRegistry(deployer);
        PredictionMarket market = new PredictionMarket(address(wstt), address(vault), address(treasury), deployer);
        SettlementEngine settlementEngine = new SettlementEngine(address(market), address(leaderboard), deployer);
        SubscriptionsContract subscriptions = new SubscriptionsContract(address(wstt), deployer, deployer);

        // 3. Wire contracts together
        vault.setPredictionMarket(address(market));
        market.setSettlementEngine(address(settlementEngine));
        leaderboard.setSettlementEngine(address(settlementEngine));

        // 4. Seed the vault with wrapped STT so it can pay out winners
        wstt.deposit{value: VAULT_SEED_STT}();
        wstt.approve(address(vault), VAULT_SEED_STT);
        vault.deposit(VAULT_SEED_STT);

        vm.stopBroadcast();

        console.log("=== BitDrum Deployment Addresses ===");
        console.log("WrappedSTT (WSTT):         ", address(wstt));
        console.log("LiquidityVault:            ", address(vault));
        console.log("Treasury:                  ", address(treasury));
        console.log("LeaderboardRegistry:       ", address(leaderboard));
        console.log("PredictionMarket:          ", address(market));
        console.log("SettlementEngine:          ", address(settlementEngine));
        console.log("SubscriptionsContract:     ", address(subscriptions));
        console.log("=====================================");
        console.log("Vault seeded with:          100 WSTT (wrapped from deployer STT)");
    }
}
