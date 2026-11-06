import { chainLabel } from "@/lib/chain";
import { arkivEnabled, EXPLORER as ARKIV_EXPLORER } from "@/lib/arkiv";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = Boolean(
    process.env.RELAYER_PK && process.env.SWEEPER_ADDR && process.env.TUSD_ADDR && process.env.ATTACKER_ADDR
  );
  const chain = chainLabel();
  return Response.json({
    configured,
    chain,
    explorer: chain === "Sepolia" ? "https://sepolia.etherscan.io" : null,
    attacker: process.env.ATTACKER_ADDR ?? null,
    sweeper: process.env.SWEEPER_ADDR ?? null,
    tusd: process.env.TUSD_ADDR ?? null,
    arkiv: arkivEnabled(),
    arkivExplorer: ARKIV_EXPLORER,
  });
}
