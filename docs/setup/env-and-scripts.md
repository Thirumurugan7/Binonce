# Environment & scripts

`npm run setup` **writes `.env` for you**. You rarely edit it by hand.

## `.env` (written by setup)

| Var | Meaning |
|---|---|
| `CHAIN_RPC` | RPC URL (default `http://localhost:8545`) |
| `CHAIN_ID` | `31337` local anvil, `11155111` Sepolia |
| `RELAYER_PK` | key that broadcasts + pays gas (local: anvil account[0]) |
| `ATTACKER_ADDR` | receives drained funds (generated if not provided) |
| `TUSD_ADDR` | deployed TestUSD |
| `SWEEPER_ADDR` | deployed Sweeper (its `ATTACKER` = `ATTACKER_ADDR`) |

The victim is **not** in `.env`, a fresh one is generated per attack run so the demo repeats.

### To target Sepolia, set these *before* `npm run setup`:

```bash
export CHAIN_ID=11155111
export CHAIN_RPC="https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY"
export RELAYER_PK=0x...     # funded with Sepolia ETH
# ATTACKER_ADDR optional
```

## Scripts

| Command | What it does |
|---|---|
| `npm run chain` | `anvil --hardfork prague` (local chain with real 7702) |
| `npm run setup` | deploy contracts + write `.env` (local or Sepolia per env) |
| `npm run dev` | the app (UI + `/api/run` real-attack SSE + `/api/config`) |
| `npm run build` / `npm start` | production build / serve |

## Safety notes

- Local anvil + test tokens have no value. The contracts carry "do not deploy to mainnet" warnings.
- `.env` is gitignored. On local, `RELAYER_PK` is anvil's well-known test key, never reuse it with real funds.
- Only the relayer needs gas; the per-run victim needs none (the relayer broadcasts the delegation).

## How a run executes

`/api/run` → `src/lib/attack.ts`:
fresh victim → mint 2.5M tUSD → sign 50 authorizations → broadcast type-4 tx → verify `0xef0100`
delegation → `sweepToken` → drained. Real tx hashes/blocks stream to the UI. Chain comes from
`src/lib/chain.ts` (env-driven). No mock path, it's the real attack every time.
