# OKcontract Chainwall (The Lock)

Chainwall is the product that powers [The Lock](../tracks/ef-lock.md). This is a reference for
integrating it; we don't ship its code (it's a separate repo/CLI).

## What it is

> "Execute only the actions you approve."

Treasury, protocol, vault, and smart-account teams define who can act, which contracts and
assets they can use, and what approval each action requires. Chainwall stores those settings in
contracts and re-reads them at execution. Before a protected account calls a protocol, the
submitted **function, arguments, value, deadline, operator, and account** must match the
approved action. A guarded Safe or Chainwall smart account rejects unsupported direct calls.

Stack: `Cells` (state runtime), `LambdaScript` (typed policies), `MiniScript` (on-chain workflows).

## Why it stops the attack

A stolen operator key can sign anything, but a 7702 self-delegation + arbitrary sweep is **not
a pre-approved action**, so the guarded account rejects it. This is OKcontract's own thesis:
*"Valid signatures are not enough."* A blanket address/method allowlist would fail; Chainwall
matches the decoded call *shape* and expected effects.

## Integration notes

- CLI: `okcontract/chainwall-cli-arbitrum` (preview, Arbitrum chain 42161).
  ```
  chainwall config set chain 42161
  chainwall config set rpc_url <local fork RPC>
  chainwall config set instance <REGISTRY_ADDRESS>
  ```
- Define users/operators, approved interactions (catalog, LambdaScript), policies, timelocks.
- Agent skill: `skills/chainwall-operations` (setup, policy authoring, approvals, execution, recovery).
- Passkey approvals use an externally hosted Chainwall approval app.
- Contracts repo: `okcontract/chainwall` (Solidity).

## License caveat (affects CROPS "O")

The Chainwall CLI is **BUSL-1.1**, not an OSI-approved open-source license. For the EF CROPS
track, your own code can be MIT, but state this trade-off honestly in the CROPS "O" line, and
check the **contracts** repo's license at kickoff.

## Demo setup

Run on a **local Arbitrum fork** (Anvil) so you can safely replay the attack against both an
unprotected EOA and a Chainwall-guarded account. Talk to the OKcontract team on site to confirm
fork setup. See [../tracks/ef-lock.md](../tracks/ef-lock.md).
