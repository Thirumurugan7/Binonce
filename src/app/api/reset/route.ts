import { deployFresh } from "@/lib/deploy";
import { setConfig } from "@/lib/runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Resets everything: fresh token + sweeper + victim + attacker, victim re-minted 2.5M. */
export async function POST() {
  try {
    const cfg = await deployFresh();
    setConfig(cfg);
    return Response.json({ ok: true, victim: cfg.victimAddr, attacker: cfg.attacker, tusd: cfg.tusd, sweeper: cfg.sweeper });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
