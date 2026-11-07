# Sweeper.sol

The malicious **delegate** contract from the Binance attack. After the victim is delegated to
it via EIP-7702, the victim account *runs this code as its own*, so calling a sweep function
drains the victim to a hardcoded attacker address.

This is the textbook "sweeper" shape The Blacklist flags: tiny, no owner/access checks, sends
everything to one hardcoded address.

> ⚠️ Sepolia test tokens only. Never deploy to mainnet.

## Constructor

```solidity
constructor(address attacker)
```
`ATTACKER` is immutable, fixed at deploy time. It must equal `ATTACKER_ADDR` in your `.env`.

## Functions

| Function | Effect (runs *as* the delegated victim) |
|---|---|
| `sweepToken(address token)` | Transfers the account's full ERC-20 balance of `token` to `ATTACKER`. |
| `sweepTokens(address[] tokens)` | Same, for several tokens. |
| `sweepNative()` | Sends the account's full ETH balance to `ATTACKER`. |
| `sweepAll(address[] tokens)` | Tokens then native, in one call, the full "empty the wallet". |

Events: `Swept(victim, token, amount)`, `SweptNative(victim, amount)`.

## How it's used in the sim

The demo delegates the victim to this contract, then the relayer calls `sweepToken(tUSD)` on
the victim address. Because the victim is delegated, `address(this)` inside the sweeper **is**
the victim, so `balanceOf(address(this))` is the victim's balance. See
[../attack/simulator.md](../attack/simulator.md).
