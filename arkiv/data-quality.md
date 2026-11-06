# Data quality

How The Blacklist stays fresh, how entries are labelled, and queries you can run.

## Provenance

Every entry is derived from **public blockchain data**, never from a metadata provider:

- **Delegations** come from real EIP-7702 (type-4) transactions, read over JSON-RPC
  (`getBlock` with full transactions; authorizations recovered with `recoverAuthorizationAddress`).
- **Delegate classification** comes from the contract's own runtime bytecode (`eth_getCode`), with
  `bytecodeHash = keccak256(code)` stored so anyone can reproduce the fetch and verify integrity.
- **Attacks and mints** recorded by the live app are the app's own on-chain transactions, with the
  tx hash and block stored on the entity.

Not Sourcify, not a contract-verification feed. See [`../LICENSE`](../LICENSE) for the CC0 data dedication.

## Freshness

- **Re-runnable importer:** `npm run import` scans the most recent `SCAN_BLOCKS` (default 200) of
  Ethereum mainnet, or an explicit `SCAN_FROM`/`SCAN_TO` range. Writes are **idempotent** on
  `(chain, address)`, so re-running refreshes `delegatorCount`/`label` instead of duplicating.
- **Live updates:** each attack executed in the app upserts the sweeper it used, so the registry
  grows as the demo is used.
- **Expiry:** entities are written with a 180-day TTL (`ExpirationTime.fromDays(180)`), near Arkiv's
  ~182.5-day maximum, and can be extended.

## Labelling (summary — full method in [`../docs/attack/detection.md`](../docs/attack/detection.md))

Deterministic, no LLM. Strongest → weakest:

| Label | Basis |
|---|---|
| `confirmed-thief` | In a published attack. **Hand-added only, with a source** — never from a heuristic. |
| `likely-thief` | Tiny no-owner-check sweeper reused by ≥3 distinct delegators in the scan. |
| `suspicious` | Tiny (≤127-byte) non-proxy delegate that forwards the balance to a hardcoded address. |
| `known-good` | Official wallet impls — a hand-maintained allowlist (empty until verified). |
| `unknown` | Everything else: large smart-account impls, EIP-1167 proxies, no-code delegates. |

Each entity carries a human-readable `labelSource` recording the exact basis (byte size, delegator
count, proxy target, or the hand-verification note).

**Honesty bounds.** Heuristics have false positives, so `suspicious` ≠ `thief`. We never assert a
`thief` label without proof, and `known-good` is left empty rather than guessed. On recent mainnet
the honest result is mostly `suspicious` + `unknown`, because current 7702 traffic is dominated by
legitimate smart-account implementations; tiny sweepers surface when scanning a drainer-active window.

## Example filters

```ts
import { eq, and, gt } from "@arkiv-network/sdk/query";

// all contracts we flagged as suspicious
pub.select({ address: true, labelSource: true }).from(Delegate)
   .where(eq("label", "suspicious")).ownedBy(WRITER).fetch();

// likely-thief sweepers on Ethereum
pub.select({ address: true, delegatorCount: true }).from(Delegate)
   .where(and(eq("chain", "ethereum"), eq("label", "likely-thief"))).ownedBy(WRITER).fetch();

// every attack recorded against a given victim
pub.select({ drained: true, sweepTx: true }).from(Delegation)
   .where(eq("victim", addr(VICTIM))).ownedBy(WRITER).fetch();
```

(The dashboard runs the equivalent reads through `GET /api/arkiv/activity`.)
