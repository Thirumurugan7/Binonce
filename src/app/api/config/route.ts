import { chainLabel } from "@/lib/chain";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = Boolean(
    process.env.RELAYER_PK && process.env.SWEEPER_ADDR && process.env.TUSD_ADDR && process.env.ATTACKER_ADDR
  );
  return Response.json({
    configured,
    chain: chainLabel(),
    attacker: process.env.ATTACKER_ADDR ?? null,
    sweeper: process.env.SWEEPER_ADDR ?? null,
    tusd: process.env.TUSD_ADDR ?? null,
  });
}
