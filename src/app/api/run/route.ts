import { runAttack } from "@/lib/attack";
import type { AttackEvent } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Streams the REAL on-chain attack as Server-Sent Events. */
export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: AttackEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      try {
        await runAttack(emit);
      } catch (err) {
        emit({ step: "fatal", msg: err instanceof Error ? err.message : String(err) });
      }
      emit({ step: "closed" });
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // prevent proxy/server buffering so paced events flush immediately (also in `next start`)
      "X-Accel-Buffering": "no",
    },
  });
}
