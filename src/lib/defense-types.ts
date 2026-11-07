export type DefenseStep =
  | "setup"
  | "vault-start" | "vault-deployed" | "configure" | "vault-ready" | "fund"
  | "payout-propose" | "payout-approve" | "payout-exec" | "payout-done"
  | "delegate" | "delegate-deploy" | "delegate-done"
  | "detect"
  | "attack" | "refuse"
  | "done" | "closed" | "warn" | "error" | "fatal" | "stderr" | "log";

export interface DefenseEvent {
  t?: number;
  step: DefenseStep;
  msg?: string;
  // setup
  chain?: number; block?: number; factory?: string;
  owner?: string; alice?: string; bob?: string; carol?: string; attacker?: string; recipient?: string;
  // tenant
  registry?: string; interact?: string; vault?: string;
  // balances (human strings, USDC)
  vaultUSDC?: string; recipientUSDC?: string; attackerUSDC?: string; vaultRaw?: number;
  // delegation / detection
  delegate?: string; code?: string; delegated?: boolean;
  // attack / refuse
  amount?: string; attempted?: string; reason?: string; selector?: string;
  txHash?: string;
}

export type DefenseEmit = (e: DefenseEvent) => void;
