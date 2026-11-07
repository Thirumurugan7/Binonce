// Per-network contract + RPC selection for the attack and defense flows.
// The signer keys (operator, relayer, victim) are shared across networks and come from env;
// only the addresses, RPC and explorer differ per chain. Default is Whitechain (1874), so any
// request without an explicit chain behaves exactly as before, Whitechain is never disturbed.

export interface ChainConfig {
  id: number;
  name: string;
  rpc: string;
  explorer: string; // base, no trailing /tx
  // Chainwall defense tenant
  registry: `0x${string}`;
  interact: `0x${string}`;
  vault: `0x${string}`; // OKAccount vault
  token: `0x${string}`; // TestUSDC (6dp)
  operatorPolicy: `0x${string}`; // operator-1of (1-of)
  transferInteraction: `0x${string}`; // tier-transfer
  recipient: `0x${string}`; // where legit defense payouts go
  // 7702 attack side
  sweeper: `0x${string}`;
  attacker: `0x${string}`; // the sweeper's hardcoded recipient
  // Phase 2 (Sepolia only): guarded-Safe route
  safeFactory?: `0x${string}`;
  safe?: SafeRouteConfig; // present -> /defense on this chain uses the Safe multisig + 7702 route
  usdcDecimals: number;
}

/**
 * Sepolia-only: the guarded-Safe defense route (a 2-of-N Safe whose actor is 7702-checked by the
 * Chainwall Interact). Driven server-side through the `chainwall` CLI + `cast` (the proven spike path),
 * so it carries CLI/keystore coordinates rather than raw keys. Whitechain has no `safe` and keeps the
 * pure-viem OKAccount flow untouched.
 */
export interface SafeRouteConfig {
  address: `0x${string}`; // the Safe (acts as the guarded vault)
  interactionId: `0x${string}`; // safe-bound transfer interaction ($subjectVault == safe)
  policyId: `0x${string}`; // chainwall operation approval policy (operator-1of)
  recipientArg: string; // transfer recipient as a uint (address encoded as number), for the op args
  amount: string; // transfer amount in base units (6dp USDC)
  actor: `0x${string}`; // the execution actor that gets 7702-hijacked
  // CLI/keystore coordinates (Foundry keystore account names, unlocked by the shared password file)
  profile: string; // chainwall --profile
  actorAccount: string; // keystore account that is the actor (sign-actor + 7702 toggle)
  ownerAccounts: [string, string]; // two Safe owners for the 2-of signature set (ascending by address)
  proposerAccount: string; // account that proposes the operation
  relayerAccount: string; // account that broadcasts the execute
  // Wallet-signed 2-signer variant (SafeSigner UI): the two DISTINCT signing wallets are the actor
  // (who is also a Safe owner) + one co-signer owner. The actor signs twice (ExecutionActor + its
  // owner SafeTx); the co-signer signs once (owner SafeTx). Proven: owners [co-signer, actor].
  coSignerAccount: string; // keystore account of the co-signing owner (also proposer/relayer source)
  coSignerAddress: `0x${string}`; // its address, for the UI to match the connected wallet
}

export const WHITECHAIN_ID = 1874;
export const SEPOLIA_ID = 11155111;
export const DEFAULT_CHAIN_ID = WHITECHAIN_ID;

export const CHAINS: Record<number, ChainConfig> = {
  // ─── Whitechain testnet (unchanged, the live, verified tenant) ───
  [WHITECHAIN_ID]: {
    id: WHITECHAIN_ID,
    name: "Whitechain Testnet",
    rpc: "https://rpc.ankr.com/whitechain_testnet",
    explorer: "https://explorer.testnet.whitechain.io",
    registry: "0x7c04a72db4f422fab4d1c94067b6a8cdac6bbb74",
    interact: "0xE389bE2d72c618290E1AdFF7B8BbEE39eC356e45",
    vault: "0x371B4E49A510Ee007d7879783B309128975CC1A1",
    token: "0x1d9F8351F788278D3E181908cEE14c7F5766157F",
    operatorPolicy: "0x16c6cdf01674895064373cb0d719b21d67853b8f64a24a73d7c419b6e0817772",
    transferInteraction: "0xc918a5f1cb2670f14afa8bb1928f6a298e37fe1eb914df1b4ec7da9e9f38222a",
    recipient: "0xcBAee4793486f3Df37dbb584F5a3610ff581A614",
    sweeper: "0xb17f589b3dd10a05d4ef4ed1bdbe4cee8ec2da25",
    attacker: "0x759da0d4430938d68f3262c9a0b1abe6c1274101",
    usdcDecimals: 6,
  },
  // ─── Sepolia testnet (mirror tenant; also has a SafeFactory for Phase 2) ───
  [SEPOLIA_ID]: {
    id: SEPOLIA_ID,
    name: "Sepolia Testnet",
    rpc: process.env.DEFENSE_SEPOLIA_RPC || "https://sepolia.gateway.tenderly.co",
    explorer: "https://sepolia.etherscan.io",
    registry: "0xb42df5308d6cb6a6351973fcfa06b691c8bc9a05",
    interact: "0x807630c5ad0e8029eb9CFAF9357093221864b218",
    vault: "0x66340dE9fbB1795Ed1C425fdf5d464bd35B2a4FB",
    token: "0x52425F27aD08BcA15008F5CD81Cb244821401164",
    operatorPolicy: "0x16c6cdf01674895064373cb0d719b21d67853b8f64a24a73d7c419b6e0817772",
    transferInteraction: "0xc918a5f1cb2670f14afa8bb1928f6a298e37fe1eb914df1b4ec7da9e9f38222a",
    recipient: "0xcBAee4793486f3Df37dbb584F5a3610ff581A614",
    sweeper: "0x4d018751A9BB3786788132E9fB25d99B007A0e41",
    attacker: "0x759da0d4430938d68f3262c9a0b1abe6c1274101",
    safeFactory: "0x2C6D2BC01f02aa4b59cF202539e2C19F9f897D57",
    safe: {
      address: "0x01A7c4101F0665e7B86e4dDB5b9EFb8Dd21B2e1a",
      interactionId: "0x954bd171dd7ddebe33f76700c135a325f9ae50d21564d3ab3e6c0a04983cc44f",
      policyId: "0x16c6cdf01674895064373cb0d719b21d67853b8f64a24a73d7c419b6e0817772",
      recipientArg: "1162825358986963160486305439315599595907043141140", // 0xcBAee479…581A614
      amount: "100000000", // 100 USDC (6dp)
      actor: "0x8C46D5777355A25B519dFad3aa857b6DBCd429c0",
      profile: process.env.CHAINWALL_PROFILE || "sepolia",
      actorAccount: process.env.SAFE_ACTOR_ACCOUNT || "wc-approver3",
      ownerAccounts: [
        process.env.SAFE_OWNER1_ACCOUNT || "wc-owner",
        process.env.SAFE_OWNER2_ACCOUNT || "wc-approver2",
      ],
      proposerAccount: process.env.SAFE_PROPOSER_ACCOUNT || "wc-owner",
      relayerAccount: process.env.SAFE_RELAYER_ACCOUNT || "wc-relayer",
      coSignerAccount: process.env.SAFE_COSIGNER_ACCOUNT || "wc-owner",
      coSignerAddress: "0x3ae7F2767111D8700F82122A373792B99d605749",
    },
    usdcDecimals: 6,
  },
};

/** Resolve a chain config; unknown/omitted chain falls back to Whitechain (preserves old behavior). */
export function chainConfig(chainId?: number | string | null): ChainConfig {
  const id = Number(chainId);
  return CHAINS[id] ?? CHAINS[DEFAULT_CHAIN_ID];
}

/** The chain ids this app supports, for Privy/wagmi supportedChains. */
export const SUPPORTED_CHAIN_IDS = [WHITECHAIN_ID, SEPOLIA_ID];
