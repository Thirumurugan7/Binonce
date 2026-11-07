import { hijackOperator } from "@/lib/defense-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The attacker 7702-delegates the demo operator to the sweeper (server-side). */
export async function POST() {
  try {
    return Response.json({ ok: true, ...(await hijackOperator()) });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
