import { JsonRpcProvider, Wallet } from 'ethers';

const SOMNIA_RPC_URL     = process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';
const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY || '';

let provider: JsonRpcProvider | null = null;
let signer: Wallet | null = null;

export function getProvider() {
  if (!provider) {
    provider = new JsonRpcProvider(SOMNIA_RPC_URL);
  }
  return provider;
}

export function getSigner() {
  if (!signer) {
    const p = getProvider();
    if (!KEEPER_PRIVATE_KEY) {
      throw new Error('[Client] KEEPER_PRIVATE_KEY is missing');
    }
    signer = new Wallet(KEEPER_PRIVATE_KEY, p);
  }
  return signer;
}
