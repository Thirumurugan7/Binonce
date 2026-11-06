import { runAttack } from "@/lib/attack";
import type { AttackEvent } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

// One attack at a time: every run drives the same victim/relayer, so overlapping runs
// collide on nonces. Single dev process -> a module flag is enough.
let activeRun = false;

/** Streams the REAL on-chain attack as Server-Sent Events. */
export async function GET(req: Request) {
  const encoder = new TextEncoder();
  const frame = (e: AttackEvent) => encoder.encode(`data: ${JSON.stringify(e)}\n\n`);

  if (activeRun) {
    const busy = new ReadableStream({
      start(c) {
        c.enqueue(frame({ step: "fatal", msg: "An attack is already running — wait for it to finish, then try again." }));
        c.enqueue(frame({ step: "closed" }));
        c.close();
      },
    });
    return new Response(busy, { headers: SSE_HEADERS });
  }

  activeRun = true;
  const ac = new AbortController();
  req.signal.addEventListener("abort", () => ac.abort()); // browser navigated away / closed the stream

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: AttackEvent) => controller.enqueue(frame(e));
      try {
        await runAttack(emit, ac.signal);
      } catch (err) {
        if (!(err instanceof Error && err.name === "AbortError")) {
          emit({ step: "fatal", msg: err instanceof Error ? err.message : String(err) });
        }
      } finally {
        try { emit({ step: "closed" }); } catch { /* already closed */ }
        try { controller.close(); } catch { /* already closed */ }
        activeRun = false;
      }
    },
    cancel() {
      ac.abort();
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
