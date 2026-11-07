import { arkivEnabled, EXPLORER as ARKIV_EXPLORER } from "@/lib/arkiv";
import { chainConfig } from "@/lib/chains";

export const dynamic = "force-dynamic";

/** Attack config for the selected network (?chain=<id>). Addresses come from the registry; the
 *  relayer + victim keys are shared across networks (from env). Default network is Whitechain. */
export async function GET(req: Request) {
  const chainId = Number(new URL(req.url).searchParams.get("chain")) || undefined;
  const net = chainConfig(chainId);
  const configured = Boolean(process.env.RELAYER_PK && process.env.VICTIM_PK);
  return Response.json({
    configured,
    chain: net.name,
    explorer: net.explorer,
    attacker: net.attacker,
    sweeper: net.sweeper,
    tusd: net.token,
    arkiv: arkivEnabled(),
    arkivExplorer: ARKIV_EXPLORER,
  });
}
