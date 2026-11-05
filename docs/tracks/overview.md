# Tracks — overview

**Event:** ETHGlobal Mumbai, Nov 6–8 2026, Jio World Centre.
**Rule:** you select up to **3 Partner Prizes** on submission. Multiple tracks from one
partner count as **one** slot.

## The one-liner

> The Blacklist knows who the thieves are, The Alarm spots the break-in, and The Lock keeps the door shut.

Pitch line: **"A valid signature is not an approved action."**

## The three parts

| Part | What it does | Built with | Track | Prize |
|---|---|---|---|---|
| 📕 The Blacklist | Public, queryable list of dangerous 7702 contracts | Arkiv (+ Swarm) | Mirror something Ethereum depends on | up to $3,000 + $500 |
| 🔒 The Lock | Keeps funds safe even when a key is stolen | OKcontract Chainwall | EF — Best CROPS App | up to $2,000 (CROPS) / $2,500 (Alt Mempool stretch) |
| 🚨 The Alarm | Watches wallets, raises the alarm on a hijack | Chainlink CRE + LLM | Chainlink — Best workflow with CRE | $1,500 |

Details per track: [arkiv-blacklist.md](./arkiv-blacklist.md) · [ef-lock.md](./ef-lock.md) · [chainlink-alarm.md](./chainlink-alarm.md).
Submission rules: [submission.md](./submission.md).

## How they connect

```
📕 Blacklist (Arkiv)  ──► 🚨 Alarm (CRE) reads it to classify a new delegation
       │                        │
       │                        └──► writes an alert / pause on-chain
       ▼
🔒 Lock (Chainwall)  — the same stolen-key attack is REJECTED because it
                       doesn't match a pre-approved action
```

Each sponsor's tech does a real job in one coherent product — not three bolt-ons.

## The demo in one line

Replay last week's $6B Binance drain → it empties an unprotected wallet → the same attack
against a Lock-protected wallet is rejected → the Alarm fires → the Blacklist names the thief.

## Why this is competitive

- Timely: the Binance hack was Oct 29 2026; judges know it.
- Each partner's own track text describes something close to our part (see per-track docs).
- One memorable demo moment (the prompt-injected / stolen-key attack getting blocked).

See also: [../attack/binance-incident.md](../attack/binance-incident.md).
