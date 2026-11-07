import { buildPayoutTypedData } from "@/lib/defense-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Build the DirectExecuteFromAccount EIP-712 payload for the connected operator wallet to sign. */
export async function POST() {
  try {
    return Response.json({ ok: true, ...(await buildPayoutTypedData()) });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
