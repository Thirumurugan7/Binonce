# The Binance incident (Oct 29 2026)

The attack this project replays. Figures below are from public post-mortems (Blockaid,
Fireblocks, TRM Labs, TechFlow) and vary slightly between sources, cite the source when you quote a number.

## What happened

- On **Oct 29 2026**, roughly **$6.3B** was drained from Binance hot wallets across ~10
  blockchains, most of it in about **20 minutes**.
- On Ethereum, the core target was **Binance 14** (`0x28C6c06298d514Db089934071355E5743bf21d60`),
  one of Binance's largest hot wallets. About **$2.5B** left it in a single transaction.
- Root cause (preliminary, per Binance): a **compromised DevOps laptop** leaked signing ability.

## The EIP-7702 mechanism

- At ~20:20 UTC the attacker broadcast one transaction carrying **50 EIP-7702 authorizations**,
  all signed with Binance 14's key, for **nonces 18,914,775 … 18,914,824**.
- The matching nonce delegated Binance 14 to a **sweeper** contract.
- ~3 minutes later the attacker called the sweeper and drained the wallet.
- Activity spread to Binance-controlled wallets on Optimism, Arbitrum, Avalanche and more.

## The lesson for the pitch

Security engineers noted that 7702 wasn't strictly necessary, a leaked key can drain an EOA
anyway, but it gave "a handy sweep button." The real lesson:

> Funds in a plain EOA are only as safe as the key. Put them behind a policy that enforces
> *what* can happen (The Lock), so a stolen key alone isn't enough.

## Context: agent payments & security are converging

x402 (agent payments) is now under the Linux Foundation; AWS and Google ship agent-payment
controls. The industry is actively building "spending limits + approvals for autonomous
actors", which is the same shape as The Lock, and proof the problem is real.

## Sources to cite

- TechFlow, Binance attack timeline & breach sequence
- Blockaid / Fireblocks, EIP-7702 attack-chain analysis
- Cointelegraph, EIP-7702's role in the hack
