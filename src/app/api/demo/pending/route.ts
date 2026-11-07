import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { OP_DIR } from "@/lib/cw-cli";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Fast list of open proposals from the saved files (propose writes them, execute
 *  deletes them). On-chain approval state is read client-side via wagmi, so this
 *  route makes NO slow CLI calls. A refresh (or another signer) always sees what's
 *  pending instead of losing it to React state. */
export async function GET() {
  let files: string[] = [];
  try {
    files = readdirSync(OP_DIR).filter((f) => /^op-\d+\.json$/.test(f));
  } catch {
    return Response.json({ ok: true, pending: [] });
  }
  const pending = files
    .map((f) => {
      const id = (f.match(/op-(\d+)\.json/) || [])[1];
      let amount = 0;
      try {
        const p = JSON.parse(readFileSync(join(OP_DIR, f), "utf8"));
        amount = Number(p.payload?.args?.[1] ?? 0) / 1e6;
      } catch {}
      return { operationId: id, amount };
    })
    .filter((p) => p.operationId)
    .sort((a, b) => Number(b.operationId) - Number(a.operationId));
  return Response.json({ ok: true, pending });
}
