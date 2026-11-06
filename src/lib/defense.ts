import { spawn } from "node:child_process";
import { join } from "node:path";
import type { DefenseEmit, DefenseEvent } from "./defense-types";

/** Where the live Chainwall demo chain and the instrumented driver live. */
export function defenseConfig() {
  const rpc = process.env.DEFENSE_RPC ?? "http://127.0.0.1:8546";
  const factory = process.env.DEFENSE_FACTORY ?? "0x9DA61baA639778e193Ff08a06E07c62dEDBa5813";
  const dir = process.env.CHAINWALL_DIR ?? "";
  return { rpc, factory, dir };
}

/** Is the live chain reachable and the factory deployed? */
export async function defenseReady(): Promise<{ ok: boolean; chain?: number; block?: number; error?: string }> {
  const { rpc, factory } = defenseConfig();
  const call = async (method: string, params: unknown[] = []) => {
    const r = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error.message ?? String(j.error));
    return j.result as string;
  };
  try {
    const chain = parseInt(await call("eth_chainId"), 16);
    const block = parseInt(await call("eth_blockNumber"), 16);
    const code = await call("eth_getCode", [factory, "latest"]);
    if (!code || code === "0x") return { ok: false, chain, block, error: "factory not deployed" };
    return { ok: true, chain, block };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Run the GENUINE Chainwall end-to-end defense against the live local chain and stream each
 * milestone. This spawns the instrumented driver (local/e2e_stream.py) which creates a tenant
 * through the deployed factory, funds a vault, runs a legitimate 2-of-2 payout, then runs the
 * forged-signature EIP-7702 attack and shows it refused on chain with the vault intact.
 *
 * Every event corresponds to a real transaction or read on the node — nothing is simulated.
 */
export function runDefense(emit: DefenseEmit): Promise<void> {
  const { rpc, factory, dir } = defenseConfig();
  if (!dir) {
    emit({ step: "fatal", msg: "CHAINWALL_DIR is not set — point it at the chainwall repo." });
    return Promise.resolve();
  }
  const script = join(dir, "local", "e2e_stream.py");
  return new Promise<void>((resolve) => {
    const child = spawn("python3", [script], {
      cwd: dir,
      env: { ...process.env, LOCAL_RPC: rpc, FACTORY: factory, PYTHONUNBUFFERED: "1" },
    });

    let buf = "";
    const onData = (chunk: Buffer) => {
      buf += chunk.toString();
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        const m = line.indexOf("EVENT ");
        if (m >= 0) {
          try {
            const e = JSON.parse(line.slice(m + 6)) as DefenseEvent;
            emit({ t: Date.now(), ...e });
          } catch {
            /* ignore malformed line */
          }
        }
      }
    };
    child.stdout.on("data", onData);

    // stderr carries diagnostics + python tracebacks; surface a failure if the run dies.
    let err = "";
    child.stderr.on("data", (c: Buffer) => { err += c.toString(); });

    child.on("error", (e) => {
      emit({ step: "fatal", msg: `could not start driver: ${e.message}` });
      resolve();
    });
    child.on("close", (code) => {
      if (code !== 0) {
        const tail = err.trim().split("\n").slice(-3).join(" ");
        emit({ step: "fatal", msg: `driver exited ${code}${tail ? ` — ${tail}` : ""}` });
      }
      resolve();
    });
  });
}
