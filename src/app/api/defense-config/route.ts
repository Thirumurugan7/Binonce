import { defenseConfig, defenseReady } from "@/lib/defense";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { factory } = defenseConfig();
  const r = await defenseReady();
  return Response.json({
    configured: r.ok,
    chain: r.chain === 42161 ? "Arbitrum One (local fork)" : r.chain ? `chain ${r.chain}` : "Local fork",
    factory,
    block: r.block ?? null,
    error: r.ok ? null : r.error ?? null,
  });
}
