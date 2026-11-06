# Chainwall × Binance EIP-7702 Attack Demo

A **Next.js + Tailwind** app that executes the **real** Oct 29 2026 Binance EIP-7702 hot-wallet
drain — on-chain — inside a faithful Binance wallet UI. The attack half of the ETHGlobal Mumbai
project (**The Blacklist / The Lock / The Alarm**); the thing The Lock defends against.

This is **not** a UI animation. "Launch attack" deploys real contracts, signs 50 real EIP-7702
authorizations, broadcasts a real type-4 transaction, delegates the victim account to a sweeper
(`0xef0100…`), and drains it — streaming real tx hashes and block numbers as it goes.

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

## How it works

```
Launch attack ──► /api/run (SSE) ──► src/lib/attack.ts
  fresh victim ← mint 2,500,000 tUSD (relayer pays gas)
  victim signs 50 authorizations at consecutive nonces → delegate = Sweeper
  relayer broadcasts one type-4 tx carrying all 50
  one nonce matches → victim code = 0xef0100 + sweeper  (verified via getCode)
  relayer calls sweepToken(tUSD) on the victim → drained to attacker
  every step streams to the UI with real tx hashes + blocks
```

## Layout

```
src/app/            page (Binance overview), styleguide, api/run (real attack SSE), api/config
src/components/     Nav, WalletRail, BalanceCard, AssetsTable, Toasts, AttackTrace, DemoBar, CoinIcon, Dashboard
src/lib/            attack.ts (real on-chain attack), chain.ts (local|Sepolia), abi.ts, types.ts, format.ts
contracts/          Sweeper.sol, TestUSD.sol
scripts/            setup.mjs (deploy + write .env)
docs/               project documentation (tracks, attack, contracts, design, setup)
```

## Notes

- Default chain is a local **anvil --hardfork prague** (chainId 31337). `CHAIN_ID=11155111` → Sepolia.
- viem 2.44: the signed authorization's field is `address` (output) though the input is `contractAddress`.
- The matching nonce is the victim's current nonce; the other 49 are the attacker's safety net to guarantee one lands.
- This is the attack. The defense (Chainwall / The Lock) is documented in `docs/contracts/how-chainwall-stops-7702.md`.

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
