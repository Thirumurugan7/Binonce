# TestUSDC.sol

A minimal, openly-mintable ERC-20 **test stablecoin** (6 decimals, like real USDC) deployed on
**Whitechain Testnet**. It is the governed asset for the Chainwall (defense) treasury vault.

Source: [`contracts/whitechain/TestUSDC.sol`](../../contracts/whitechain/TestUSDC.sol).

## Why it exists

Whitechain testnet has **no official stablecoin**, Circle/Tether don't deploy to testnets. So we
ship our own: a clean, source-verified `USDC` with an open mint, owned (deployed) by our tenant owner
rather than the leftover offense `tUSD`. It gives the Chainwall policy demo a real ERC-20 to govern.

## Deployment (Whitechain Testnet, chain 1874)

| | |
|---|---|
| **Address** | `0x1d9F8351F788278D3E181908cEE14c7F5766157F` |
| **Name / Symbol** | Test USD Coin / `USDC` |
| **Decimals** | 6 |
| **Deployer** | `0x3ae7F2767111D8700F82122A373792B99d605749` (keystore `wc-owner`) |
| **Deploy tx** | `0x85dceae78e6b89dbc7550987267d4994fc8b286a28f8bfa67194a8217a9fcec7` |
| **Initial mint** | 10,000,000 USDC → deployer (tx `0x1b418c0fc2d2e64ee10a626e37f04facdc5acc0d340817ecfef6d695f0f676ae`) |
| **Explorer (verified)** | https://explorer.testnet.whitechain.io/address/0x1d9F8351F788278D3E181908cEE14c7F5766157F |

The contract source is **verified on the Whitechain Blockscout explorer** (`Pass - Verified`).

## Functions

| Function | Notes |
|---|---|
| `mint(address to, uint256 value)` | **Open mint**, anyone can mint. Test token only. |
| `transfer`, `approve`, `transferFrom` | Standard ERC-20 (`transfer`/`transferFrom` return `bool`). |
| `balanceOf`, `allowance`, `totalSupply`, `name`, `symbol`, `decimals` | Standard views. |

`value` is in base units (6 decimals): 10,000,000 USDC = `10000000_000000` (`1e13`).

## Deploy / mint / verify (reproduce)

```sh
# deploy (minimal foundry project; signer = Foundry keystore 'wc-owner')
forge create src/TestUSDC.sol:TestUSDC \
  --rpc-url https://rpc.testnet.whitechain.io \
  --account wc-owner --password-file ~/.config/chainwall-wc.pw --broadcast

# mint 10,000,000 USDC to the owner
cast send <TOKEN> "mint(address,uint256)" <OWNER> 10000000000000 \
  --rpc-url https://rpc.testnet.whitechain.io --account wc-owner --password-file ~/.config/chainwall-wc.pw

# verify source on Blockscout
forge verify-contract <TOKEN> src/TestUSDC.sol:TestUSDC \
  --verifier blockscout --verifier-url https://explorer.testnet.whitechain.io/api/ \
  --compiler-version 0.8.26 --num-of-optimizations 200 --watch
```

Compiler: solc **0.8.26**, optimizer **200 runs**.

## In the defense flow

This USDC is the token the **Chainwall** treasury vault holds and the `treasury-2of2` policy governs.
The full live deployment (Registry, Interact, policy, this token) is documented in
[whitechain-deployment.md](./whitechain-deployment.md). The relationship to the attack token
(`TestUSD` / `tUSD`) is in [testusd.md](./testusd.md); the defense mechanism is in
[how-chainwall-stops-7702.md](./how-chainwall-stops-7702.md).
