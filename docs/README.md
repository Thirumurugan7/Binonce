# Docs

Documentation for the ETHGlobal Mumbai project, a Binance EIP-7702 attack replay,
defended by OKcontract Chainwall.

> **The Blacklist** knows who the thieves are · **The Lock** keeps the door shut · **The Alarm** spots the break-in.
> *A valid signature is not an approved action.*

## Map

| Folder | What's in it |
|---|---|
| [`tracks/`](./tracks) | The three ETHGlobal partner tracks we target, and submission rules |
| [`attack/`](./attack) | EIP-7702 explained, the Binance incident, how the simulator works |
| [`contracts/`](./contracts) | The Solidity (Sweeper, TestUSD, TestUSDC), how Chainwall stops 7702, the live [Whitechain deployment](./contracts/whitechain-deployment.md), and [frontend integration](./contracts/frontend-integration.md) |
| [`design/`](./design) | Design system / style guide and the UI-UX rationale |
| [`setup/`](./setup) | Getting started, environment, and the CLI scripts |

## The three parts

| Part | Built with | Partner track |
|---|---|---|
| 📕 The Blacklist | Arkiv (+ Swarm) | Arkiv, Mirror something Ethereum depends on |
| 🔒 The Lock | OKcontract Chainwall | Ethereum Foundation, Best CROPS App |
| 🚨 The Alarm | Chainlink CRE + LLM | Chainlink, Best workflow with CRE |

## Where to start

- New to the idea? → [`attack/eip-7702-explained.md`](./attack/eip-7702-explained.md)
- Running the demo? → [`setup/getting-started.md`](./setup/getting-started.md)
- Pitching the tracks? → [`tracks/overview.md`](./tracks/overview.md)
