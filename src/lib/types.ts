export type Step =
  | "setup" | "before" | "sign" | "sign-progress" | "sign-done"
  | "delegate" | "delegate-sent" | "delegate-mined"
  | "verify" | "sweep" | "sweep-sent" | "sweep-mined"
  | "after" | "arkiv" | "done" | "empty" | "closed" | "warn" | "error" | "fatal" | "stderr" | "log";

export interface AttackEvent {
  t?: number;
  step: Step;
  msg?: string;
  // setup
  victim?: string; relayer?: string; attacker?: string; sweeper?: string; tusd?: string;
  // balances
  victimTUSD?: string; attackerTUSD?: string; drained?: string;
  // signing
  victimNonce?: number; numAuths?: number; index?: number; nonce?: number; matchingNonce?: number;
  // tx
  txHash?: string; block?: number; status?: string;
  // verify
  delegated?: boolean; code?: string;
  // arkiv
  arkivKey?: string;
}

export type Emit = (e: AttackEvent) => void;
