import { StarkZap } from "starkzap";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
export const GATEWAY_URL =
  process.env.NEXT_PUBLIC_STARKZAP_URL || "http://localhost:3001/api/starkzap";
export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || API_BASE.replace(/^http/, "ws").replace(/\/api$/, "/ws");

const paymasterNodeUrl = process.env.NEXT_PUBLIC_AVNU_PAYMASTER_URL;

export const sdk = new StarkZap({
  network: "sepolia",
  paymaster: paymasterNodeUrl ? { nodeUrl: paymasterNodeUrl } : undefined,
});

export const hasSponsoredExecution = Boolean(paymasterNodeUrl);
