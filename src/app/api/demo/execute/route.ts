import { existsSync, unlinkSync } from "node:fs";
import { cw, acc, opFile, decodeReason } from "@/lib/cw-cli";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Execute an approved operation. Simulates first so a policy rejection (the
 *  spending cap -> ERR_01) comes back as a clean reason instead of a raw revert. */
export async function POST(req: Request) {
  try {
    const { operationId } = await req.json();
    const path = opFile(String(operationId));
    if (!existsSync(path)) {
      return Response.json({ ok: false, error: "proposal not found — propose again" }, { status: 404 });
    }

    // dry simulate: catches the spending cap before spending gas
    const sim = cw(["operations", "simulate", path, ...acc("wc-owner")]);
    if (!sim.ok) {
      const reason = decodeReason(sim.stderr + sim.stdout);
      return Response.json({ ok: false, blocked: true, reason });
    }

    const exe = cw(["operations", "execute", path, ...acc("wc-owner")]);
    if (!exe.ok) {
      const reason = decodeReason(exe.stderr + exe.stdout);
      return Response.json({ ok: false, blocked: true, reason });
    }
    try { unlinkSync(path); } catch {} // executed -> drop from the pending list
    const txHash = (exe.stdout.match(/0x[0-9a-fA-F]{64}/) || [])[0] ?? null;
    return Response.json({ ok: true, txHash });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
