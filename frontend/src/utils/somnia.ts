export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || API_BASE.replace(/^http/, "ws").replace(/\/api$/, "/ws");

export const SOMNIA_MAINNET = {
  chainId: 5031,
  chainIdHex: "0x13a7",
  chainName: "Somnia",
  nativeCurrency: { name: "SOMI", symbol: "SOMI", decimals: 18 },
  rpcUrls: ["https://api.infra.mainnet.somnia.network"],
  blockExplorerUrls: ["https://explorer.somnia.network"],
};

export const SOMNIA_SHANNON = {
  chainId: 50312,
  chainIdHex: "0xc488",
  chainName: "Somnia Shannon",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: ["https://dream-rpc.somnia.network"],
  blockExplorerUrls: ["https://shannon-explorer.somnia.network"],
};

export const ACTIVE_SOMNIA_NETWORK =
  process.env.NEXT_PUBLIC_CHAIN_ID === String(SOMNIA_MAINNET.chainId)
    ? SOMNIA_MAINNET
    : SOMNIA_SHANNON;

export const PREDICTION_MARKET_ADDRESS =
  process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDR || "0x0000000000000000000000000000000000000000";

export const WBTC_ADDRESS =
  process.env.NEXT_PUBLIC_WBTC_ADDR || "0x0000000000000000000000000000000000000000";

export const SOMNIA_EXPLORER_BASE_URL =
  ACTIVE_SOMNIA_NETWORK.blockExplorerUrls[0] || "https://shannon-explorer.somnia.network";
