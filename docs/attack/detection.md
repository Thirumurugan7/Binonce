# Detecting 7702 delegations & labeling sweepers

How The Blacklist and The Alarm find and judge delegate contracts. No manual lookups — a
script does it; only the handful of confirmed-attack addresses are hand-added.

## Finding delegations

Every 7702 delegation is a **type-4** transaction with an `authorizationList`. Scan blocks and
keep type-4 txs. For each authorization:

```ts
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { recoverAuthorizationAddress } from "viem/utils"; // v3: Authorization.recoverAddress

const client = createPublicClient({ chain: mainnet, transport: http(RPC_URL) });
const block = await client.getBlock({ blockNumber, includeTransactions: true });

for (const tx of block.transactions) {
  if (tx.type !== "eip7702") continue;
  for (const auth of tx.authorizationList) {
    const wallet = await recoverAuthorizationAddress({ authorization: auth });
    const delegate = auth.address;                  // the contract delegated to
    const code = await client.getCode({ address: delegate });
    // classify `code`, store { wallet, delegate, label } on Arkiv
  }
}
```

(Confirm exact function names against the viem version at kickoff — v2 vs v3 differ.)

## Verifying it actually applied

An authorization can be in a tx but fail (wrong nonce/chain). After recovering the wallet,
confirm with `eth_getCode(wallet)`:
- empty → not delegated
- `0xef0100` + address → delegated to that address
- delegation to the zero address → revoked

## Deciding the label (strongest → weakest)

1. **`confirmed-thief`** — address appears in a published attack (e.g. the Binance sweeper). Hand-added with a source link.
2. **`likely-thief`** — many wallets that delegated to it had funds sent to one same address within minutes (read `Transfer` events after the delegation block).
3. **`suspicious`** — bytecode heuristics / LLM: tiny, no owner checks, forwards everything to one hardcoded address.
4. **`known-good`** — official wallet implementations (MetaMask, Coinbase, Ambire …).
5. **`unknown`** — insufficient info.

Heuristics have false positives, which is why "suspicious" ≠ "thief." Only (1) is asserted as confirmed.

## Practical limits

- Don't scan all history — pick a recent range + the Binance block range, then follow new blocks.
- Use a free Alchemy/Infura key to avoid public-RPC rate limits.
- Ethereum first; add Arbitrum only if time allows.

## As implemented (`scripts/import.ts`)

This is exactly what the re-runnable importer does — no LLM, deterministic.

**1. Collect delegations (real chain data).**
- RPC: `SCAN_RPC` (defaults to the mainnet form of `CHAIN_RPC`, else a public node).
- Range: the last `SCAN_BLOCKS` (default 200), or an explicit `SCAN_FROM`/`SCAN_TO`.
- For each block (`getBlock` with full transactions), keep `tx.type === "eip7702"`.
- For each `authorizationList` entry: `delegate = auth.address`; a zero-address delegate is a **revocation** and is skipped. Recover the wallet with `recoverAuthorizationAddress` (fall back to `tx.from`).
- Aggregate per delegate: the set of distinct delegator wallets and the first block seen.

**2. Classify each delegate from its runtime code** (`eth_getCode`, `bytecodeHash = keccak256(code)`):

| Condition on the delegate's code | Label |
|---|---|
| In the hand-maintained known-good allowlist (currently empty) | `known-good` |
| No code (revoked / self-destructed / EOA) | `unknown` |
| **EIP-1167 minimal proxy** (`363d3d373d3d3d363d73…5af43d82803e903d91602b57fd5bf3`) | `unknown` (legit clone pattern; the impl address is recorded in `labelSource`) |
| **≤ 127 bytes, not a proxy** (tiny, no owner checks, forwards balance to a hardcoded address) | `suspicious` |
| …and reused by **≥ 3 distinct delegators** in the scan | `likely-thief` |
| Anything else (e.g. a large smart-account implementation) | `unknown` |

**3. Write to Arkiv.** Flagged contracts are prioritised over `unknown`, then ordered by delegator count, capped at `MAX_DELEGATES` (default 25). Each `chainwall.delegate` entity stores `chain, address, bytecodeHash, label, labelSource, delegatorCount, firstSeenBlock, ts`. Writes are **idempotent** on `(chain, address)` — re-running updates counts and labels.

**4. `confirmed-thief` and curated seeds.** `confirmed-thief` is never produced by heuristics — it is hand-added only with a verifiable published source. A small `SEED` list in the importer carries contracts whose bytecode we inspected by hand (e.g. a sweeper that is owner-gated to a hardcoded operator and sweeps ERC-20 + ETH to it); these are written with the verified label and the evidence in `labelSource`.

**Live demo.** Running an attack in the app also upserts the sweeper it used into the same registry (`upsertDelegate`), labelled `suspicious`, with its delegator count incremented on reuse.

**What we deliberately don't do:** we never assert `thief`/`confirmed-thief` from a heuristic, and `known-good` is left empty rather than guessed. The honest result on recent mainnet is mostly `suspicious` + `unknown`, because today's 7702 traffic is dominated by legitimate smart-account implementations; tiny sweepers show up when scanning a window with active drainer campaigns.
