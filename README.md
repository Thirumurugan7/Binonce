# Chainwall × Binance EIP-7702 — Attack & Defense Demo

A **Next.js + Tailwind** app that runs **both halves** of the EIP-7702 story on-chain, inside a
faithful Binance wallet UI:

- **`/` — the attack.** Executes the real Oct 29 2026 Binance EIP-7702 hot-wallet drain.
- **`/defense` — the defense.** Runs the real **Chainwall** (The Lock) protocol that stops it.

This is **not** a UI animation. On the attack page, "Launch attack" deploys real contracts, signs
50 real EIP-7702 authorizations, broadcasts a real type-4 transaction, delegates the victim account
to a sweeper (`0xef0100…`), and drains it. On the defense page, "Run defense" stands up a real
Chainwall tenant, funds a governed vault, runs a genuine 2-of-2 payout, then has an attacker try the
same 7702 hijack — and watches the on-chain guard **refuse** it. Both stream real tx hashes and
block numbers as they go.

## Run it (local, no gas, no faucet)

Needs [Foundry](https://getfoundry.sh) (`anvil`) and Node 18+.

```bash
npm install
npm run chain        # terminal 1: anvil on the Prague hardfork (real 7702 support)
npm run setup        # terminal 2: deploys contracts, writes .env
npm run dev          # http://localhost:3000  → click "Launch attack"
```

Each run uses a **fresh victim** (minted 2,500,000 tUSD), so the attack is repeatable. The attack
executes in well under a second on anvil. Visit **/styleguide** for the design system.

## Run it on Sepolia (real public testnet)

```bash
# before `npm run setup`, set:
export CHAIN_ID=11155111
export CHAIN_RPC="https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY"   # must support type-4 txs
export RELAYER_PK=0x...        # a key funded with Sepolia ETH (pays gas)
npm run setup        # deploys TestUSD + Sweeper on Sepolia, writes .env
npm run dev          # "Launch attack" now runs on Sepolia
```

Only the **relayer** needs ETH; the victim is generated per-run and minted test tUSD (open mint).

## Run the defense (`/defense`)

The defense page drives the real [Chainwall](https://github.com/okcontract/chainwall) protocol, which
needs the real Arbitrum One infrastructure (Safe 1.3.0, EntryPoint v0.8, USDC). It therefore runs
against a **local anvil fork of Arbitrum One**, not the blank attack chain:

```bash
# in the chainwall repo: fork Arbitrum One at the current block + deploy the factory family
sh local/up.sh            # anvil fork on :8546 (chain 42161) + OKFactory + background traffic
```

Point the app at it via `.env`, then open `/defense` and click **Run defense**:

```bash
DEFENSE_RPC=http://127.0.0.1:8546          # the Arbitrum-One fork
DEFENSE_FACTORY=0x9DA61baA639778e193Ff08a06E07c62dEDBa5813   # deterministic OKFactory
CHAINWALL_DIR=/path/to/chainwall           # repo holding local/e2e_stream.py
```

`src/app/api/defense-config` reports readiness; `/defense` only enables the button when the fork and
factory are live. The fork prunes old state after ~2h ("missing trie node") — re-run `up.sh` to
refresh it.

> Both offense and defense can also share **one** chain: point the attack's `CHAIN_RPC`/`CHAIN_ID` at
> the same `:8546` fork (chain `42161`) and fund its relayer. The attack is self-contained, the fork
> is Prague, so 7702 works there too.

## How it works

The app has two independent flows. Both are real on-chain runs streamed to the UI over SSE; neither
is scripted animation.

### ⚔️ Offense — the attack (`/`)

Why it works: a delegated EOA's code is exactly 23 bytes, `0xef0100 ‖ delegate`. A single valid
signature at the account's current nonce is enough to install that delegation — no transaction from
the victim, no gas from the victim, no approval dialog. Whoever holds the key can make the wallet
*become* a contract that drains itself.

```
Launch attack ──► /api/run (SSE) ──► src/lib/attack.ts
  1 Sign      fresh victim ← mint 2,500,000 tUSD (relayer pays gas)
              victim signs 50 authorizations at consecutive nonces → delegate = Sweeper
              (signatures only — nothing on-chain yet, no gas)
  2 Broadcast relayer wraps all 50 into ONE type-4 tx and broadcasts it (relayer pays gas)
  3 Hijack    the one authorization at the victim's current nonce takes effect
              → victim code = 0xef0100 + sweeper   (verified live via eth_getCode)
  4 Drain     relayer calls sweepToken(tUSD) through the hijacked account
              → entire balance moved to the attacker in one on-chain call
  every step streams real tx hashes + block numbers to the modal
```

The other 49 authorizations are the attacker's safety net: only the one matching the current nonce
lands, the rest guarantee a hit if the nonce advances before broadcast. No anvil cheat codes — real
deploy, open-mint token, relayer-paid gas; so it runs unchanged on a Prague/Pectra testnet (see
*Run it on Sepolia*).

### 🛡️ Defense — Chainwall / The Lock (`/defense`)

The fix is not to detect bad signatures — a forged signature can look perfectly valid. The fix is to
refuse to act for a signer whose account has *become delegated code*. Chainwall puts the treasury
behind an on-chain control plane (factory → registry of users/groups/policies → execution engine →
governed vault) and the engine checks every actor before it executes.

```
Run defense ──► /api/defend (SSE) ──► src/lib/defense.ts ──► spawns Chainwall local/e2e_stream.py
                (runs on an anvil fork of Arbitrum One, chain 42161, so real Safe 1.3.0,
                 EntryPoint v0.8 and real USDC exist)
  1 Vault     OKFactory creates a tenant on-chain: registry, users/groups/policies,
              execution engine, and a vault whose funds only move through approved interactions
  2 Payout    a genuine 2-of-2 treasury policy runs end to end:
              Alice proposes → Bob approves (threshold met) → transfer executes on-chain
  3 Hijack    attacker 7702-delegates a vault signer (Carol) to a forged-signature "yes-contract"
              that returns the ERC-1271 magic value (0x1626ba7e) for ANY signature
  4 Detect    Chainwall's Delegation7702 library reads Carol's code, sees the 0xef0100‖delegate
              designator → isDelegated = true, delegateOf = the yes-contract
  5 Refuse    the Interact engine reverts ActorDelegated(actor, delegate) before any transfer
              → attacker receives 0, vault balance unchanged
```

**Core primitive:** `Delegation7702.sol` detects the 23-byte `0xef0100 ‖ delegate` designator
(`isDelegated`, `delegateOf`); the Interact engine reverts `ActorDelegated(actor, delegate)` for any
delegated signer that governance has not explicitly allow-listed. The forged signature never gets a
chance to be checked — the actor is rejected first.

> **Note on the demo rig:** the defense flow forks Arbitrum One to borrow real mainnet USDC and uses
> anvil cheats (`anvil_setStorageAt` / `anvil_setBalance`) to fund the vault and signers instantly,
> so it is **fork-only** as written. The security property itself is chain-agnostic — deploy
> Chainwall + a real test token on any EVM chain and the `ActorDelegated` guard behaves identically.

## Layout

```
src/app/            / (attack), /defense (Chainwall), styleguide
                    api/run + api/config          — attack SSE + offense config
                    api/defend + api/defense-config — defense SSE + fork/factory readiness
                    api/reset, api/balance, api/mint, api/arkiv/activity
src/components/     Nav, ModeSwitch (Attack↔Defense), BalanceCard, AssetsTable, Toasts, CoinIcon
                    Dashboard + AttackModal + DemoBar       — offense UI
                    DefenseDashboard + DefenseModal + DefenseBar — defense UI
                    ActivityPanel, MintModal
src/lib/            attack.ts (on-chain attack), chain.ts (local|Sepolia|Arbitrum fork)
                    defense.ts (spawns the Chainwall e2e), defense-types.ts
                    deploy.ts, runtime.ts, abi.ts, mint.ts, arkiv.ts, types.ts, format.ts
contracts/          Sweeper.sol, TestUSD.sol
scripts/            setup.mjs (deploy + write .env), import.ts (Arkiv blacklist importer)
docs/               project documentation (tracks, attack, contracts, design, setup)
```

The defense's on-chain logic lives in the separate **Chainwall** repo (`Delegation7702.sol`, the
Interact engine); this app drives it through `src/lib/defense.ts` → `local/e2e_stream.py`.

## Notes

- Default chain is a local **anvil --hardfork prague** (chainId 31337). `CHAIN_ID=11155111` → Sepolia.
- viem 2.44: the signed authorization's field is `address` (output) though the input is `contractAddress`.
- The matching nonce is the victim's current nonce; the other 49 are the attacker's safety net to guarantee one lands.
- The defense (Chainwall / The Lock) is summarized above under *How it works → Defense*; the full
  contract-level write-up is in `docs/contracts/how-chainwall-stops-7702.md`.

## The Blacklist (Arkiv)

A public, wallet-signed registry of EIP-7702 delegate contracts and delegations, written to the
**Arkiv Rabdi testnet** (chain id `7794095`, explorer https://rabdi.explorer.arkiv.network) with
`@arkiv-network/sdk`. The app **reads** it in the dashboard's **Activity / Blacklist** panel; the
importer **writes** it.

- **Writer wallet (owns all entities):** `0x7264fB117ce777888B1bD2eF66ED0CF4CA14B4a9`
- **Re-runnable importer:** `npm run import` — scans real Ethereum-mainnet EIP-7702 delegations,
  classifies each delegate from its bytecode + reuse, and writes `chainwall.delegate` entities.
  Tunables: `SCAN_BLOCKS`, `SCAN_FROM`/`SCAN_TO`, `MAX_DELEGATES`, `SCAN_RPC`.
- **How entries are labelled:** deterministic bytecode/reuse heuristics (no LLM). See
  [`docs/attack/detection.md`](docs/attack/detection.md) — tiny no-owner-check sweeper → `suspicious`,
  reused by ≥3 wallets → `likely-thief`, EIP-1167 proxies and large smart-account impls → `unknown`,
  `confirmed-thief` only hand-added with a verified source. We never assert "thief" from a heuristic.
- **Config:** set `ARKIV_ACCESS_KEY` (https://hub.arkiv.network/access-keys) and `ARKIV_PK`
  (funded with tGLM from https://hub.arkiv.network/faucet) in `.env`. Unset → the app runs with
  the registry disabled.

### One query you can run

Reads our live registry from Arkiv (needs your own free access key):

```ts
// bun query.ts   — after: npm i @arkiv-network/sdk viem ; export ARKIV_ACCESS_KEY=...
import { createPublicClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { defineSchema, str, addr } from "@arkiv-network/sdk/schema";
import { http } from "viem";

const Delegate = defineSchema("chainwall.delegate", {
  chain: str().indexed(), address: addr().indexed(), bytecodeHash: str(),
  label: str().indexed(), labelSource: str().optional(),
  delegatorCount: str(), firstSeenBlock: str(), ts: str(),
});
const pub = createPublicClient({ chain: rabdi({ accessKey: process.env.ARKIV_ACCESS_KEY ?? "" }), transport: http() });
const { entities } = await pub
  .select({ $key: true, address: true, label: true, delegatorCount: true })
  .from(Delegate)
  .ownedBy("0x7264fB117ce777888B1bD2eF66ED0CF4CA14B4a9")
  .fetch();
for (const e of entities) console.log(e.label.value, e.address.value, `${e.delegatorCount.value} delegators`);
```

### Arkiv submission docs

- [`arkiv/schema.md`](arkiv/schema.md) — entities, queried fields, owners, expiry
- [`arkiv/data-quality.md`](arkiv/data-quality.md) — freshness, labelling, example filters
- [`arkiv/why-arkiv.md`](arkiv/why-arkiv.md) — vs a plain database
- [`arkiv/reach.md`](arkiv/reach.md) — who uses it
- [`arkiv/friction.md`](arkiv/friction.md) — honest build feedback

## License & data

Code is MIT; the registry **data** is public-domain (CC0) and derived from public chain data —
**not Sourcify** — so it may be freely republished. See [`LICENSE`](LICENSE).

## AI-usage disclosure

Built with AI assistance for scaffolding, the UI, the Arkiv integration and the
importer. All on-chain logic, the Arkiv schema, and the labelling heuristics were reviewed by the
team; no labels are asserted without the bytecode/heuristic basis recorded in each entity.

> A valid signature is not an approved action.
