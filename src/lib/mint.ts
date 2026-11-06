import { parseUnits, formatUnits, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { publicClient, walletClient } from "./chain";
import { ERC20_ABI } from "./abi";
import { getConfig } from "./runtime";

const DEC = 6;

export interface MintResult {
  tx: `0x${string}`;
  block: number;
  amount: string;        // human tUSD minted
  victim: `0x${string}`;
  token: `0x${string}`;
  balance: string;       // victim tUSD balance after
}

/** Mint `amount` (human tUSD) to the current victim. Relayer pays gas. */
export async function mintToVictim(amount: string): Promise<MintResult> {
  const relayerPk = process.env.RELAYER_PK as Hex | undefined;
  if (!relayerPk) throw new Error("RELAYER_PK missing — run setup first.");
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Amount must be a positive number.");

  const { victimAddr, tusd } = getConfig();
  const relayer = privateKeyToAccount(relayerPk);
  const pub = publicClient();
  const wallet = walletClient(relayer);

  const value = parseUnits(amount, DEC);
  const tx = await wallet.writeContract({ address: tusd, abi: ERC20_ABI, functionName: "mint", args: [victimAddr, value] });
  const rc = await pub.waitForTransactionReceipt({ hash: tx });
  const raw = (await pub.readContract({ address: tusd, abi: ERC20_ABI, functionName: "balanceOf", args: [victimAddr] })) as bigint;

  return {
    tx,
    block: Number(rc.blockNumber),
    amount,
    victim: victimAddr,
    token: tusd,
    balance: formatUnits(raw, DEC),
  };
}
