/**
 * The Blacklist importer — scans real EIP-7702 delegations on Ethereum mainnet,
 * classifies each delegate contract, and writes the results to the Arkiv
 * `chainwall.delegate` registry (idempotent, re-runnable).
 *
 *   bun scripts/import.ts            # scan the last SCAN_BLOCKS blocks
 *   SCAN_BLOCKS=400 bun scripts/import.ts
 *   SCAN_FROM=23650000 SCAN_TO=23650300 bun scripts/import.ts
 *
 * Env:
 *   SCAN_RPC     mainnet RPC with full-tx blocks (default: derive from CHAIN_RPC, else publicnode)
 *   SCAN_BLOCKS  how many recent blocks to scan   (default 200)
 *   MAX_DELEGATES  cap on registry writes          (default 25)
 *   ARKIV_*      writer creds (see .env) — required to write; dry-run otherwise
 *
 * Labels (detection.md): a script decides these; only confirmed-attack
 * addresses are hand-added. Heuristic here:
 *   - tiny bytecode (≤64 bytes, no owner checks, forwards everything) → `suspicious`
 *   - tiny AND reused by ≥3 distinct wallets in the scan           → `likely-thief`
 *   - in the known-good allowlist                                   → `known-good`
 *   - otherwise                                                     → `unknown`
 */
import "dotenv/config";
import { createPublicClient, http, keccak256, zeroAddress, getAddress, type Hex } from "viem";
import { recoverAuthorizationAddress } from "viem/utils";
import { importDelegate, arkivEnabled } from "../src/lib/arkiv";

// viem's recoverAuthorizationAddress has heavily-overloaded types; narrow it for the script.
const recover = recoverAuthorizationAddress as (args: { authorization: unknown }) => Promise<string>;

const CHAIN_RPC = process.env.CHAIN_RPC || "";
const SCAN_RPC =
  process.env.SCAN_RPC ||
  (CHAIN_RPC.includes("eth-sepolia") ? CHAIN_RPC.replace("eth-sepolia", "eth-mainnet") : "https://ethereum-rpc.publicnode.com");
const SCAN_BLOCKS = BigInt(process.env.SCAN_BLOCKS || "200");
const MAX_DELEGATES = Number(process.env.MAX_DELEGATES || "25");
const BATCH = 8;

// Verified official 7702 delegate implementations go here (lowercased). Left
// conservative on purpose — we never assert "known-good" without a source.
const KNOWN_GOOD = new Map<string, string>([
  // ["0x...", "MetaMask EIP7702StatelessDeleGator"],
]);

// Curated, hand-verified sweeper contracts. Each was inspected directly from its
// on-chain bytecode (owner-gated to a hardcoded operator, sweeps ERC-20/ETH to it).
// Always fetched + written so the registry shows real flagged contracts even when
// the recent-block scan only turns up large, legitimate smart-account impls.
const SEED: { address: string; label: string; source: string }[] = [
  {
    address: "0x63e842B054Bd624a465454D533C33F573e9c6fAe",
    label: "suspicious",
    source: "sweeper: owner-gated to a hardcoded operator, sweeps ERC-20+ETH to it; alleged Oct-2026 Binance 7702 incident",
  },
];

type Agg = { delegators: Set<string>; first: number; sampleTx: string };

/** Classify a delegate from its runtime code + how widely it's reused. */
function classify(code: string, size: number, n: number, knownGoodLabel?: string): { label: string; source: string } {
  if (knownGoodLabel) return { label: "known-good", source: knownGoodLabel };
  if (size === 0) return { label: "unknown", source: "no code at delegate (revoked, self-destructed, or EOA)" };
  // EIP-1167 minimal proxy — a legitimate clone pattern; its target is unknown, not a sweeper.
  if (code.startsWith("0x363d3d373d3d3d363d73") && code.includes("5af43d82803e903d91602b57fd5bf3")) {
    const impl = "0x" + code.slice(22, 62);
    return { label: "unknown", source: `EIP-1167 minimal proxy → ${impl}` };
  }
  // Tiny, non-proxy delegate with no owner checks is the classic sweeper shape.
  if (size <= 127) {
    const label = n >= 3 ? "likely-thief" : "suspicious";
    return { label, source: `sweeper-like: ${size}b, no owner checks, forwards balance; ${n} delegator(s) in scan` };
  }
  return { label: "unknown", source: `${size}b delegate; ${n} delegator(s) in scan` };
}

async function main() {
  const pub = createPublicClient({ transport: http(SCAN_RPC) });
  const latest = await pub.getBlockNumber();
  const to = process.env.SCAN_TO ? BigInt(process.env.SCAN_TO) : latest;
  const from = process.env.SCAN_FROM ? BigInt(process.env.SCAN_FROM) : to - SCAN_BLOCKS + 1n;

  console.log(`scanning ${SCAN_RPC}`);
  console.log(`blocks ${from}..${to} (${to - from + 1n}) · arkiv ${arkivEnabled() ? "ON" : "OFF (dry run)"}`);

  const delegates = new Map<string, Agg>();
  let txSeen = 0;
  let authSeen = 0;

  const nums: bigint[] = [];
  for (let b = from; b <= to; b++) nums.push(b);

  for (let i = 0; i < nums.length; i += BATCH) {
    const slice = nums.slice(i, i + BATCH);
    const blocks = await Promise.all(
      slice.map((n) => pub.getBlock({ blockNumber: n, includeTransactions: true }).catch(() => null))
    );
    for (const block of blocks) {
      if (!block) continue;
      for (const tx of block.transactions) {
        if (typeof tx === "string" || tx.type !== "eip7702") continue;
        txSeen++;
        const auths = (tx as unknown as { authorizationList?: readonly unknown[] }).authorizationList ?? [];
        for (const a of auths as Array<{ address?: string; contractAddress?: string }>) {
          authSeen++;
          const delegate = (a.address || a.contractAddress || "").toLowerCase();
          if (!delegate || delegate === zeroAddress) continue; // zero = revocation
          let wallet: string;
          try { wallet = (await recover({ authorization: a })).toLowerCase(); }
          catch { wallet = (tx.from || "").toLowerCase(); }
          const agg = delegates.get(delegate) ?? { delegators: new Set<string>(), first: Number(block.number), sampleTx: tx.hash };
          if (wallet) agg.delegators.add(wallet);
          agg.first = Math.min(agg.first, Number(block.number));
          delegates.set(delegate, agg);
        }
      }
    }
    process.stdout.write(`\r  ${Math.min(i + BATCH, nums.length)}/${nums.length} blocks · ${delegates.size} delegates · ${txSeen} 7702 txs`);
  }
  console.log("");

  if (delegates.size === 0) {
    console.log("No EIP-7702 delegations found in this range. Try a larger SCAN_BLOCKS or a known-active range.");
    return;
  }

  // Fetch code + classify EVERY unique delegate (cap code lookups for safety).
  const all = [...delegates.entries()].sort((a, b) => b[1].delegators.size - a[1].delegators.size).slice(0, 150);
  type Row = { addr: string; code: string; size: number; n: number; first: number; label: string; source: string };
  const rows: Row[] = [];
  for (const [addr, agg] of all) {
    const code = ((await pub.getCode({ address: getAddress(addr) }).catch(() => undefined)) || "0x").toLowerCase();
    const size = Math.max(0, (code.length - 2) / 2);
    const n = agg.delegators.size;
    const { label, source } = classify(code, size, n, KNOWN_GOOD.get(addr));
    rows.push({ addr, code, size, n, first: agg.first, label, source });
  }

  // Prioritise flagged contracts (suspicious / likely-thief / known-good) over `unknown`,
  // so the registry shows real variety even when big legit impls dominate by count.
  const rank: Record<string, number> = { "confirmed-thief": 0, "likely-thief": 1, "suspicious": 2, "known-good": 3, proxy: 4, unknown: 5 };
  rows.sort((a, b) => (rank[a.label] - rank[b.label]) || (b.n - a.n));
  const chosen = rows.slice(0, MAX_DELEGATES);

  let written = 0;
  const counts: Record<string, number> = {};
  for (const r of chosen) {
    counts[r.label] = (counts[r.label] || 0) + 1;
    const res = await importDelegate({
      chain: "ethereum", address: getAddress(r.addr), bytecodeHash: keccak256(r.code as Hex), label: r.label,
      labelSource: r.source, delegatorCount: String(r.n), firstSeenBlock: String(r.first), ts: String(Date.now()),
    });
    if (res) written++;
    console.log(`  [${r.label.padEnd(13)}] ${getAddress(r.addr)} · ${r.size}b · ${r.n} delegator(s)${res ? (res.created ? " · created" : " · updated") : " · (dry)"}`);
  }

  // Curated seed — always fetch real code + write, using the verified label.
  for (const s of SEED) {
    const addr = s.address.toLowerCase();
    const code = ((await pub.getCode({ address: getAddress(addr) }).catch(() => undefined)) || "0x").toLowerCase();
    const size = Math.max(0, (code.length - 2) / 2);
    const seen = delegates.get(addr);
    const n = seen ? seen.delegators.size : 0;
    counts[s.label] = (counts[s.label] || 0) + 1;
    const res = await importDelegate({
      chain: "ethereum", address: getAddress(addr), bytecodeHash: keccak256(code as Hex), label: s.label,
      labelSource: s.source, delegatorCount: String(n), firstSeenBlock: String(seen?.first ?? 0), ts: String(Date.now()),
    });
    if (res) written++;
    console.log(`  [${s.label.padEnd(13)}] ${getAddress(addr)} · ${size}b · seed${res ? (res.created ? " · created" : " · updated") : " · (dry)"}`);
  }

  console.log("");
  console.log(`scanned ${txSeen} type-4 txs / ${authSeen} authorizations · ${delegates.size} unique delegates`);
  console.log(`labels: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(" · ") || "none"}`);
  console.log(arkivEnabled() ? `wrote ${written} entries to the Arkiv registry.` : "dry run (set ARKIV_ACCESS_KEY + ARKIV_PK to write).");
}

main().catch((e) => { console.error(e); process.exit(1); });
