# How Chainwall stops the EIP-7702 attack

Analysis of the real [`okcontract/chainwall`](https://github.com/okcontract/chainwall) contracts
(v2, external audit ongoing, expected Dec 2026). This is the technical backbone of
[The Lock](../tracks/ef-lock.md) and the claim behind our pitch line.

## The key realization

Chainwall contains **no EIP-7702 / delegation / `0xef0100` code anywhere** (grep the repo —
nothing). It doesn't block the 7702 opcode. It makes 7702 **irrelevant** by removing every link
in the Binance attack chain. That's the honest, defensible framing — and it's stronger than
"we detect 7702," because there's nothing to bypass.

### The Binance chain, and why each link breaks

The Binance drain needed: **(a)** funds in an **EOA**, **(b)** a stolen key, **(c)** 7702 to
delegate the EOA to a sweeper, **(d)** an arbitrary call to move the funds out.

| Link | In the Binance hack | Under Chainwall |
|---|---|---|
| (a) funds in an EOA | Binance 14 was an EOA hot wallet | Funds live in a **contract** vault — `OKAccount` (ERC-1967 proxy) or a guarded Gnosis **Safe** |
| (c) 7702 delegation | Signed authorization delegated the EOA | **EIP-7702 only delegates EOAs.** A contract vault has no signing key to authorize a delegation — there is nothing to attach a sweeper to |
| (b)+(d) stolen key → arbitrary transfer | Key signed the sweep directly | A stolen operator key **can't express an arbitrary transfer** — see below |

## Why a stolen operator key can't drain the vault

Chainwall has two vault modes; both refuse arbitrary calls.

### Safe mode — `OKGuard`

`OKGuard` is a Gnosis Safe transaction guard. Its `checkTransaction` runs **before** any Safe
execution and enforces:

- For a `CALL`: `require(to == INTERACTION)` — the only allowed target is the bound `Interact`
  contract, and only specific selectors (`execute`, `directExecute`, `approveAndExecute`, …).
- For a `DELEGATECALL`: only one approved `SafeSingletonMigrator` selector.
- Safe-level gas refunds are forbidden (they'd be an independent value channel).
- `checkAfterExecution` reverts if the inner call failed, so everything rolls back atomically.

From the contract's own docs:

> "Even if Safe owners have enough signatures, the Safe must still route execution through
> `Interact`… a tenant Safe cannot quietly send arbitrary transactions to unregistered
> contracts."

So even with a **stolen owner key and enough signatures**, an attacker's "transfer everything to
me" transaction reverts with `Guard: wrong target`. It never reaches the token.

### Account mode — `OKAccount`

`OKAccount.executeInteraction` reverts `InteractOnly()` unless the caller is the bound `Interact`,
then runs **only a pre-registered script, looked up by `interactionId`** from the registry, via
the canonical MiniScript engine. There is **no path that accepts arbitrary calldata**. A
drain-to-attacker is not a registered interaction, so it cannot be expressed.

## Only pre-approved actions execute

`Interact` loads the interaction script from the registry by id and runs it through the
MiniScript engine with a `SubjectContext { actor, policyId, vault, nativeValue, … }`. The engine
enforces a step cap and a `maxNativeValue` ceiling. Actors must satisfy a policy
(`canUserSatisfyPolicy`). The attacker would need a **registered interaction** that sends funds
to their address — which doesn't exist.

## And they can't quickly register one

Adding an approved contract, interaction, or policy, or changing group membership, routes through
**category timelocks and linked reviews** (`RegistryTimelockFacet`, `GroupGovernanceLib`).
Admins / `PAUSE_OPERATOR` can pause registry writes. So an attacker can't register a malicious
interaction and immediately use it — there's a mandatory delay and review window during which the
breach can be caught (this is where [The Alarm](../tracks/chainlink-alarm.md) fits).

## The precise pitch

> Binance 14 was an EOA, so a stolen key plus EIP-7702 was enough to install a sweeper and empty
> it. Chainwall holds funds in a contract vault, so there is no EOA for 7702 to hijack — and even
> a stolen operator key can only trigger **pre-approved** actions through `Interact`, never an
> arbitrary transfer. **A valid signature is not an approved action.**

Do **not** say "Chainwall blocks EIP-7702" — it doesn't, and a sharp judge will catch it. Say it
removes the EOA and the arbitrary-call path the attack depends on.

## How to show it in the demo

1. **Unprotected (Binance replay):** EOA hot wallet → stolen key signs 50 authorizations →
   delegated to sweeper → drained. (This is our Sepolia simulator.)
2. **Protected (The Lock):** same funds in a Chainwall-guarded Safe. The "attacker" holds a
   stolen owner key and submits an `execTransaction` that transfers the tokens to themselves →
   **`OKGuard` reverts `Guard: wrong target`.** And note on stage: 7702 can't even be applied to
   the Safe, because it's a contract.
3. Optionally: try to route a fake interaction through `Interact` → rejected (not a registered/
   approved interaction).

Run the protected side on a **local Arbitrum fork** (Anvil); the CLI is Arbitrum-only. Talk to
the OKcontract team to confirm fork setup.

## Build notes (from the repo)

- Solidity `0.8.36`, built with **oksolc `0.8.36+oksolc.0.2.3`** (`FOUNDRY_SOLC`), Foundry, IR optimizer.
- Submodules: `openzeppelin-contracts-upgradeable`, `safe-contracts` (+ nested `openzeppelin-contracts`).
- License: **BUSL-1.1** (source-available, converts to GPL-3.0 after 4 years). Production use only
  via official factories. Review/compile/modify/audit is permitted — fine for a hackathon. This is
  the license caveat to disclose in the EF CROPS "O" line.
- Architecture: `OKFactory` (3-stage tenant deploy) · `RegistryDiamond` (directory/authority/catalog,
  timelocked) · `Interact` + `MiniScriptEngine` (proposals, approvals, policy execution) ·
  `SafeFactory`/`AccountFactory` → `OKGuard`/`OKModule` or `OKAccount` · optional WebAuthn passkey accounts.
