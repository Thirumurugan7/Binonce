import { safeState } from "@/lib/safe-signer-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try { return Response.json(await safeState()); }
  catch (e) { return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }); }
}
