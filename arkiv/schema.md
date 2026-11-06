# Arkiv schema — The Blacklist

A public, wallet-signed registry of EIP-7702 activity on the **Arkiv Rabdi testnet**
(chain id `7794095`, explorer https://rabdi.explorer.arkiv.network). Written by the demo
server (`src/lib/arkiv.ts`), read by the dashboard's **Activity / Blacklist** panel.

- **SDK:** `@arkiv-network/sdk` (schema-based API).
- **Namespace prefix:** `chainwall` (override with `ARKIV_NAMESPACE`).
- **Writer wallet:** `ARKIV_PK` (funded with tGLM from https://hub.arkiv.network/faucet).
- **Expiry:** every entity is written with `ExpirationTime.fromDays(180)` (near the ~182.5-day max).
- **Value types used:** only `addr`, `str`, `dec` — the well-documented wrappers — so records stay robust across SDK point releases. Numeric fields that are display-only (blocks, timestamps, counts) are stored as `str`.

## Entities

### `chainwall.delegation` — one per attack run
Captures a real EIP-7702 delegation + drain executed by the demo.

| Column | Type | Indexed | Meaning |
|---|---|:--:|---|
| `chain` | str | ✓ | `sepolia` / `local` |
| `victim` | addr | ✓ | hijacked account |
| `delegate` | addr | ✓ | sweeper the account was delegated to |
| `attacker` | addr | ✓ | address funds were drained to |
| `token` | addr | | drained ERC-20 (tUSD) |
| `drained` | dec | | amount drained (human units) |
| `delegateTx` | str | | type-4 delegation tx hash |
| `sweepTx` | str | | sweep tx hash |
| `block` | str | | sweep block number |
| `status` | str | ✓ | `drained` |
| `ts` | str | ✓ | unix ms |

Owner: the writer wallet.

### `chainwall.delegate` — the flagged-contract registry
One per sweeper contract; `delegatorCount` bumps each time it's reused.

| Column | Type | Indexed | Meaning |
|---|---|:--:|---|
| `chain` | str | ✓ | network |
| `address` | addr | ✓ | the delegate/sweeper contract |
| `bytecodeHash` | str | | `keccak256` of its runtime code |
| `label` | str | ✓ | `confirmed-thief` / `likely-thief` / `suspicious` / `known-good` / `unknown` |
| `labelSource` | str (opt) | | why it was labelled, with source |
| `delegatorCount` | str | | how many delegations point at it |
| `firstSeenBlock` | str | | first block we saw it |
| `ts` | str | | unix ms |

The demo sweeper is labelled `suspicious` by heuristic (tiny contract, no owner checks,
forwards the entire balance to one hardcoded address). `confirmed-thief` is reserved for
addresses from published attacks (e.g. the Binance sweeper), hand-added with a source link.

### `chainwall.mint` — one per mint
Every top-up of the demo wallet (Deposit / Mint button).

| Column | Type | Indexed | Meaning |
|---|---|:--:|---|
| `chain` | str | ✓ | network |
| `token` | addr | ✓ | tUSD |
| `to` | addr | ✓ | recipient (victim) |
| `amount` | dec | | minted amount (human units) |
| `tx` | str | | mint tx hash |
| `block` | str | | mint block number |
| `ts` | str | | unix ms |

## Example query (read)

```ts
import { createPublicClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { http } from "viem";

const pub = createPublicClient({ chain: rabdi({ accessKey: process.env.ARKIV_ACCESS_KEY ?? "" }), transport: http() });

// All attacks recorded by this writer, newest first (sorted client-side on `ts`):
const { entities } = await pub
  .select({ $key: true, victim: true, delegate: true, drained: true, sweepTx: true, ts: true })
  .from(Delegation)            // defineSchema("chainwall.delegation", …)
  .ownedBy(writerAddress)
  .fetch();
```

The dashboard calls this through `GET /api/arkiv/activity`, which returns `{ delegations, mints, delegates }`.
