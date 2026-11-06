#!/usr/bin/env bash
# Start a local anvil fork of Whitechain testnet 1874 for the /defense demo.
# The fork carries the REAL deployed Chainwall contracts and tenant state; the demo
# executes the 7702-defense flow against them (no Safe required).
#
# Usage: scripts/defense-fork.sh   (leave running; the app talks to it on :8549)
set -euo pipefail
export PATH="$HOME/.foundry/bin:$PATH"

FORK_RPC_UPSTREAM="${WHITECHAIN_RPC:-https://rpc.ankr.com/whitechain_testnet}"
PORT="${DEFENSE_FORK_PORT:-8549}"

echo "Forking Whitechain testnet 1874 from $FORK_RPC_UPSTREAM on :$PORT ..."
exec anvil --fork-url "$FORK_RPC_UPSTREAM" --chain-id 1874 --port "$PORT"
