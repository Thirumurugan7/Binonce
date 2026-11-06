# Getting started

The app runs the **real** EIP-7702 attack on-chain. Two ways to run it.

## Local (recommended for demos — no gas, no faucet, offline)

Needs [Foundry](https://getfoundry.sh) (`anvil`) and Node 18+.

```bash
npm install
npm run chain        # terminal 1: anvil --hardfork prague  (real 7702 support, chainId 31337)
npm run setup        # terminal 2: deploys TestUSD + Sweeper, writes .env
npm run dev          # http://localhost:3000/attack  → click "Launch attack"
```

Every click uses a fresh victim (minted 2,500,000 tUSD) and drains it — repeatable, instant.
`/styleguide` shows the design system.

Why local for the pitch: it's real (real contracts, real 7702 delegation, real drain) **and**
can't fail on flaky conference wifi or a slow testnet. Judges reward a demo that actually works.

## Sepolia (public testnet proof)

```bash
export CHAIN_ID=11155111
export CHAIN_RPC="https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY"   # type-4 capable
export RELAYER_PK=0x...        # funded with Sepolia ETH
npm run setup        # deploys on Sepolia, writes .env
npm run dev
```

Keep a Sepolia run (or a recorded video of one) as the "it's real on a public chain" evidence,
and demo live on local anvil.

## What each command does

| Command | Does |
|---|---|
| `npm run chain` | starts anvil on the Prague hardfork |
| `npm run setup` | compiles + deploys `TestUSD` and `Sweeper`, writes `.env` (local: uses anvil's funded account) |
| `npm run dev` | the Next app; "Launch attack" hits `/api/run`, which runs `src/lib/attack.ts` on-chain |
| `npm run build` / `npm start` | production build / serve |

## Requirements

- Node 18+ (works on 20/22).
- Foundry/anvil for local mode. For Sepolia: a type-4-capable RPC + a funded relayer key.
- Versions pinned deliberately: **Next 14.2.35** (security), **viem 2.44.0** (stable `signAuthorization`).

More: [env-and-scripts.md](./env-and-scripts.md) · [../attack/simulator.md](../attack/simulator.md).
