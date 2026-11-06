import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cw, acc, opFile, writeJson, OP_DIR } from "@/lib/cw-cli";
import { DEMO } from "@/lib/demo-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Server proposes a transfer with a NON-member relayer, so the operation needs
 *  BOTH treasury-group members to approve from their own wallets (true 2-of-2). */
export async function POST(req: Request) {
  try {
    const { amount } = await req.json(); // USDC, human (e.g. 250000 or 1500000)
    const base = BigInt(Math.round(Number(amount) * 1e6)).toString();
    const recipientWord = BigInt(DEMO.approvers[1].address).toString();
    const now = Math.floor(Date.now() / 1000);

    const intent = {
      safe: DEMO.vault,
      interactionId: DEMO.interactionId,
      policyId: DEMO.policyId,
      deadline: `${now + 86400}`,
      args: [recipientWord, base],
      nativeValue: "0",
    };
    const intentPath = writeJson(join(OP_DIR, `intent-${now}.json`), intent);
    const outPath = join(OP_DIR, `pending-${now}.json`);

    const r = cw(["operations", "propose", intentPath, ...acc("wc-relayer"), "--out", outPath, "--json"]);
    if (!r.ok) return Response.json({ ok: false, error: r.stderr || r.stdout }, { status: 500 });

    const proposal = JSON.parse(readFileSync(outPath, "utf8"));
    const operationId = String(proposal.payload?.operationId);
    writeJson(opFile(operationId), proposal); // stable name for /execute

    return Response.json({ ok: true, operationId, amount, recipient: DEMO.approvers[1].address });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
