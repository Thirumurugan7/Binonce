import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const HOME = process.env.HOME || "";
const BIN = process.env.CHAINWALL_BIN || join(HOME, ".local/bin/chainwall");
const PROFILE = process.env.CHAINWALL_PROFILE || "whitechain";
export const PW = process.env.CHAINWALL_PASSWORD_FILE || join(HOME, ".config/chainwall-wc.pw");
export const OP_DIR = "/tmp/cw-demo";

/** Run one chainwall command, with Foundry's cast on PATH. */
export function cw(args: string[]) {
  const r = spawnSync(BIN, ["--profile", PROFILE, ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: {
      ...process.env,
      PATH: `${join(HOME, ".foundry/bin")}:${join(HOME, ".local/bin")}:${process.env.PATH || ""}`,
    },
  });
  return { ok: r.status === 0, stdout: r.stdout || "", stderr: r.stderr || "" };
}

export const acc = (account: string) => ["--account", account, "--password-file", PW];

export function opFile(operationId: string | number) {
  mkdirSync(OP_DIR, { recursive: true });
  return join(OP_DIR, `op-${operationId}.json`);
}

export function writeJson(path: string, obj: unknown) {
  mkdirSync(OP_DIR, { recursive: true });
  writeFileSync(path, JSON.stringify(obj));
  return path;
}

/** Decode a chainwall failure string into a short reason (ERR_01, ActorDelegated, …). */
export function decodeReason(s: string): string {
  const err = s.match(/ERR_\d+/)?.[0];
  if (err) return err;
  const custom = s.match(/\b([A-Z][a-zA-Z]+)\(\)/)?.[1];
  if (custom) return custom;
  if (/insufficient funds/i.test(s)) return "InsufficientGas";
  return "reverted";
}
