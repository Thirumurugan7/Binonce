import { resetActor } from "@/lib/safe-signer-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Clears the actor's 7702 delegation (restore the clean key). */
export async function POST() {
  try { return Response.json(await resetActor()); }
  catch (e) { return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }); }
}
