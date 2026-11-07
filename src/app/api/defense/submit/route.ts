import { submitPayout } from "@/lib/defense-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Relay a wallet-signed payout (relayer broadcasts; judges by receipt status). */
export async function POST(req: Request) {
  try {
    const { deadline, signature, expectRefusal } = await req.json();
    if (typeof deadline !== "string" || typeof signature !== "string") {
      return Response.json({ ok: false, error: "deadline and signature are required" }, { status: 400 });
    }
    const res = await submitPayout(deadline, signature as `0x${string}`, !!expectRefusal);
    return Response.json(res);
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
