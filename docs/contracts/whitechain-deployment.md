# Whitechain Testnet, Chainwall defense deployment

The live defense stack is deployed on **Whitechain Testnet (chain ID `1874`)** and driven through the
**`chainwall` CLI** (v0.3.1). This records every address, transaction, and command so the deployment
is reproducible.

- **RPC:** `https://rpc.testnet.whitechain.io`
- **Explorer:** https://explorer.testnet.whitechain.io/ (Blockscout)
- **Gas token:** WBT (18 decimals). Faucet: https://faucet.testnet.whitechain.io
- **CLI profile:** `whitechain` (`chainwall config use whitechain`)

## Why Whitechain

Whitechain testnet (an OP-Stack L2) already has the infrastructure Chainwall needs, **Safe 1.3.0**,
**EntryPoint v0.6/0.7/0.8**, the Safe ProxyFactory, and Multicall3, and it executes **EIP-7702**
type-4 transactions, so both the attack and the defense run on one chain.

## Addresses

### Chainwall tenant (deployed via OKFactory)

| Component | Address |
|---|---|
| OKFactory | `0xDF90AEF59705D755f24562133acDE2a033B3F7D7` |
| **Registry** | `0x7c04a72db4f422fab4d1c94067b6a8cdac6bbb74` |
| **Interact** (engine) | `0xE389bE2d72c618290E1AdFF7B8BbEE39eC356e45` |
| **MiniScript** (VM) | `0x16c951D126e3751131e6EBAdEfA89323E07BE747` |
| **AccountFactory** (OKAccount vaults) | `0x0bC035AC5477A0a8ed170fa87f4fe7E9aCcBaF4b` |
| Owner / deployer | `0x3ae7F2767111D8700F82122A373792B99d605749` (keystore `wc-owner`) |

Deploy salt: `chainwall-defense-v1`. Stage txs, bootstrap `0xe352d0b2…`, prepare `0x5f0b92ce…`,
finalize `0x1dd38972…`. Terms accepted: tx `0x24d5bb6e…` (initial-terms hash
`0xc0d0b6034b7971648ff8332f4002119b0b39358ce84d4865a90101fc2220ab80`).

### Governed token

| | Address |
|---|---|
| **TestUSDC** (`USDC`, 6 dp) | `0x1d9F8351F788278D3E181908cEE14c7F5766157F` |

Source + reference: [testusdc.md](./testusdc.md) · [`contracts/whitechain/TestUSDC.sol`](../../contracts/whitechain/TestUSDC.sol).

### Policy & group

| | ID |
|---|---|
| Policy `treasury-2of2` | `0xc98ecb15490603d72371a92cba6d9550ab1b8ca0e88b45df76cd1039f9249ff7` |
| Group `treasury` | `0xcbd818ad4dd6f1ff9338c2bb62480241424dd9a65f9f3284101a01cd099ad8ac` |
| Members | `0x3ae7F2…605749` (owner) + `0xcBAee4793486f3Df37dbb584F5a3610ff581A614` |
| Criteria | `[treasury]` × `[2]` → **2 approvals from the treasury group** |

## How it was deployed (reproduce)

```sh
# 0. point the CLI at Whitechain testnet
chainwall profile create whitechain && chainwall profile use whitechain
chainwall config set chain 1874
chainwall config set rpc_url https://rpc.testnet.whitechain.io
chainwall config set factory 0xDF90AEF59705D755f24562133acDE2a033B3F7D7

# 1. import the owner key into the Foundry keystore (signer for the CLI)
cast wallet import wc-owner --interactive          # or --private-key / --unsafe-password

# 2. deploy the tenant (bootstrap -> prepare -> finalize)
chainwall deploy --owner 0x3ae7F2767111D8700F82122A373792B99d605749 \
  --salt chainwall-defense-v1 --no-auth-accounts \
  --account wc-owner --password-file ~/.config/chainwall-wc.pw --out deployment.json --json
chainwall login 0x7c04a72db4f422fab4d1c94067b6a8cdac6bbb74

# 3. accept terms (required before any catalog write)
chainwall terms document --ipfs-gateway https://gateway.pinata.cloud/ipfs --out factory-terms.md
chainwall terms accept-terms --document-file factory-terms.md --account wc-owner --password-file ~/.config/chainwall-wc.pw

# 4. users -> group -> 2-of-2 policy
A1=0x3ae7F2767111D8700F82122A373792B99d605749
A2=0xcBAee4793486f3Df37dbb584F5a3610ff581A614
chainwall users add $A1 --account wc-owner --password-file ~/.config/chainwall-wc.pw
chainwall users add $A2 --account wc-owner --password-file ~/.config/chainwall-wc.pw
GROUP=$(chainwall id treasury);  POLICY=$(chainwall id treasury-2of2)
chainwall groups add $GROUP        --account wc-owner --password-file ~/.config/chainwall-wc.pw
chainwall groups add-member $GROUP $A1 --account wc-owner --password-file ~/.config/chainwall-wc.pw
chainwall groups add-member $GROUP $A2 --account wc-owner --password-file ~/.config/chainwall-wc.pw
chainwall policies add $POLICY "[$GROUP]" "[2]" --account wc-owner --password-file ~/.config/chainwall-wc.pw

# 5. deploy + verify the governed USDC  (see testusdc.md)
```

## Requirements / gotchas

- **Foundry ≥ 1.8.6**, the CLI builds `cast send --data`, which older `cast` (1.5.1) rejects.
  Install with `foundryup -i 1.8.6`.
- The initial-terms document is on IPFS; the default `ipfs.io` gateway was down, use
  `--ipfs-gateway https://gateway.pinata.cloud/ipfs`.
- Registry writes by the bootstrap owner apply **directly** (no timelock) while
  `bootstrapFinalized == false`.

## Status (verified)

`chainwall status` reports: `installed`, not paused, terms accepted, `users: 2`, `policies: 1`.
The policy reads back as `policy-exists → true`, `get-policy-criteria → [[treasury],[2]]`.

## Next steps (to govern money with the policy)

1. Register `TestUSDC` in the Registry (`tokens configure` / `addContractVersion`).
2. Publish the transfer interaction (`interactions add transfer.ls`) bound to `treasury-2of2`.
3. Create a vault (`accounts create`) and fund it with USDC.
4. Run an operation (`operations propose → approve → execute`) requiring the 2-of-2.

See [chainwall.md](./chainwall.md) and [how-chainwall-stops-7702.md](./how-chainwall-stops-7702.md).
