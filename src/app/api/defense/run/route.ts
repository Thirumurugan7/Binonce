import { runDefense } from "@/lib/defense-engine";
import { runSafeDefense } from "@/lib/safe-defense";
import { chainConfig } from "@/lib/chains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

// One run at a time: every run drives the same operator/relayer/vault, so overlapping runs
// would collide on nonces and flip the operator's delegation. Single dev process -> a module flag is enough.
let activeRun = false;

/** Streams the live /defense run as Server-Sent Events, one DefenseEvent per `data:` line. */
export async function GET(req: Request) {
  const encoder = new TextEncoder();
  const frame = (obj: unknown) => encoder.encode(`data: ${JSON.stringify(obj)}\n\n`);

  if (activeRun) {
    const busy = new ReadableStream({
      start(c) {
        c.enqueue(frame({ step: "fatal", t: Date.now(), msg: "A run is already in progress — wait for it to finish, then press Run again." }));
        c.enqueue(frame({ step: "closed", t: Date.now() }));
        c.close();
      },
    });
    return new Response(busy, { headers: SSE_HEADERS });
  }

  const chainId = Number(new URL(req.url).searchParams.get("chain")) || undefined;

  activeRun = true;
  const ac = new AbortController();
  req.signal.addEventListener("abort", () => ac.abort()); // browser navigated away / closed the stream

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(frame(obj));
      try {
        // Chains with a Safe route (Sepolia) run the 2-of-N Safe + 7702 defense; everything else
        // (Whitechain) keeps the pure-viem single-operator OKAccount flow, untouched.
        const gen = chainConfig(chainId).safe ? runSafeDefense(ac.signal, chainId) : runDefense(ac.signal, chainId);
        for await (const ev of gen) send(ev);
      } catch (e) {
        if (!(e instanceof Error && e.name === "AbortError")) {
          send({ step: "fatal", t: Date.now(), msg: e instanceof Error ? e.message : String(e) });
        }
      } finally {
        try { send({ step: "closed", t: Date.now() }); } catch { /* stream already closed */ }
        try { controller.close(); } catch { /* already closed */ }
        activeRun = false;
      }
    },
    cancel() {
      ac.abort();
      activeRun = false;
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
