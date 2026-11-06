import { runDefense } from "@/lib/defense";
import type { DefenseEvent } from "@/lib/defense-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Streams the REAL on-chain Chainwall defense end-to-end as Server-Sent Events. */
export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: DefenseEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      try {
        await runDefense(emit);
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
      "X-Accel-Buffering": "no",
    },
  });
}
