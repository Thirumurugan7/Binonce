import { resetOperator } from "@/lib/defense-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Restore the operator to a clean key (clears any 7702 delegation). */
export async function POST() {
  try {
    return Response.json({ ok: true, ...(await resetOperator()) });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
