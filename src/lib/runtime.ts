import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { privateKeyToAccount } from "viem/accounts";

/** The active run's addresses. Seeded from .env, swapped out by /api/reset. */
export type RunConfig = {
  victimPk: `0x${string}`;
  victimAddr: `0x${string}`;
  attacker: `0x${string}`;
  tusd: `0x${string}`;
  sweeper: `0x${string}`;
};

// Persisted to a file so it is shared reliably across API routes and dev reloads
// (a module-level singleton is not reliably shared across Next route modules).
const FILE = join(process.cwd(), ".runtime.json");

export function getConfig(): RunConfig {
  if (existsSync(FILE)) {
    try {
      return JSON.parse(readFileSync(FILE, "utf8")) as RunConfig;
    } catch {
      /* fall through to env */
    }
  }
  const victimPk = process.env.VICTIM_PK as `0x${string}` | undefined;
  const attacker = process.env.ATTACKER_ADDR as `0x${string}` | undefined;
  const tusd = process.env.TUSD_ADDR as `0x${string}` | undefined;
  const sweeper = process.env.SWEEPER_ADDR as `0x${string}` | undefined;
  if (!victimPk || !attacker || !tusd || !sweeper) {
    throw new Error("Not configured, run `npm run setup` first.");
  }
  return { victimPk, victimAddr: privateKeyToAccount(victimPk).address, attacker, tusd, sweeper };
}

export function setConfig(c: RunConfig) {
  writeFileSync(FILE, JSON.stringify(c, null, 2));
}
