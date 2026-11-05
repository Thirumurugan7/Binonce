import { createPublicClient, createWalletClient, http, defineChain, type Chain, type Account } from "viem";
import { sepolia } from "viem/chains";

/**
 * Chain config from env. Defaults to a local anvil (Prague) chain so the real
 * attack runs offline, instantly, and for free. Point at Sepolia by setting
 * CHAIN_ID=11155111 and CHAIN_RPC to a type-4-capable RPC.
 */
export function getChain(): Chain {
  const id = Number(process.env.CHAIN_ID || 31337);
  const rpc = process.env.CHAIN_RPC || "http://localhost:8545";
  if (id === 11155111) return sepolia;
  return defineChain({
    id,
    name: id === 31337 ? "anvil" : `chain-${id}`,
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpc] } },
  });
}

export function rpcUrl() {
  return process.env.CHAIN_RPC || "http://localhost:8545";
}

export function publicClient() {
  return createPublicClient({ chain: getChain(), transport: http(rpcUrl()) });
}

export function walletClient(account: Account) {
  return createWalletClient({ account, chain: getChain(), transport: http(rpcUrl()) });
}

export const chainLabel = () => (Number(process.env.CHAIN_ID || 31337) === 11155111 ? "Sepolia" : "Local anvil");
