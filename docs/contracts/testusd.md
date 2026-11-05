# TestUSD.sol

A minimal, openly-mintable ERC-20 standing in for the USDT/USDC the Binance attacker drained.
6 decimals, like USDC/USDT. No real value.

## Why it exists

The demo needs a token in the victim wallet to drain. Rather than source real Sepolia test
stablecoins, we ship our own so anyone can mint freely.

## Functions

| Function | Notes |
|---|---|
| `mint(address to, uint256 amount)` | **Open mint** — anyone can mint. Test token only. Used by `scripts/fund.mjs`. |
| `transfer`, `approve`, `transferFrom` | Standard ERC-20. |
| `balanceOf`, `allowance`, `totalSupply` | Standard views. |

`amount` is in base units (6 decimals): 1,000,000 tUSD = `1000000_000000`.
`scripts/fund.mjs` handles the decimals for you (`npm run fund 1000000`).

## In the sim

`fund.mjs` mints to the victim; the sweeper drains it to the attacker; the UI reads
`balanceOf(victim)` before/after. See [deployment.md](./deployment.md).
