# Why Arkiv (vs a plain database)

The Blacklist is a warning list that wallets, exchanges and The Alarm check **before** trusting a
7702 delegate. For that job, where it lives matters as much as what's in it.

## Permissionless reads
Anyone can query the registry directly from the chain with `@arkiv-network/sdk` or JSON-RPC — no API
key we hand out, no account, no rate-limit we control. A wallet can check a delegate at signing time
without asking us for access. A Postgres behind our API is exactly the single point we don't want a
safety list to depend on.

## Can't be quietly taken down or edited
Entities are owned by a wallet and live on Arkiv's chain. We can't silently delete or rewrite a
flag to protect someone, and no one can pressure a server operator to do it either. Changes are
transactions: they're visible, attributable and ordered. A warning list that can be quietly
censored isn't trustworthy.

## Wallet-signed provenance
Every entry is signed by our writer wallet (`0x7264fB117ce777888B1bD2eF66ED0CF4CA14B4a9`) and
stamped with a block. A consumer can see *who* asserted a label and *when*, and weight it
accordingly — instead of trusting an anonymous row in someone's database. Multiple importers can
publish to the same schema and be told apart by owner.

## Verifiable, reproducible data
Each delegate entry stores `bytecodeHash` and the delegator count from a public scan. Anyone can
re-fetch `eth_getCode`, recompute the hash, and re-run `npm run import` to reproduce the labels.
The data isn't a claim to take on faith; it's a pointer back to public chain state.

## Right-sized storage
These are small, queryable, independently-owned rows with a natural TTL — exactly Arkiv's model.
We index the fields consumers filter on (`chain`, `address`, `label`, wallet owner) and let entries
expire (180 days) unless refreshed, so a stale flag doesn't live forever by default.

## What a plain DB would cost us
A hosted DB would give faster writes and ad-hoc SQL, but it would reintroduce the single operator,
the access gate, the silent-edit risk, and "trust us" provenance — the very properties a public
abuse-registry exists to avoid. Arkiv trades a little write latency for reads nobody can revoke and
history nobody can quietly rewrite.
