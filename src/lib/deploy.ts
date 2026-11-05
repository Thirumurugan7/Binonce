import { readFileSync } from "node:fs";
import { join } from "node:path";
import solc from "solc";
import { parseUnits, type Abi } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { publicClient, walletClient } from "./chain";
import type { RunConfig } from "./runtime";

type Compiled = { abi: Abi; bytecode: `0x${string}` };

/** Compile one contract from the contracts/ folder with solc. */
function compile(file: string, name: string): Compiled {
  const source = readFileSync(join(process.cwd(), "contracts", file), "utf8");
  const input = {
    language: "Solidity",
    sources: { [file]: { content: source } },
    settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const errs = (out.errors ?? []) as Array<{ severity: string; formattedMessage: string }>;
  if (errs.some((e) => e.severity === "error")) throw new Error(errs.map((e) => e.formattedMessage).join("\n"));
  const c = out.contracts[file][name];
  return { abi: c.abi as Abi, bytecode: ("0x" + c.evm.bytecode.object) as `0x${string}` };
}

/**
 * Deploy a brand-new TestUSD + Sweeper, a fresh victim and attacker, and mint the
 * victim 2,500,000 tUSD. Returns the new addresses so the app can swap to them.
 */
export async function deployFresh(): Promise<RunConfig> {
  const relayerPk = process.env.RELAYER_PK as `0x${string}` | undefined;
  if (!relayerPk) throw new Error("RELAYER_PK missing — run setup first.");
  const relayer = privateKeyToAccount(relayerPk);
  const pub = publicClient();
  const wallet = walletClient(relayer);

  const attacker = privateKeyToAccount(generatePrivateKey()).address;
  const victimPk = generatePrivateKey();
  const victimAddr = privateKeyToAccount(victimPk).address;

  const t = compile("TestUSD.sol", "TestUSD");
  let h = await wallet.deployContract({ abi: t.abi, bytecode: t.bytecode, args: [] });
  const tusd = (await pub.waitForTransactionReceipt({ hash: h })).contractAddress as `0x${string}`;

  const s = compile("Sweeper.sol", "Sweeper");
  h = await wallet.deployContract({ abi: s.abi, bytecode: s.bytecode, args: [attacker] });
  const sweeper = (await pub.waitForTransactionReceipt({ hash: h })).contractAddress as `0x${string}`;

  h = await wallet.writeContract({ address: tusd, abi: t.abi, functionName: "mint", args: [victimAddr, parseUnits("2500000", 6)] });
  await pub.waitForTransactionReceipt({ hash: h });

  return { victimPk, victimAddr, attacker, tusd, sweeper };
}
