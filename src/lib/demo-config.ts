import { defineChain } from "viem";

/** Whitechain Testnet — the chain the Chainwall tenant lives on. */
export const whitechainTestnet = defineChain({
  id: 1874,
  name: "Whitechain Testnet",
  nativeCurrency: { name: "WhiteBIT Coin", symbol: "WBT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.ankr.com/whitechain_testnet"] } },
  blockExplorers: {
    default: { name: "Whitechain Explorer", url: "https://explorer.testnet.whitechain.io" },
  },
  testnet: true,
});

/** Live tenant on Whitechain Testnet 1874 (see docs/contracts/whitechain-deployment.md). */
export const DEMO = {
  registry: "0x7c04a72db4f422fab4d1c94067b6a8cdac6bbb74",
  interact: "0xE389bE2d72c618290E1AdFF7B8BbEE39eC356e45",
  vault: "0x371B4E49A510Ee007d7879783B309128975CC1A1",
  token: "0x1d9F8351F788278D3E181908cEE14c7F5766157F", // demo/usdc, 6 dp
  policyId: "0xc98ecb15490603d72371a92cba6d9550ab1b8ca0e88b45df76cd1039f9249ff7",
  interactionId: "0xa9887591f70becfea94da39c8d8fa4b55c2b5f0c7d4df229d6e9ea8221f3c926",
  capUSDC: 1_000_000,
  explorer: "https://explorer.testnet.whitechain.io",
  /** The two treasury-group members that must each approve (2-of-2). */
  approvers: [
    { label: "Owner", address: "0x3ae7F2767111D8700F82122A373792B99d605749" as `0x${string}` },
    { label: "Approver 2", address: "0xcBAee4793486f3Df37dbb584F5a3610ff581A614" as `0x${string}` },
  ],
} as const;

/** Minimal Interact ABI: one approval write + two read views. */
export const INTERACT_ABI = [
  {
    type: "function",
    name: "approveOperation",
    stateMutability: "nonpayable",
    inputs: [{ name: "operationId", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "isOperationApproved",
    stateMutability: "view",
    inputs: [{ name: "operationId", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "canUserApproveOperation",
    stateMutability: "view",
    inputs: [
      { name: "operationId", type: "uint256" },
      { name: "user", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

/** ERC-20 balanceOf for the vault/recipient readouts. */
export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "a", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export const fmtUSDC = (raw: bigint) =>
  (Number(raw) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 });
