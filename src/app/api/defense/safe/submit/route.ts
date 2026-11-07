import { submitSafeOp } from "@/lib/safe-signer-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Injects the wallet signatures (actor + two owners) and executes via the relayer. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, actorSig, coSignerSig, actorOwnerSig } = body ?? {};
    // Signatures are persisted in the session as each wallet signs; submitSafeOp reads them from there
    // and falls back to any passed in the body. Only the sessionId is strictly required.
    if (!sessionId) return Response.json({ ok: false, reason: "sessionId required" });
    return Response.json(await submitSafeOp({ sessionId, actorSig, coSignerSig, actorOwnerSig }));
  } catch (e) { return Response.json({ ok: false, reason: e instanceof Error ? e.message : String(e) }); }
}
