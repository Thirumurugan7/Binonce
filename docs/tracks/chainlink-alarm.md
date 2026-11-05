# 🚨 The Alarm — Chainlink CRE

**Track:** Best workflow with CRE · **Prize:** $1,500 (single winner)

**Simple version:** a robot that watches our wallets and raises the alarm if one is hijacked.

## What CRE is

Chainlink Runtime Environment — an orchestration layer that connects blockchains to external
APIs, data sources, LLMs or AI agents. A trigger starts a workflow; it reads/calls things;
it writes a result on-chain. It runs on Chainlink's decentralized nodes, so it's "trust a
network," not "trust my server." **Simulation via the CRE CLI is enough to qualify.**

## What we build

1. **Trigger:** cron, every few seconds.
2. **Read:** `getCode` on watched treasury/operator keys. Normal EOA = empty; a new
   `0xef0100…` marker = a fresh 7702 delegation appeared.
3. **Investigate:** look the delegate up in [The Blacklist](./arkiv-blacklist.md) (external data
   source), and ask an LLM "does this bytecode forward all funds to one address?"
4. **Act:** write an alert / pause on-chain so the team knows a key is compromised and must be rotated.

Why it fits the product: **The Lock prevents the drain; The Alarm detects the stolen key.**
Prevention + detection = a complete security story.

## Qualification checklist

- [ ] CRE workflow used as an orchestration layer in the project
- [ ] Integrates ≥1 blockchain with an external API / data source / LLM (we use The Blacklist on Arkiv + an LLM)
- [ ] Successful simulation via CRE CLI (or live deployment)
- [ ] Meaningfully used (not decorative)

Docs `https://docs.chain.link/cre` · Templates `https://github.com/smartcontractkit/cre-templates/`.

## Note on scope

We dropped Chainlink **CCIP** (cross-chain) from the plan: it conflicts with the single-chain
Chainwall story and would replace, not stack. CRE alone is the right Chainlink surface here.
