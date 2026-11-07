# Deploying the contracts

Both contracts (`TestUSD`, `Sweeper`) are compiled and deployed by **`npm run setup`**
(solc via npm, viem for the txs). It also writes `.env`. Sepolia or local anvil; the relayer pays gas.

## Local (default)

```bash
npm run chain        # anvil --hardfork prague
npm run setup        # deploys both contracts on the local chain, writes .env
```

`setup` uses anvil's funded account[0] as the relayer and generates a fresh attacker address.

## Sepolia

```bash
export CHAIN_ID=11155111
export CHAIN_RPC="https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY"
export RELAYER_PK=0x...        # funded with Sepolia ETH
npm run setup
```

## What gets deployed / who pays

| Thing | Payer | Notes |
|---|---|---|
| `TestUSD` | relayer | open-mint ERC-20 |
| `Sweeper(attacker)` | relayer | `ATTACKER` fixed at deploy; must equal `ATTACKER_ADDR` |
| mint + delegation + sweep (per run) | relayer | the attack itself; victim minted fresh each run |

The **victim needs no ETH**, the relayer pays all gas, and the victim is generated per attack run.

## Verify

After setup, `SWEEPER_ADDR`'s `ATTACKER()` returns your `ATTACKER_ADDR`. Launch an attack from the
UI (or hit `/api/run`); the stream shows the real delegation code `0xef0100 + sweeper` and the drain.

## RPC requirement

The RPC must support **type-4 (EIP-7702) transactions**. Local anvil on `--hardfork prague` does;
Alchemy/Infura Sepolia endpoints do.
