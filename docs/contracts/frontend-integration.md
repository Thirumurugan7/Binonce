# Integrating a policy + execution into the frontend

How to drive Chainwall — **create a policy** and **propose → approve → execute** an operation — from
the Next.js app, streaming each step to the UI. This matches the live flow proven on Whitechain
testnet 1874 (see [whitechain-deployment.md](./whitechain-deployment.md)).

## The model: the browser never signs; the server does

The `chainwall` CLI signs with **Foundry keystores** (server-side secrets). A browser can't — and must
not — hold those keys. So the data flow is:

```
Browser (DefenseDashboard)
   │  fetch / EventSource
   ▼
Next.js API route (server)  ──spawn──►  chainwall CLI  ──►  Registry / Interact / Vault (chain)
   │  Server-Sent Events (step, txHash, balances, reason)
   ▲
Browser updates the walkthrough UI
```

The frontend **drives** the flow and **renders** progress; the server **signs and broadcasts**. Long
multi-transaction flows stream **step events** over SSE into the dashboard's existing
`defense.current.handle(event)` seam.

## 1. A server-side CLI helper

`src/lib/chainwall.ts` — spawn the CLI, scoped to the tenant profile, and surface progress. Keys stay
on the server (password file path, never `NEXT_PUBLIC_*`).

```ts
import { spawn } from "node:child_process";

const BIN = process.env.CHAINWALL_BIN ?? `${process.env.HOME}/.local/bin/chainwall`;
const PROFILE = process.env.CHAINWALL_PROFILE ?? "whitechain"; // pins chain + Registry + Interact
const PW = process.env.CHAINWALL_PASSWORD_FILE!;               // Foundry keystore password (server only)

/** Run one chainwall command; resolve stdout. Emits the submitted tx hash if present. */
export function cw(args: string[], onLine?: (l: string) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(BIN, ["--profile", PROFILE, ...args], { env: process.env });
    let out = "", err = "";
    p.stdout.on("data", (d) => { out += d; d.toString().split("\n").forEach((l: string) => l && onLine?.(l)); });
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(err || out))));
  });
}

export const txHash = (s: string) => s.match(/0x[0-9a-fA-F]{64}/)?.[0] ?? null;
const signer = (account: string) => ["--account", account, "--password-file", PW];
```

## 2. Create a policy (API route + SSE)

`src/app/api/policy/route.ts` — runs the real sequence (users → group → policy → optional program),
emitting a step event per write. The UI consumes these exactly like the defense walkthrough.

```ts
import { cw, txHash } from "@/lib/chainwall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { approvers, threshold = 2, capUSDC } = await req.json();
  const stream = new ReadableStream({
    async start(c) {
      const send = (o: object) => c.enqueue(`data: ${JSON.stringify(o)}\n\n`);
      const acc = (a: string) => ["--account", a, "--password-file", process.env.CHAINWALL_PASSWORD_FILE!];
      const OWNER = "wc-owner";
      try {
        // id() is public keccak-256 of a label
        const group = (await cw(["id", "treasury"])).trim();
        const policy = (await cw(["id", "treasury-2of2"])).trim();

        for (const a of approvers) {
          send({ step: "configure", msg: `Adding user ${a}` });
          await cw(["users", "add", a, ...acc(OWNER)]);
        }
        send({ step: "configure", msg: "Creating the treasury group" });
        await cw(["groups", "add", group, ...acc(OWNER)]);
        for (const a of approvers) await cw(["groups", "add-member", group, a, ...acc(OWNER)]);

        send({ step: "configure", msg: `Creating ${threshold}-of-${approvers.length} policy` });
        const r = await cw(["policies", "add", policy, `[${group}]`, `[${threshold}]`, ...acc(OWNER)]);
        send({ step: "vault-ready", msg: "Policy created", vault: policy, block: 0, chain: 1874 });

        // optional: attach a spending-cap policy program (compile then publish)
        if (capUSDC) {
          // write a rendered .ls to a temp file, then:
          // await cw(["policies","program","compile", file, "--out", json]);
          // await cw(["policies","program","publish", policy, json, ...acc(OWNER)]);
          send({ step: "configure", msg: `Spending cap ${capUSDC} USDC attached` });
        }
        // grant the execute capability to the group (required before any execute)
        const EXEC = (await cw(["id", "cap.registry.interaction.execute"])).trim();
        await cw(["registry", "grantCapabilityGroup", EXEC, group, ...acc(OWNER)]);

        send({ step: "done", msg: "Policy ready" });
      } catch (e: any) {
        send({ step: "fatal", msg: e.message });
      }
      send({ step: "closed" });
      c.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
}
```

> **Don't forget the capability.** `cap.registry.interaction.execute` must be granted to the group or
> the executor, or execution reverts with `ExecutorNotAuthorized` — the one gotcha we hit live.

## 3. Execute an operation (propose → approve → execute)

`src/app/api/operation/route.ts` — builds an intent, proposes (records the proposer's approval),
collects the remaining approvals, simulates, and executes. It streams the **decoded revert** so the UI
can show a cap rejection (`ERR_01`) instead of a silent failure.

```ts
import { cw, txHash } from "@/lib/chainwall";
import { writeFileSync } from "node:fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { vault, interactionId, policyId, recipient, amount, approvers } = await req.json();
  const stream = new ReadableStream({
    async start(c) {
      const send = (o: object) => c.enqueue(`data: ${JSON.stringify(o)}\n\n`);
      const acc = (a: string) => ["--account", a, "--password-file", process.env.CHAINWALL_PASSWORD_FILE!];
      try {
        const now = Math.floor(Date.now() / 1000);
        const recipientWord = BigInt(recipient).toString(); // cast to-dec equivalent
        const intent = { safe: vault, interactionId, policyId, deadline: `${now + 86400}`,
                         args: [recipientWord, amount], nativeValue: "0" };
        writeFileSync("/tmp/intent.json", JSON.stringify(intent));

        send({ step: "payout-propose", msg: `Proposing ${amount} (approval 1/${approvers.length})` });
        const prop = await cw(["operations", "propose", "/tmp/intent.json", ...acc(approvers[0]), "--out", "/tmp/op.json", "--json"]);
        const opId = JSON.parse(prop).payload?.operationId;

        for (const a of approvers.slice(1)) {
          send({ step: "payout-approve", msg: `Approval from ${a}` });
          await cw(["operations", "approve", String(opId), ...acc(a)]);
        }

        send({ step: "payout-exec", msg: "Simulating" });
        await cw(["operations", "simulate", "/tmp/op.json", ...acc(approvers[0])]); // throws on policy reject

        send({ step: "payout-exec", msg: "Executing" });
        const exe = await cw(["operations", "execute", "/tmp/op.json", ...acc(approvers[0])]);
        send({ step: "payout-done", msg: "Executed", vaultUSDC: "…", recipientUSDC: "…" });
      } catch (e: any) {
        // a cap/threshold rejection surfaces here — decode it for the UI
        const reason = e.message.match(/ERR_\d+|[A-Z][a-zA-Z]+\(\)/)?.[0] ?? "reverted";
        send({ step: "refuse", msg: `Blocked by policy (${reason})`, reason, attempted: amount });
      }
      send({ step: "closed" });
      c.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
}
```

## 4. The client side — wire it into `DefenseDashboard`

The dashboard already exposes the seam (`src/components/DefenseDashboard.tsx`): a `handle(event)` state
machine mapping `DefenseEvent.step` → UI, reached through `defense.current.handle(event)`. The stubbed
`run()` just needs to open an `EventSource` and feed events in:

```ts
const run = useCallback(() => {
  reset();
  setDrawerOpen(true);
  setRunning(true);
  const es = new EventSource("/api/operation?…"); // or POST + ReadableStream reader
  es.onmessage = (ev) => defense.current.handle(JSON.parse(ev.data));
  es.addEventListener("closed", () => { es.close(); defense.current.finish(); });
}, [reset]);
```

The event shape is already defined in [`src/lib/defense-types.ts`](../../src/lib/defense-types.ts)
(`DefenseEvent`: `step`, `msg`, `vault`, `vaultUSDC`, `recipientUSDC`, `reason`, `amount`, …) and
`handle()` maps each `step` to a panel, a toast, and a balance update. Keep the server's `send({step})`
values inside that `DefenseStep` union so no UI changes are needed.

## 5. Real multi-party signing (beyond the single-operator demo)

The route above has the **server hold every signer's keystore** — fine for a demo or an operator
backend. For a genuine N-of-M where each approver is a separate person, **do not** put keys on the
server. Use the CLI's signature-collection flow so each party signs with **their own** wallet:

- **OKAccount route:** each approver runs `operations approve <id>` from their own client/keystore; the
  server only proposes and executes.
- **Guarded Safe route:** collect `operations sign-actor` + per-owner `operations sign` artifacts
  client-side, combine with `jq -s`, then `operations execute --via safe --signatures-file`.

The actor (approval), the executor, and the gas payer can all be different addresses — surface that in
the UI (who still needs to approve) rather than signing on their behalf.

## 6. Config & security checklist

| Env (server only) | Purpose |
|---|---|
| `CHAINWALL_BIN` | path to the `chainwall` binary |
| `CHAINWALL_PROFILE` | pins chain + Registry + Interact (`whitechain`) |
| `CHAINWALL_PASSWORD_FILE` | Foundry keystore password file — **never** `NEXT_PUBLIC`, never shipped to the browser |

- **Never** expose a private key, keystore, or password to the client bundle.
- Always `--dry-run` or `simulate` before `execute`; show the decoded revert (`ERR_01`, `ActorDelegated`, `ExecutorNotAuthorized`) rather than a generic failure.
- A Registry write can return `queued` (timelock) — stream that state and don't start a dependent step until it applies.
- Keep amounts as **integer base-unit strings** (6-dp USDC: 1,000,000 USDC = `1000000000000`); never floats.

## 7. End-to-end, on this tenant

With `CHAINWALL_PROFILE=whitechain` the routes target the live tenant: Registry `0x7c04a72d…`, Interact
`0xE389bE2d…`, policy `treasury-2of2`, token `demo/usdc` (`0x1d9F8351…`), vault `0x371B4E49…`. A 500k
transfer streams `payout-propose → payout-approve → payout-exec → payout-done`; a 1.5M transfer streams
`refuse` with `reason: "ERR_01"` — the spending cap, surfaced straight into the UI.
