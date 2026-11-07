import { mintToVictim } from "@/lib/mint";
import { recordMint } from "@/lib/arkiv";
import { SEPOLIA_ID } from "@/lib/chains";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_AMOUNT = "2500000";

/** Mint test tUSD to the victim on the selected network and record it on Arkiv (best-effort). */
export async function POST(req: Request) {
  try {
    let amount = DEFAULT_AMOUNT;
    let chainId = Number(new URL(req.url).searchParams.get("chain")) || undefined;
    try {
      const body = await req.json();
      if (body && body.amount != null) amount = String(body.amount);
      if (body && body.chain != null) chainId = Number(body.chain) || chainId;
    } catch { /* empty body → defaults */ }

    const r = await mintToVictim(amount, chainId);

    const arkivKey = await recordMint({
      chain: r.chainId === SEPOLIA_ID ? "sepolia" : "whitechain",
      token: r.token, to: r.victim, amount: r.amount, tx: r.tx, block: String(r.block), ts: String(Date.now()),
    });

    return Response.json({ ok: true, ...r, arkivKey });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
