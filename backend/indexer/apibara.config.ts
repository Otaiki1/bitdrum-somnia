import { defineConfig } from "apibara/config";

export default defineConfig({
  runtimeConfig: {
    bitdrum: {
      // Apibara's hosted Starknet Sepolia stream
      streamUrl: "https://sepolia.starknet.a5a.ch",
      // Start from a recent block to avoid replaying the entire chain.
      // Update this to the block right before your first contract deployment.
      startingBlock: 7_910_000,
      // The deployed PredictionMarket contract address
      predictionMarketAddress:
        "0x00e34d84cf5b661f0206d369d9d919b13a13b08ff0eb54e1e3056dd592db4303",
    },
  },
});
