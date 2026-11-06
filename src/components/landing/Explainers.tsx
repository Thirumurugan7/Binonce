"use client";

import { useId, useMemo, useState } from "react";

/**
 * "Why sign 50?" The attacker can't know the wallet's nonce at the moment the transaction lands,
 * so they sign a run of them. Drag to simulate the wallet sending k transactions in the meantime.
 */
export function NonceWindow() {
  const [k, setK] = useState(0);
  const id = useId();
  const lands = k < 50 ? k : null;
  return (
    <div className="rounded-panel border border-bn-line bg-bn-card p-5 sm:p-6 shadow-bn-1 h-full flex flex-col">
      <h3 className="m-0 text-[17px] font-medium text-bn-ink">Why sign 50?</h3>
      <p className="m-0 mt-1.5 text-[14.5px] leading-relaxed text-bn-ink-2">
        An authorization only works at the wallet’s exact current nonce. The wallet keeps sending its own transactions,
        so the attacker can’t know which nonce it will be at. Drag to move it.
      </p>

      <div className="mt-5">
        <label htmlFor={id} className="flex items-baseline justify-between text-[13px] text-bn-ink-2">
          <span>Transactions the wallet sends before the attack lands</span>
          <span className="font-mono text-bn-ink tnum">{k}</span>
        </label>
        <input id={id} type="range" min={0} max={60} value={k} onChange={(e) => setK(Number(e.target.value))}
          className="bn-range mt-2 w-full" aria-valuetext={`${k} transactions; ${lands != null ? `authorization n+${lands} lands` : "no authorization matches"}`} />
      </div>

      <div className="mt-4 grid grid-cols-10 gap-[4px]" aria-hidden>
        {Array.from({ length: 50 }, (_, i) => (
          <div key={i} className={`aspect-square rounded-[3px] border transition-colors duration-fast ${
            i === lands ? "bg-bn-ember border-bn-ember"
              : i < k ? "border-bn-line bg-[repeating-linear-gradient(135deg,transparent_0_3px,rgb(var(--bn-line))_3px_4px)]"
              : "border-bn-ink/15 bg-bn-ink/[0.06]"}`} />
        ))}
      </div>

      <p className="m-0 mt-4 text-[14px] leading-relaxed min-h-[3.2em]" aria-live="polite">
        {lands === 0 && <span className="text-bn-ink-2">The wallet didn’t move. <b className="font-medium text-bn-ember-ink">Authorization n lands</b>, the first one. In the replay this is what happens.</span>}
        {lands != null && lands > 0 && <span className="text-bn-ink-2">The wallet’s nonce is now n+{k}, so <b className="font-medium text-bn-ember-ink">authorization n+{k} lands</b>. The first {k} are already stale.</span>}
        {lands == null && <span className="text-bn-ink-2"><b className="font-medium text-bn-ink">None of the 50 match.</b> The delegation fails and nothing happens. Signing spares is how the attacker avoids this.</span>}
      </p>
    </div>
  );
}

const EXAMPLE = "0xef01005fbdb2315678afecb367f032d93f642f64180aa3";

/** Decode an account's code: the 3-byte designator, then the 20-byte delegate. Hover any byte. */
export function CodeDecoder() {
  const [raw, setRaw] = useState(EXAMPLE);
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();

  const r = useMemo(() => {
    const v = raw.trim().toLowerCase();
    if (v === "0x" || v === "") return { kind: "eoa" as const };
    if (!/^0x[0-9a-f]*$/.test(v) || v.length % 2) return { kind: "bad" as const };
    if (v.startsWith("0xef0100") && v.length === 48) {
      const bytes = v.slice(2).match(/../g)!;
      return { kind: "delegated" as const, bytes, delegate: "0x" + v.slice(8) };
    }
    return { kind: "contract" as const, size: (v.length - 2) / 2 };
  }, [raw]);

  return (
    <div className="rounded-panel border border-bn-night-line bg-bn-night text-bn-fog p-5 sm:p-6 shadow-bn-2 h-full flex flex-col">
      <h3 className="m-0 text-[17px] font-medium">Read the 23 bytes</h3>
      <p className="m-0 mt-1.5 text-[14.5px] leading-relaxed text-bn-fog-2">
        Ask any node for an account’s code with <code className="font-mono text-bn-fog">eth_getCode</code>. A delegated account
        returns exactly this shape. Hover the bytes, or paste your own result.
      </p>

      <label htmlFor={id} className="sr-only">Account code</label>
      <input id={id} value={raw} onChange={(e) => setRaw(e.target.value)} spellCheck={false}
        className="bn-focus mt-5 w-full rounded-data border border-bn-night-line bg-bn-night-2 px-3.5 py-2.5 font-mono text-[12.5px] text-bn-fog outline-none focus:border-bn-fog-2" />

      {r.kind === "delegated" ? (
        <>
          <div className="mt-4 grid grid-cols-[repeat(23,minmax(0,1fr))] gap-[3px]" onMouseLeave={() => setHover(null)}>
            {r.bytes.map((b, i) => {
              const marker = i < 3;
              const lit = hover == null ? false : (hover < 3) === marker;
              return (
                <span key={i} tabIndex={0} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                  aria-label={`byte ${i + 1}: ${b}, ${marker ? "delegation marker" : "delegate address"}`}
                  className={`bn-focus h-9 rounded-[3px] grid place-items-center font-mono text-[9.5px] sm:text-[10.5px] cursor-default transition-colors duration-fast border ${
                    marker ? (lit ? "bg-bn-ember border-bn-ember text-black" : "border-bn-ember-glow/50 text-bn-ember-glow")
                      : (lit ? "bg-bn-fog/20 border-bn-fog/40 text-bn-fog" : "border-bn-night-line text-bn-fog-2")}`}>{b}</span>
              );
            })}
          </div>
          <div className="mt-4 min-h-[3.2em] text-[14px] leading-relaxed" aria-live="polite">
            {hover == null && <span className="text-bn-fog-2">Delegated. This account now runs the code at <span className="font-mono text-bn-fog break-all">{r.delegate}</span>.</span>}
            {hover != null && hover < 3 && <span><span className="text-bn-ember-glow font-mono">ef 01 00</span><span className="text-bn-fog-2">: the 7702 designator. No normal contract can start with 0xef, so this prefix always means “delegated”.</span></span>}
            {hover != null && hover >= 3 && <span className="text-bn-fog-2">Bytes 4 to 23: the 20-byte address of the contract this account now executes. In the attack, the sweeper.</span>}
          </div>
        </>
      ) : (
        <div className="mt-4 min-h-[5.5em] text-[14px] leading-relaxed text-bn-fog-2" aria-live="polite">
          {r.kind === "eoa" && <>Empty code: <span className="text-bn-fog">a plain account</span>. Nothing has been delegated. This is how the hot wallet looked before the attack.</>}
          {r.kind === "contract" && <>{r.size} bytes that don’t start with 0xef0100: <span className="text-bn-fog">an ordinary contract</span>, not a delegated account.</>}
          {r.kind === "bad" && <>That isn’t hex. Code looks like <span className="font-mono text-bn-fog">0x…</span> with an even number of digits.</>}
          <button onClick={() => setRaw(EXAMPLE)} className="bn-focus block mt-2 rounded font-mono text-[12px] text-bn-fog underline underline-offset-4 decoration-bn-night-line hover:decoration-bn-fog">Load the example</button>
        </div>
      )}
    </div>
  );
}
