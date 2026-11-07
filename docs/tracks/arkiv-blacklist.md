# 📕 The Blacklist, Arkiv

**Track:** Mirror something Ethereum depends on · **Prize:** 1st $3,000 · 2nd $1,000 · Swarm bonus +$500 (stacks, no extra slot)

**Simple version:** a public list of dangerous 7702 contracts that anyone can query.

## What Arkiv is

A database that lives on a blockchain. You store "entities" (rows). Each one is owned by a
wallet, queried with SQL-like filters, and expires when you choose. Anyone can read it
without asking you for access.

## What we build

A public registry of EIP-7702 delegations and delegate contracts on Ethereum
(Arbitrum if time allows), that wallets / exchanges / The Alarm can check before trusting a contract.

### Entities

| Entity | Fields we query | Owner | Expiry |
|---|---|---|---|
| `DelegateContract` | chain, address, bytecodeHash, label, labelSource, delegatorCount, firstSeenBlock, swarmRef | importer wallet | long |
| `Delegation` | chain, wallet, delegate, block, txHash, status (`active`/`revoked`/`failed`) | importer wallet | long |

### Labels

| Label | How we decide |
|---|---|
| 🔴 `confirmed-thief` | Used in a known published attack (e.g. Binance). Hand-added, with source link. |
| 🟠 `likely-thief` | Wallets that delegated had funds drained to one address within minutes. |
| 🟡 `suspicious` | Bytecode looks like a sweeper: tiny, no owner checks, sends everything to one hardcoded address. |
| 🟢 `known-good` | Official wallet implementations (MetaMask, Coinbase, Ambire, …). |
| ⚪ `unknown` | Not enough info. |

Never label `thief` without proof. See [../attack/detection.md](../attack/detection.md) for how labels are derived.

## Importer logic

1. Read blocks via RPC with full transactions.
2. Keep only type-4 / `eip7702` transactions.
3. For each `authorizationList` entry: recover the wallet (`recoverAuthorizationAddress`),
   verify with `eth_getCode` (delegated accounts return `0xef0100` + delegate address),
   zero-address delegation = revoked.
4. `eth_getCode(delegate)` → heuristics / LLM → label.
5. Check `Transfer` events after the delegation → `likely-thief` signal.
6. Write/update entities on Arkiv; keep following new blocks.

**Scope:** recent block range + the Binance attack block range. Do not scan all history (RPC limits).

## Qualification checklist

- [ ] Built from scratch at ETHGlobal Mumbai
- [ ] Data license allows republishing (derived from public chain data; link sources for hand-added entries)
- [ ] Not Sourcify data
- [ ] Re-runnable import script in the repo
- [ ] Writes to Arkiv current testnet via `@arkiv-network/sdk` or JSON-RPC; a user-facing feature **reads** from Arkiv
- [ ] README: writer wallet address(es) + one runnable query
- [ ] `/arkiv/schema.md`, entities, queried fields, owners, expiry
- [ ] `/arkiv/friction.md`, honest feedback (write it **as you build**)
- [ ] `/arkiv/reach.md`, who uses it: wallets warning before signing, exchanges, researchers, The Alarm
- [ ] `/arkiv/why-arkiv.md`, vs Postgres: permissionless reads, can't be quietly taken down, wallet-signed provenance
- [ ] `/arkiv/data-quality.md`, how it stays fresh, labeling, example filters
- [ ] Public repo, open-source license, AI-usage disclosure

## Swarm bonus (+$500)

Store bytecode / incident reports / the Binance attack trace on Swarm; point to it from
`DelegateContract.swarmRef`. Needs `/arkiv/swarm.md` (what's where, one entity→reference link,
postage batch ID + wallet, upload/read steps, demo timestamp, friction). Never store an
encrypted Swarm reference raw in a public entity.

## Testnet

- RPC `https://rpc.rabdi.db-chain.testnet.arkiv.network`
- Explorer `https://rabdi.explorer.arkiv.network`
- Faucet `https://hub.arkiv.network/faucet`
- Chain ID `7794095` · Docs `https://docs.arkiv.network`
