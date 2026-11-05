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

> A valid signature is not an approved action.
