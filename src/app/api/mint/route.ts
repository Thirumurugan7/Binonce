import { mintToVictim } from "@/lib/mint";
import { recordMint } from "@/lib/arkiv";
import { chainLabel } from "@/lib/chain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_AMOUNT = "2500000";

/** Mint test tUSD to the current victim and record the mint on Arkiv (best-effort). */
export async function POST(req: Request) {
  try {
    let amount = DEFAULT_AMOUNT;
    try {
      const body = await req.json();
      if (body && body.amount != null) amount = String(body.amount);
    } catch { /* empty body → default */ }

    const r = await mintToVictim(amount);

    const arkivKey = await recordMint({
      chain: chainLabel().toLowerCase().includes("sepolia") ? "sepolia" : "local",
      token: r.token, to: r.victim, amount: r.amount, tx: r.tx, block: String(r.block), ts: String(Date.now()),
    });

    return Response.json({ ok: true, ...r, arkivKey });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
