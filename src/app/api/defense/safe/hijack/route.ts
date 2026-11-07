import { hijackActor } from "@/lib/safe-signer-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 7702-delegates the Safe's execution actor to the sweeper (the attack simulation). */
export async function POST() {
  try { return Response.json(await hijackActor()); }
  catch (e) { return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }); }
}
