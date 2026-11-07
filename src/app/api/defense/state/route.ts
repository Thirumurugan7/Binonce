import { readState } from "@/lib/defense-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Live balances + operator address + delegation state, for the wallet-driven /defense flow. */
export async function GET() {
  try {
    return Response.json({ ok: true, ...(await readState()) });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
