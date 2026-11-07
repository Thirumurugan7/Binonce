import { formatUnits, createPublicClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ERC20_ABI } from "@/lib/abi";
import { chainConfig, WHITECHAIN_ID } from "@/lib/chains";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The victim's REAL on-chain balances on the selected network (?chain=<id>). */
export async function GET(req: Request) {
  try {
    const chainId = Number(new URL(req.url).searchParams.get("chain")) || undefined;
    const net = chainConfig(chainId);
    const victimPk = process.env.VICTIM_PK;
    if (!victimPk) return Response.json({ configured: false, error: "VICTIM_PK not set" });
    const victimAddr = privateKeyToAccount(victimPk as `0x${string}`).address;
    const chain = defineChain({
      id: net.id, name: net.name,
      nativeCurrency: net.id === WHITECHAIN_ID ? { name: "WBT", symbol: "WBT", decimals: 18 } : { name: "ETH", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [net.rpc] } },
    });
    const pub = createPublicClient({ chain, transport: http(net.rpc) });
    const [raw, native, code] = await Promise.all([
      pub.readContract({ address: net.token, abi: ERC20_ABI, functionName: "balanceOf", args: [victimAddr] }) as Promise<bigint>,
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
