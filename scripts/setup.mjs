// setup.mjs — deploy TestUSD + Sweeper and write .env. Works for local anvil (default)
// or Sepolia (set CHAIN_ID=11155111, CHAIN_RPC, RELAYER_PK to a funded key).
//
//   npm run setup
//
// Local default: relayer = anvil account[0] (funded), attacker = a fresh address.
import "dotenv/config";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { sepolia } from "viem/chains";
import solc from "solc";

const CHAIN_ID = Number(process.env.CHAIN_ID || 31337);
const CHAIN_RPC = process.env.CHAIN_RPC || "http://localhost:8545";
// anvil account[0] — deterministic, funded with 10000 ETH on a local chain
const ANVIL_PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const chain = CHAIN_ID === 11155111 ? sepolia : defineChain({
  id: CHAIN_ID, name: CHAIN_ID === 31337 ? "anvil" : `chain-${CHAIN_ID}`,
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [CHAIN_RPC] } },
});

const relayerPk = process.env.RELAYER_PK || (CHAIN_ID === 31337 ? ANVIL_PK : null);
if (!relayerPk) { console.error("Set RELAYER_PK (a funded key) for a non-local chain."); process.exit(1); }
const relayer = privateKeyToAccount(relayerPk);
const attacker = process.env.ATTACKER_ADDR || privateKeyToAccount(generatePrivateKey()).address;

const pub = createPublicClient({ chain, transport: http(CHAIN_RPC) });
const wallet = createWalletClient({ account: relayer, chain, transport: http(CHAIN_RPC) });

function compile(file, name) {
  const source = readFileSync(new URL(`../contracts/${file}`, import.meta.url), "utf8");
  const input = { language: "Solidity", sources: { [file]: { content: source } },
    settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } } };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  if (out.errors?.some((e) => e.severity === "error")) { console.error(out.errors.map((e) => e.formattedMessage).join("\n")); process.exit(1); }
  const c = out.contracts[file][name];
  return { abi: c.abi, bytecode: "0x" + c.evm.bytecode.object };
}

async function main() {
  try { await pub.getBlockNumber(); }
  catch { console.error(`Can't reach ${CHAIN_RPC}. For local: run \`npm run chain\` in another terminal first.`); process.exit(1); }

  const bal = await pub.getBalance({ address: relayer.address });
  console.log(`chain ${CHAIN_ID} · relayer ${relayer.address} · balance ${bal} wei`);
  if (bal === 0n) { console.error("Relayer has no ETH. Fund it (faucet) and retry."); process.exit(1); }

  const tusd = compile("TestUSD.sol", "TestUSD");
  let h = await wallet.deployContract({ abi: tusd.abi, bytecode: tusd.bytecode, args: [] });
  const TUSD = (await pub.waitForTransactionReceipt({ hash: h })).contractAddress;
  console.log("TestUSD", TUSD);

  const sweeper = compile("Sweeper.sol", "Sweeper");
  h = await wallet.deployContract({ abi: sweeper.abi, bytecode: sweeper.bytecode, args: [attacker] });
  const SWEEPER = (await pub.waitForTransactionReceipt({ hash: h })).contractAddress;
  console.log("Sweeper", SWEEPER, "(attacker", attacker + ")");

  const env = [
    `CHAIN_RPC=${CHAIN_RPC}`,
    `CHAIN_ID=${CHAIN_ID}`,
    `RELAYER_PK=${relayerPk}`,
    `ATTACKER_ADDR=${attacker}`,
    `TUSD_ADDR=${TUSD}`,
    `SWEEPER_ADDR=${SWEEPER}`,
    "",
  ].join("\n");
  writeFileSync(new URL("../.env", import.meta.url), env);
  console.log(`\n✅ wrote .env (${CHAIN_ID === 11155111 ? "Sepolia" : "local anvil"}). Now: npm run dev`);
  if (!existsSync(new URL("../.env", import.meta.url))) console.error("warning: .env not written");
}
main().catch((e) => { console.error(e); process.exit(1); });
