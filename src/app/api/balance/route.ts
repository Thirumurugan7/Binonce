import { formatUnits } from "viem";
import { publicClient } from "@/lib/chain";
import { ERC20_ABI } from "@/lib/abi";
import { getConfig } from "@/lib/runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Reads the current victim's REAL on-chain balances (tUSD + native ETH). */
export async function GET() {
  try {
    const { victimAddr, tusd } = getConfig();
    const pub = publicClient();
    const [raw, native, code] = await Promise.all([
      pub.readContract({ address: tusd, abi: ERC20_ABI, functionName: "balanceOf", args: [victimAddr] }) as Promise<bigint>,
      pub.getBalance({ address: victimAddr }),
      pub.getCode({ address: victimAddr }),
    ]);

    return Response.json({
      configured: true,
      victim: victimAddr,
      usdt: Number(formatUnits(raw, 6)),
      eth: Number(formatUnits(native, 18)),
      delegated: !!code && code.toLowerCase().startsWith("0xef0100"),
      code: code ?? null,
    });
  } catch (e) {
    return Response.json({ configured: false, error: e instanceof Error ? e.message : String(e) });
  }
}
