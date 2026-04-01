import { defineConfig } from "apibara/config";

export default defineConfig({
  runtimeConfig: {
    bitdrum: {
      // Apibara's hosted Starknet Sepolia stream
      streamUrl: "https://sepolia.starknet.a5a.ch",
      // Start from a recent block to avoid replaying the entire chain.
      // Update this to the block right before your first contract deployment.
      startingBlock: 7_938_750,
      // The deployed PredictionMarket contract address
      predictionMarketAddress:
        "0x27ca3cdaeba08f02dd9698a1056f50d1e928e61435830ef9bc401b17a5de63a",
    },
  },
});
