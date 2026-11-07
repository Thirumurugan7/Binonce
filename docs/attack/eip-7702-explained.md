# EIP-7702, explained

## The problem with a normal account

A normal Ethereum account (an EOA) is "valid" if its private key signed the transaction.
Whoever holds the key has total power. There are no rules the account can enforce on itself.

## What EIP-7702 adds

Shipped in Ethereum's Pectra upgrade (May 2025), EIP-7702 lets an EOA **temporarily run smart
contract code** by signing an *authorization* that delegates the account to a contract. After
delegation, the account executes that contract's code as if it were its own.

Mechanically:
- It's a new transaction type (**type 4**) carrying an `authorizationList`.
- Each authorization is scoped to a `chainId` and a `nonce`, and is signed by the account.
- Once applied, the account's on-chain code becomes the marker **`0xef0100` + the delegate
  contract address**. A normal EOA has empty code; a delegated one has this.
- Delegating to the zero address clears it (revokes).

## Why it's dangerous when a key leaks

7702 doesn't create the danger, a leaked key was always fatal, but it gives an attacker a
clean "sweep button": delegate the victim to a drainer contract, then call it. Wintermute
reported that most early 7702 delegations pointed to malicious draining contracts.

## The nonce detail (important for the demo)

An authorization only applies if its `nonce` matches the account's **current** nonce when the
delegation transaction lands. To guarantee a hit without knowing the exact nonce at mining
time, an attacker signs **many authorizations at consecutive nonces**, the Binance attacker
used **50**. Exactly one matches and takes effect; the other 49 are a safety net.

> It is NOT 50 keys being guessed. It's one stolen key signing 50 nonces.

## How you detect it

- `eth_getCode(account)` → starts with `0xef0100` means it's delegated (and the rest is the delegate address).
- Read type-4 transactions and recover the signer of each authorization (`recoverAuthorizationAddress`).
- Watch `Transfer` events right after a delegation to catch a drain.

This is exactly what [The Blacklist](../tracks/arkiv-blacklist.md) and [The Alarm](../tracks/chainlink-alarm.md) do.

## Related

- [binance-incident.md](./binance-incident.md), the real attack we replay
- [simulator.md](./simulator.md), how our Sepolia replay works
- [../tracks/ef-lock.md](../tracks/ef-lock.md), EIP-8141, the future-proof defense
