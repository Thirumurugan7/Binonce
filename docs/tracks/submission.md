# Submission & rules

## ETHGlobal rules that matter

- **From scratch:** all project code starts after kickoff. Public libraries/tools (Chainwall,
  viem, SDKs) are fine. The Binance incident research and planning (these docs) are fine; the
  code is not.
- **AI usage:** disclose how AI was used. Projects relying entirely on AI may lose partner/finalist eligibility.
- **Max 3 partner prizes**, chosen on the last submission step — the only way partners see the project.
- **Commit steadily:** no single giant commit at the end. Several partners reject single-commit dumps.

## Our 3 partner picks

1. **Arkiv** — The Blacklist (Mirror track + Swarm bonus)
2. **Ethereum Foundation** — The Lock (CROPS, Alt Mempool as stretch)
3. **Chainlink** — The Alarm (CRE)

Also select **Finalist judging**: 4-min demo + 3-min Q&A.

## Finalist demo script (4 min)

1. **The break-in (45s)** — replay last week's $6B Binance attack on an unlocked wallet → drained.
2. **🔒 The Lock (75s)** — same stolen key, same attack, wallet behind The Lock → rejected. Switch off the backend → still rejected.
3. **🚨 The Alarm (45s)** — The Alarm sees the hijack and fires on-chain.
4. **📕 The Blacklist (45s)** — The Blacklist names the thief contract; run a live query.
5. **Close (30s)** — "A valid signature is not an approved action."

## Judge Q&A prep

- *"Doesn't a leaked EOA key lose everything anyway?"* → Yes. That's why funds belong behind The Lock; a key alone shouldn't be enough.
- *"Isn't this just Chainwall's product?"* → Chainwall powers The Lock. We built the attack replay, The Blacklist, and The Alarm around it.
- *"Isn't this the same as AWS AgentCore / Google AP2 controls?"* → Those are platform-locked and server-enforced. Ours is portable (on Arkiv/ENS) and enforced on-chain.

## Before kickoff

- [ ] RPC key (Alchemy / Infura) for Ethereum + Arbitrum + Sepolia
- [ ] Arkiv faucet + access key
- [ ] Check Chainwall contracts repo license (affects CROPS "O")
- [ ] Install Foundry (Anvil), Node, CRE CLI, Chainwall CLI
- [ ] Collect published Binance attack addresses (attacker, sweeper) with source links
- [ ] Booths to visit: OKcontract, Arkiv, EF (alt mempool team), Chainlink

## First 2 hours — de-risk before building

| # | Test | If it fails |
|---|---|---|
| 1 | 📕 fetch one real type-4 tx, recover the wallet with viem, confirm with `getCode` | check viem version (v2 vs v3 API) |
| 2 | 📕 write one entity to Arkiv testnet and read it back | ask at the Arkiv booth (write limits?) |
| 3 | 🔒 Chainwall on a local Arbitrum fork: one approved + one rejected action | ask the OKcontract team |
| 4 | 🚨 CRE CLI installed, template simulation runs | Chainlink booth |
