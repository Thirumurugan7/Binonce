import { submitSafeOp } from "@/lib/safe-signer-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Injects the wallet signatures (actor + two owners) and executes via the relayer. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, actorSig, coSignerSig, actorOwnerSig } = body ?? {};
    if (!sessionId || !actorSig || !coSignerSig || !actorOwnerSig) return Response.json({ ok: false, reason: "missing signatures" });
    return Response.json(await submitSafeOp({ sessionId, actorSig, coSignerSig, actorOwnerSig }));
  } catch (e) { return Response.json({ ok: false, reason: e instanceof Error ? e.message : String(e) }); }
}
