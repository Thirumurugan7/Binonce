# Reach — who uses it

The Blacklist is only useful if something reads it at the moment a 7702 delegation is about to be
trusted. The registry is a shared read surface; these are the consumers.

## Wallets, before signing
When a user is asked to sign an EIP-7702 authorization, the wallet can query the delegate address
against the registry and warn: *"this contract is flagged `likely-thief` — 40 wallets that delegated
to it were drained."* This is the highest-leverage consumer: it blocks the attack before the
signature exists. The query is one `select … where eq("address", …)` with no permission step.

## The Alarm (our own sibling project)
The Chainlink-powered Alarm watches for dangerous delegations and reacts. It reads the registry to
decide severity — a delegation to a `confirmed-thief`/`likely-thief` delegate is an immediate
escalation, a `known-good` one is noise. The registry is the shared vocabulary between The
Blacklist, The Alarm and The Lock.

## Exchanges and custodians
Deposit/withdrawal pipelines can screen whether a counterparty account is delegated to a flagged
sweeper before crediting or releasing funds — the same control that would have helped in the
Binance 7702 incident this project replays.

## Security researchers and dashboards
Because reads are permissionless and the data is CC0, researchers can pull the registry into their
own tooling, cross-reference `bytecodeHash` across chains, and republish without asking us. Each
entry's wallet-signed provenance lets them weight our labels against other publishers on the same
schema.

## This project's own UI
The dashboard's **Activity / Blacklist** panel reads the registry live via `GET /api/arkiv/activity`
and renders the recorded attacks/mints and the flagged-contract list — the in-product proof that a
real feature consumes the Arkiv data, with each row linking to its entity on the Arkiv explorer.
