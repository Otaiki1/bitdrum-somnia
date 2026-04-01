import { Account, RpcProvider, json, CallData } from "starknet";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

// =============================================================================
// Settings & Config
// =============================================================================

const NETWORK = process.argv[2] === "mainnet" ? "mainnet" : "sepolia";
const ARTIFACTS_PATH = path.join(__dirname, "../target/dev");
const OUTPUT_FILE = path.join(__dirname, `deployment_${NETWORK}.json`);

const RPC_URL = NETWORK === "mainnet" 
    ? (process.env.MAINNET_RPC_URL || "https://starknet-mainnet.public.blastapi.io") 
    : (process.env.SEPOLIA_RPC_URL || "https://starknet-sepolia.public.blastapi.io");

const ACCOUNT_ADDRESS = process.env.DEPLOYER_ADDR || "";
const PRIVATE_KEY = process.env.DEPLOYER_PRIV || "";

// =============================================================================
// Helper: contract loading
// =============================================================================

function loadArtifact(name: string) {
    const sierraPath = path.join(ARTIFACTS_PATH, `bitdrum_starknet_${name}.contract_class.json`);
    const casmPath = path.join(ARTIFACTS_PATH, `bitdrum_starknet_${name}.compiled_contract_class.json`);
    
    // Note: Scarb 2.8+ puts casm at .compiled_contract_class.json
    // If not found, check the Scarb.toml target configuration
    
    const sierra = json.parse(fs.readFileSync(sierraPath).toString("ascii"));
    const casm = json.parse(fs.readFileSync(casmPath).toString("ascii"));
    
    return { sierra, casm };
}

// =============================================================================
// Core deployment logic
// =============================================================================

async function main() {
    if (!ACCOUNT_ADDRESS || !PRIVATE_KEY) {
        throw new Error("Missing DEPLOYER_ADDR or DEPLOYER_PRIV in .env");
    }

    const provider = new RpcProvider({ 
        nodeUrl: RPC_URL,
        specVersion: "0.9.0",
        blockIdentifier: "latest"
    });
    const deployer = new Account({ 
        provider, 
        address: ACCOUNT_ADDRESS, 
        signer: PRIVATE_KEY 
    });

    console.log(`🚀 Deployment started on ${NETWORK}...`);
    console.log(`Deployer: ${ACCOUNT_ADDRESS}`);

    const addresses: Record<string, string> = {};

    // 1. Use Native STRK Token Address (Sepolia)
    // For local/test isolation you could deploy a mock, but user requested native STRK.
    addresses["MockERC20"] = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
    console.log(`✅ Using STRK: ${addresses["MockERC20"]}`);

    // 2. Deploy Vault
    console.log("⏳ Deploying Vault...");
    const { sierra: vaultS, casm: vaultC } = loadArtifact("Vault");
    const vaultDeploy = await deployer.declareAndDeploy({
        contract: vaultS,
        casm: vaultC,
        constructorCalldata: [deployer.address, addresses["MockERC20"]] 
    });
    await provider.waitForTransaction(vaultDeploy.deploy.transaction_hash);
    addresses["Vault"] = vaultDeploy.deploy.contract_address;

    // 3. Deploy Treasury
    console.log("⏳ Deploying Treasury...");
    const { sierra: treasuryS, casm: treasuryC } = loadArtifact("Treasury");
    const treasuryDeploy = await deployer.declareAndDeploy({
        contract: treasuryS,
        casm: treasuryC,
        constructorCalldata: [deployer.address, addresses["MockERC20"]]
    });
    await provider.waitForTransaction(treasuryDeploy.deploy.transaction_hash);
    addresses["Treasury"] = treasuryDeploy.deploy.contract_address;

    // 4. Deploy PredictionMarket
    console.log("⏳ Deploying PredictionMarket...");
    const { sierra: pmS, casm: pmC } = loadArtifact("PredictionMarket");
    const pmDeploy = await deployer.declareAndDeploy({
        contract: pmS,
        casm: pmC,
        constructorCalldata: [
            deployer.address, 
            addresses["MockERC20"], 
            addresses["Vault"], 
            addresses["Treasury"]
        ]
    });
    await provider.waitForTransaction(pmDeploy.deploy.transaction_hash);
    addresses["PredictionMarket"] = pmDeploy.deploy.contract_address;

    // 5. Deploy SettlementEngine
    console.log("⏳ Deploying SettlementEngine...");
    const { sierra: seS, casm: seC } = loadArtifact("SettlementEngine");
    const pragmaAddress = NETWORK === "mainnet" 
        ? "0x2a85bd616f912537c50a49a4076db02c00b29b2cdc8a197ce92ed1837fa875b"
        : "0x36059430161341ad35104f77659cf74f7992c9089b367fc9ee273391340b8a1"; // Mock or Sepolia address

    const seDeploy = await deployer.declareAndDeploy({
        contract: seS,
        casm: seC,
        constructorCalldata: [deployer.address, pragmaAddress]
    });
    await provider.waitForTransaction(seDeploy.deploy.transaction_hash);
    addresses["SettlementEngine"] = seDeploy.deploy.contract_address;

    // 6. Deploy LeaderboardRegistry
    console.log("⏳ Deploying LeaderboardRegistry...");
    const { sierra: lrS, casm: lrC } = loadArtifact("LeaderboardRegistry");
    const lrDeploy = await deployer.declareAndDeploy({
        contract: lrS,
        casm: lrC,
        constructorCalldata: [deployer.address]
    });
    await provider.waitForTransaction(lrDeploy.deploy.transaction_hash);
    addresses["LeaderboardRegistry"] = lrDeploy.deploy.contract_address;

    // 7. Deploy SignalSubscription
    console.log("⏳ Deploying SignalSubscription...");
    const { sierra: ssS, casm: ssC } = loadArtifact("SignalSubscription");
    const ssDeploy = await deployer.declareAndDeploy({
        contract: ssS,
        casm: ssC,
        constructorCalldata: [
            deployer.address,
            addresses["MockERC20"],
            addresses["Treasury"],
            50000000n.toString(), // $50 (assuming 6 decimals)
            200000000n.toString() // $200
        ]
    });
    await provider.waitForTransaction(ssDeploy.deploy.transaction_hash);
    addresses["SignalSubscription"] = ssDeploy.deploy.contract_address;

    // =========================================================================
    // Multi-contract WIRING
    // =========================================================================
    console.log("🔄 Wiring up dependencies...");

    const multicall = [
        // PM -> SETTLEMENT_ENGINE
        {
            contractAddress: addresses["PredictionMarket"],
            entrypoint: "set_settlement_engine",
            calldata: [addresses["SettlementEngine"]]
        },
        // VAULT -> SETTLEMENT_ENGINE
        {
            contractAddress: addresses["Vault"],
            entrypoint: "set_settlement_engine",
            calldata: [addresses["SettlementEngine"]]
        },
        // TREASURY -> SETTLEMENT_ENGINE
        {
            contractAddress: addresses["Treasury"],
            entrypoint: "set_settlement_engine",
            calldata: [addresses["SettlementEngine"]]
        },
        // ENGINE -> CONFIG
        {
            contractAddress: addresses["SettlementEngine"],
            entrypoint: "set_prediction_market",
            calldata: [addresses["PredictionMarket"]]
        },
        {
            contractAddress: addresses["SettlementEngine"],
            entrypoint: "set_vault",
            calldata: [addresses["Vault"]]
        },
        {
            contractAddress: addresses["SettlementEngine"],
            entrypoint: "set_treasury",
            calldata: [addresses["Treasury"]]
        },
        {
            contractAddress: addresses["SettlementEngine"],
            entrypoint: "set_leaderboard",
            calldata: [addresses["LeaderboardRegistry"]]
        },
        // LEADERBOARD -> ENGINE
        {
            contractAddress: addresses["LeaderboardRegistry"],
            entrypoint: "set_settlement_engine",
            calldata: [addresses["SettlementEngine"]]
        }
    ];

    const tx = await deployer.execute(multicall);
    await provider.waitForTransaction(tx.transaction_hash);
    console.log("✅ All contracts wired up!");

    // =========================================================================
    // Finalize
    // =========================================================================

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(addresses, null, 4));
    console.log(`\n🎉 Deployment Complete! Manifest: deployment_${NETWORK}.json`);
    console.log("---------------------------------------------------------");
    for (const [name, addr] of Object.entries(addresses)) {
        console.log(`${name.padEnd(20)} : ${addr}`);
    }
}

main().catch(console.error);
