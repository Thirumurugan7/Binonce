import { recordSafeSig } from "@/lib/safe-signer-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Persist a wallet signature into the pending session so it survives an account-switch / reload. */
export async function POST(req: Request) {
  try {
    const { sessionId, actorSig, actorOwnerSig, coSignerSig } = (await req.json()) ?? {};
    if (!sessionId) return Response.json({ ok: false, reason: "sessionId required" });
    return Response.json(recordSafeSig(sessionId, { actorSig, actorOwnerSig, coSignerSig }));
  } catch (e) { return Response.json({ ok: false, reason: e instanceof Error ? e.message : String(e) }); }
}
