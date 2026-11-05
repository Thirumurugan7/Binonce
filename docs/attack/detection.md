# Detecting 7702 delegations & labeling sweepers

How The Blacklist and The Alarm find and judge delegate contracts. No manual lookups — a
script does it; only the handful of confirmed-attack addresses are hand-added.

## Finding delegations

Every 7702 delegation is a **type-4** transaction with an `authorizationList`. Scan blocks and
keep type-4 txs. For each authorization:

```ts
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { recoverAuthorizationAddress } from "viem/utils"; // v3: Authorization.recoverAddress

const client = createPublicClient({ chain: mainnet, transport: http(RPC_URL) });
const block = await client.getBlock({ blockNumber, includeTransactions: true });

for (const tx of block.transactions) {
  if (tx.type !== "eip7702") continue;
  for (const auth of tx.authorizationList) {
    const wallet = await recoverAuthorizationAddress({ authorization: auth });
    const delegate = auth.address;                  // the contract delegated to
    const code = await client.getCode({ address: delegate });
    // classify `code`, store { wallet, delegate, label } on Arkiv
  }
}
```

(Confirm exact function names against the viem version at kickoff — v2 vs v3 differ.)

## Verifying it actually applied

An authorization can be in a tx but fail (wrong nonce/chain). After recovering the wallet,
confirm with `eth_getCode(wallet)`:
- empty → not delegated
- `0xef0100` + address → delegated to that address
- delegation to the zero address → revoked

## Deciding the label (strongest → weakest)

1. **`confirmed-thief`** — address appears in a published attack (e.g. the Binance sweeper). Hand-added with a source link.
2. **`likely-thief`** — many wallets that delegated to it had funds sent to one same address within minutes (read `Transfer` events after the delegation block).
3. **`suspicious`** — bytecode heuristics / LLM: tiny, no owner checks, forwards everything to one hardcoded address.
4. **`known-good`** — official wallet implementations (MetaMask, Coinbase, Ambire …).
5. **`unknown`** — insufficient info.

Heuristics have false positives, which is why "suspicious" ≠ "thief." Only (1) is asserted as confirmed.

## Practical limits

- Don't scan all history — pick a recent range + the Binance block range, then follow new blocks.
- Use a free Alchemy/Infura key to avoid public-RPC rate limits.
- Ethereum first; add Arbitrum only if time allows.
