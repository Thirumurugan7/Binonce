# 🔒 The Lock, Ethereum Foundation

**Track:** Best CROPS App · **Prize:** 1st $2,000 · 2nd $1,000 · 3rd $500
**Stretch:** Alt Mempool (EIP-8141), 1st $2,500 · 2nd $1,500 · 3rd $1,000

EF places each project in **at most one** EF prize. Submit to EF; judges pick the fitting track.
Build for CROPS; if the 8141 stretch works, you're also eligible for Alt Mempool.

**Simple version:** show the Binance attack draining an unlocked wallet, then failing against a wallet behind The Lock (Chainwall).

## Threat model (get this right, judges will ask)

- Funds in a **plain EOA** with a leaked key are gone; 7702 just makes the sweep easy.
- Our claim is **not** "Chainwall blocks 7702."
- Our claim **is**: funds behind Chainwall survive a stolen operator key, because every action
  must match a pre-approved action (function, args, value, deadline, operator, account).

This is OKcontract's own "Valid Signatures Are Not Enough" argument. See [../contracts/chainwall.md](../contracts/chainwall.md).

## What we build

On a local Arbitrum fork (Anvil):

1. **Unlocked:** EOA treasury with test funds → stolen key signs a 7702 delegation to the sweeper → drained.
2. **Locked:** same funds behind a Chainwall-guarded account → same stolen key, same sweep → **rejected**.
3. **Structural:** switch off our backend/UI → funds are still protected (the check is on-chain).

## CROPS checklist

- [ ] Public repo under FOSS license (MIT / Apache-2.0 / GPL / MPL)
- [ ] README a judge can run
- [ ] README section titled **CROPS**:
  - **C**, what we control that users depend on (Alarm, UI, RPC) and what happens if it's gone → The Lock's on-chain check still protects funds.
  - **O**, license + can users build/run from the repo alone. ⚠️ Chainwall CLI is BUSL-1.1 (not FOSS); state the trade-off honestly.
  - **P**, what our servers / RPC / indexers learn about the protected treasury.
  - **S**, key handling, trust assumptions. (Lead property.)
- [ ] Demo video ≤ 3 min showing the lead property at the moment it matters (backend off, attack still fails)
- [ ] No third-party trackers/analytics in the client
- [ ] Keys/personal data stay on device, or README says why not

## Stretch: Alt Mempool (EIP-8141)

The Lock built into the account itself: an 8141 account whose **validation** step checks the
Chainwall policy, so an unapproved tx is invalid before it's ever included. Reading external
policy state during validation is why it needs the alt mempool.

> "7702 let a stolen key install any code. 8141 lets an account refuse anything it didn't approve."

- [ ] Chainwall contracts (or a minimal reimplementation) on an 8141 devnet
- [ ] Link to an admitted tx on the devnet explorer, or code that submits one
- [ ] Team can explain design, code, trade-offs

Devnet explorer `https://altmempoolexplorer.forshtat.com` · Docs `https://docs.altmempool.wtf/`.
Talk to Pierre & Alex (alt mempool team) on site first. Only attempt if CROPS is done and a strong Solidity dev is free.

## The difference: Chainwall vs EIP-8141

- **EIP-8141** = an Ethereum protocol feature (native account abstraction): *how* an account decides validity.
- **Chainwall** = a product (contracts + CLI): *what* actions are allowed (catalog, policies, approvals, timelocks).
- They compose: Chainwall's rules, enforced by Ethereum's own validation = the stretch pitch.
