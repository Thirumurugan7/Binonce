export const ERC20_ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
] as const;

export const SWEEPER_ABI = [
  { type: "function", name: "sweepToken", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }], outputs: [] },
] as const;
