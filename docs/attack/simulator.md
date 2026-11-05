# The attack (real, on-chain)

This is **not** a scripted animation. "Launch attack" executes the Binance EIP-7702 drain on a
real EVM — local anvil (Prague) by default, or Sepolia — and streams real tx hashes and blocks.
Code: `src/lib/attack.ts` (run by `/api/run`). Chain selection: `src/lib/chain.ts`.

## Actors

| Actor | Role |
|---|---|
| **Victim** | Fresh EOA **per run**, minted 2,500,000 tUSD. Stands in for Binance 14; its key is the "stolen" one. |
| **Relayer** | Broadcasts the txs, pays gas. Only account that needs ETH (local: anvil account[0]). |
| **Attacker** | Fixed address (from setup) that receives the drain; the Sweeper's immutable `ATTACKER`. |
| **Sweeper** | Deployed contract; once the victim is delegated to it, calling it drains the victim. |

A fresh victim each run makes the demo repeatable — click "Launch attack" as many times as you like.

## The flow (what actually happens on-chain)

1. **Mint.** Relayer mints 2,500,000 tUSD to the fresh victim (open-mint test token).
2. **Sign 50 authorizations** at consecutive nonces (`start … start+49`), all delegating the
   victim to the sweeper.
3. **Broadcast from the relayer.** One real type-4 transaction carries all 50. Broadcasting from
   a *separate* account means the victim's nonce only advances via the authorization — like the
   real hack's separate broadcaster.
4. **One nonce matches.** Verified on-chain: `getCode(victim)` now returns `0xef0100` + the
   sweeper address.
5. **Drain.** Relayer calls `sweepToken(tUSD)` on the victim (now running sweeper code) → balance
   moves to the attacker. Confirmed by reading balances before/after.

> The 50 is a nonce safety net to guarantee one lands — not 50 keys, not guessing.

## Proof it's real

A run on local anvil produces, e.g.:
```
victim code after delegation: 0xef01000165878a594ca255338adfa4d48449f69242eb8f
victim balance after:  0 tUSD
attacker balance after: 2500000 tUSD
```
Real delegation marker, real drain. The same code runs on Sepolia (`CHAIN_ID=11155111`).

## Why a separate relayer

If the victim both signed and broadcast, the transaction itself would consume a nonce and muddy
the authorization bookkeeping. A separate relayer keeps the victim's nonce advancing only through
the applied authorization — matching the incident and keeping the flow clean.

## viem gotcha

In viem 2.44 the signed authorization's field is **`address`** (output) although the input
parameter is **`contractAddress`**. Keep that straight in the Blacklist importer too.

## Event stream → UI

`attack.ts` emits `setup`, `before`, `sign`, `sign-progress`, `sign-done`, `delegate*`, `verify`,
`sweep*`, `after`, `done`. `/api/run` streams them as SSE; the dashboard drives the nonce grid,
the alert, toasts and the balance tween from them. See [../design/ui-ux.md](../design/ui-ux.md).
