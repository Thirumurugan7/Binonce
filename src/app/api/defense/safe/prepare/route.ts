import { prepareSafeOp } from "@/lib/safe-signer-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Proposes the op and returns the exact EIP-712 typed data the two wallets must sign. */
export async function POST() {
  try { return Response.json(await prepareSafeOp()); }
  catch (e) { return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }); }
}
