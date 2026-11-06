# Chainwall Lambdascript policies

The `.ls` files here are the **Lambdascript** source for this tenant's Chainwall
**interaction** and **policy programs**. Lambdascript is never called from the
app's TypeScript — it is compiled to **MiniScript** bytecode, stored **on-chain**
(attached to a policy / interaction), and executed by the MiniScript VM **during
the on-chain `execute`** of an operation.

```
Lambdascript (.ls, here)
   └─ compiled → MiniScript bytecode (chainwall CLI)
        └─ stored on-chain, attached to a policy / interaction
             └─ runs in the MiniScript VM when an operation EXECUTES
                  └─ a failed $require → the tx reverts (e.g. ERR_01)
```

The app (`/defense`, `/demo`) only **submits** operations (propose / approve /
execute). The constraints below run on-chain.

## Files → on-chain (Whitechain testnet 1874)

| File | What it is | On-chain id | Used by |
|---|---|---|---|
| `transfer.interaction.ls` | The interaction: an ERC-20 transfer of `demo/usdc` out of the vault | interaction `0xc918a5f1…38222a` | all policies route through it |
| `treasury-2of2.cap.ls` | **Spending-cap** program, 1,000,000 USDC | policy `0xc98ecb15…49ff7` (2-of) | **the running app** — embedded multisig console (`/demo`) |
| `tier-low.cap.ls` | Cap program, amount **< 50,000 USDC** | policy `0xd5219ccb…17570a` (2-of) | on-chain only (not wired to a page yet) |
| `tier-high.cap.ls` | Cap program, amount **≥ 50,000 USDC** | policy `0xfb0a367c…b5b3bbe` (3-of) | on-chain only (not wired to a page yet) |

Shared addresses: vault `0x371B4E49…C1A1`, token `demo/usdc` = TestUSDC
`0x1d9F8351…6157F` (6 dp), MiniScript VM `0x16c951D1…BE747`.

## What actually runs in the app today

- **The 2-of-2 multisig console** (the `/demo` page, embedded at the bottom of
  `/defense`) is the only place a Lambdascript program is exercised: propose
  `1,500,000` USDC → both signers approve → execute → `treasury-2of2.cap.ls`
  reverts **`ERR_01`** → *"Refused by policy — over the 1,000,000 USDC cap."*
- **The main `/defense` 7702 flow does NOT use Lambdascript.** It uses the
  `operator-1of` policy (`0x16c6cdf0…817772`), a plain **1-of threshold with no
  program**. Its refusal is a **signature check** (`_requireActorUsable` →
  `InvalidActorSignature` when the signer is 7702-delegated), not a policy program.

## Reference: Lambdascript used here

- `$subjectVault`, `$subjectPolicy`, `$subjectId` — the operation's vault / policy /
  interaction id (bind the program to exactly one context).
- `$subjectNativeValue` — wei sent (0 for ERC-20 transfers).
- `$subjectArgCount`, `$subjectArg(i)` — the operation's args; here
  `$subjectArg(1)` is the transfer **amount** (base units, 6 dp).
- `$arg0`, `$arg1` — the interaction's raw args (recipient, amount).
- `@token(path).transfer(...)` — the actual token move in the interaction.
- `$require(expr)` — the operation reverts if `expr` is false.

## Compile / deploy (chainwall CLI)

These were authored and set on-chain via the CLI (not from the app):

```sh
# interaction
chainwall interactions add 0xc918a5f1…38222a \
  --source contracts/policies/transfer.interaction.ls \
  --vault 0x371B4E49…C1A1 --account wc-owner

# policy program (spending cap) — e.g. the 2-of-2 cap
chainwall policies program 0xc98ecb15…49ff7 \
  --source contracts/policies/treasury-2of2.cap.ls --account wc-owner

# inspect / disassemble what is live on-chain
chainwall compile contracts/policies/treasury-2of2.cap.ls
chainwall disasm <bytecode>
```

> These `.ls` files reproduce the programs that are live on-chain; the canonical
> artifact is the MiniScript bytecode attached to each policy/interaction, which
> you can read back with `chainwall disasm`.

### Note on compiling

The three `*.cap.ls` policy programs compile standalone:

```sh
chainwall compile contracts/policies/treasury-2of2.cap.ls   # → 0x0106...
```

`transfer.interaction.ls` references `@token(demo/usdc).transfer(...)`, so it
compiles only in the tenant context where `demo/usdc` is a registered token (the
CLI needs its ABI). That's expected — it's an interaction, not a standalone policy.

Lambdascript has **no comment syntax** — these files are pure code; all
documentation lives in this README.
