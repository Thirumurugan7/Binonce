"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useReadContract, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ShieldCheck, Check, Loader2, ArrowRight, ExternalLink, Ban, Info, AlertTriangle } from "lucide-react";
import { DEMO, INTERACT_ABI, ERC20_ABI, fmtUSDC, whitechainTestnet } from "@/lib/demo-config";

const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
const PRESETS = [
  { label: "250,000", amount: 250000, tone: "ok" as const, note: "under the 1M cap" },
  { label: "1,500,000", amount: 1500000, tone: "hot" as const, note: "over the 1M cap" },
];

/**
 * The full 2-of-2 multisig treasury console. On /defense it renders `embedded` (no header, the top
 * bar owns connect + network switch); the standalone /demo page shows its own header controls.
 */
export function DemoConsole({ embedded = false }: { embedded?: boolean } = {}) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const connected = authenticated && isConnected;
  const wrongChain = connected && chainId !== whitechainTestnet.id;

  const [amount, setAmount] = useState(250000);
  const [opId, setOpId] = useState<string | null>(null);
  const [proposing, setProposing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; txHash?: string; reason?: string } | null>(null);
  const [proposedAmount, setProposedAmount] = useState<number | null>(null);
  const [pending, setPending] = useState<{ operationId: string; amount: number; approved: boolean }[]>([]);

  // Load open proposals from the chain/server so a refresh (or a different signer)
  // always sees what's waiting to be signed, instead of losing it to React state.
  const refreshPending = useCallback(async (adopt = false) => {
    try {
      const r = await fetch("/api/demo/pending").then((x) => x.json());
      const list: { operationId: string; amount: number; approved: boolean }[] = r?.pending ?? [];
      setPending(list);
      if (adopt && list.length) { setOpId(list[0].operationId); setProposedAmount(list[0].amount); setResult(null); }
    } catch {}
  }, []);
  useEffect(() => { refreshPending(true); }, [refreshPending]);

  const idArg = opId ? [BigInt(opId)] : undefined;
  const reads = { enabled: !!opId, refetchInterval: 5000 } as const;

  const isApproved = useReadContract({ address: DEMO.interact as `0x${string}`, abi: INTERACT_ABI, functionName: "isOperationApproved", args: idArg as any, query: reads });
  const canOwner = useReadContract({ address: DEMO.interact as `0x${string}`, abi: INTERACT_ABI, functionName: "canUserApproveOperation", args: opId ? [BigInt(opId), DEMO.approvers[0].address] : undefined as any, query: reads });
  const canTwo = useReadContract({ address: DEMO.interact as `0x${string}`, abi: INTERACT_ABI, functionName: "canUserApproveOperation", args: opId ? [BigInt(opId), DEMO.approvers[1].address] : undefined as any, query: reads });

  const vaultBal = useReadContract({ address: DEMO.token as `0x${string}`, abi: ERC20_ABI, functionName: "balanceOf", args: [DEMO.vault as `0x${string}`], query: { refetchInterval: 6000 } });
  const recipBal = useReadContract({ address: DEMO.token as `0x${string}`, abi: ERC20_ABI, functionName: "balanceOf", args: [DEMO.approvers[1].address], query: { refetchInterval: 6000 } });

  const canState = [canOwner.data as boolean | undefined, canTwo.data as boolean | undefined]; // true = still pending
  const approvedCount = canState.filter((c) => c === false).length;
  const bothApproved = isApproved.data === true;

  const { writeContract, data: txHash, isPending, error: writeError, reset: resetWrite } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: txHash });
  useEffect(() => {
    if (receipt.isSuccess) { isApproved.refetch(); canOwner.refetch(); canTwo.refetch(); refreshPending(false); resetWrite(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.isSuccess]);

  const myApprover = useMemo(
    () => DEMO.approvers.find((a) => a.address.toLowerCase() === address?.toLowerCase()),
    [address]
  );
  const myIndex = myApprover ? DEMO.approvers.indexOf(myApprover) : -1;
  const myCanApprove = myIndex >= 0 ? canState[myIndex] === true : false;

  // One plain-language "what to do now" line that tracks the flow state, so no one has to guess
  // which wallet to connect or what the next move is.
  const guide: { tone: "info" | "warn" | "ok"; text: string } =
    !connected ? { tone: "info", text: "Connect a treasury-owner wallet from the top bar to begin." }
    : wrongChain ? { tone: "warn", text: "Switch to Whitechain Testnet in the top bar." }
    : !myApprover ? { tone: "warn", text: "This wallet isn’t a treasury owner, connect Owner or Approver 2 to sign." }
    : result?.ok ? { tone: "ok", text: "Done, the payout executed and left the vault." }
    : !opId ? { tone: "info", text: "Propose a transfer below to start the 2-of-2 approval." }
    : myCanApprove ? { tone: "info", text: `You’re ${myApprover.label}. Sign below to add your approval.` }
    : !bothApproved ? { tone: "info", text: "You’ve signed. Switch to the other owner’s wallet in the top bar to add the second signature." }
    : { tone: "ok", text: "Both owners signed, run Execute to move the funds." };

  async function propose() {
    setProposing(true); setResult(null); setOpId(null);
    try {
      const r = await fetch("/api/demo/propose", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount }) }).then((x) => x.json());
      if (r.ok) { setOpId(r.operationId); setProposedAmount(amount); refreshPending(false); } else setResult({ ok: false, reason: r.error });
    } finally { setProposing(false); }
  }
  function approve() {
    if (!opId) return;
    writeContract({ address: DEMO.interact as `0x${string}`, abi: INTERACT_ABI, functionName: "approveOperation", args: [BigInt(opId)] });
  }
  async function execute() {
    if (!opId) return;
    setExecuting(true); setResult(null);
    try {
      const r = await fetch("/api/demo/execute", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operationId: opId }) }).then((x) => x.json());
      setResult(r.ok ? { ok: true, txHash: r.txHash } : { ok: false, reason: r.reason || r.error });
      vaultBal.refetch(); recipBal.refetch();
      if (r.ok) { setOpId(null); refreshPending(false); } // op closed, drop from the pending list
    } finally { setExecuting(false); }
  }

  const switchBtn = (
    <button onClick={() => switchChain({ chainId: whitechainTestnet.id })}
      className="rounded-full bg-bn-ember/[0.1] text-bn-ember-ink h-9 px-3 text-sm font-semibold">Wrong network</button>
  );

  return (
    <div className={embedded ? "text-bn-ink" : "min-h-screen bg-bn-paper text-bn-ink"}>
      {/* Standalone /demo keeps its own header; embedded in /defense, the top bar owns connect + network. */}
      {!embedded && (
        <header className="sticky top-0 z-30 h-16 bg-bn-paper/95 backdrop-blur border-b border-bn-line flex items-center gap-3 px-5 sm:px-6">
          <ShieldCheck className="h-5 w-5 text-bn-seal" />
          <div className="leading-tight">
            <div className="font-medium tracking-tight text-bn-ink">Chainwall · 2-of-2 Treasury</div>
            <div className="text-[11px] text-bn-muted font-mono">Whitechain Testnet · live multisig</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {!connected ? (
              <button onClick={login} disabled={!ready}
                className="rounded-full bg-bn-ink text-bn-paper h-9 px-4 font-semibold text-sm disabled:opacity-40">
                Connect wallet
              </button>
            ) : (
              <>
                {wrongChain ? switchBtn : (
                  <span className="rounded-full bg-bn-paper-2 h-9 px-3 grid place-items-center font-mono text-xs text-bn-ink-2">{short(address)}</span>
                )}
                <button onClick={logout} className="rounded-full border border-bn-line h-9 px-3 text-sm text-bn-ink-2 hover:text-bn-ink">Disconnect</button>
              </>
            )}
          </div>
        </header>
      )}

      <main className={`grid gap-5 lg:grid-cols-[1.4fr_1fr] ${embedded ? "max-w-page mx-auto px-4 sm:px-6 lg:px-10 pt-6 pb-10" : "max-w-page mx-auto px-5 sm:px-6 py-8"}`}>
        {/* left: the flow */}
        <div className="grid gap-5">
          <GuideBar tone={guide.tone} text={guide.text} />
          {wrongChain && (
            <button onClick={() => switchChain({ chainId: whitechainTestnet.id })}
              className="rounded-panel border border-bn-amber-glow/40 bg-bn-amber-glow/[0.1] text-bn-amber px-4 py-3 text-sm font-medium text-left">
              Wrong network, switch to Whitechain Testnet (1874) from the top bar, or tap here.
            </button>
          )}

          {/* step 1, propose */}
          <Section n={1} title="Propose a treasury transfer" done={!!opId}>
            <p className="text-sm text-bn-ink-2 mb-3">A relayer proposes the transfer. It then needs <b className="font-medium text-bn-ink">both</b> treasury signers to approve, a real 2-of-2, enforced on-chain, plus a 1,000,000 USDC spending cap.</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESETS.map((p) => (
                <button key={p.amount} onClick={() => setAmount(p.amount)} disabled={!!opId}
                  className={`rounded-full px-3 h-9 text-sm font-medium border transition-colors disabled:opacity-40 ${amount === p.amount ? (p.tone === "hot" ? "border-bn-ember-glow/60 text-bn-ember-ink bg-bn-ember/[0.08]" : "border-bn-seal/50 text-bn-seal bg-bn-seal-glow/[0.08]") : "border-bn-line text-bn-ink-2 hover:text-bn-ink"}`}>
                  {p.label} USDC <span className="text-bn-muted font-normal">· {p.note}</span>
                </button>
              ))}
            </div>
            <button onClick={propose} disabled={!connected || !!opId || proposing || wrongChain}
              className="inline-flex items-center gap-2 rounded-full bg-bn-ink text-bn-paper px-4 h-10 text-sm font-semibold disabled:opacity-40">
              {proposing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Propose {amount.toLocaleString("en-US")} USDC
            </button>
            {opId && <p className="mt-3 text-xs font-mono text-bn-muted">operation #{opId} created · awaiting 2 signatures</p>}
          </Section>

          {/* step 2, approvals */}
          <Section n={2} title="Two wallets sign" done={bothApproved} muted={!opId}>
            {pending.length > 0 && (
              <div className="mb-3">
                <div className="text-[11px] uppercase tracking-wide text-bn-muted mb-2">Open proposals, pick one to sign</div>
                <div className="flex flex-wrap gap-2">
                  {pending.map((p) => (
                    <button key={p.operationId} onClick={() => { setOpId(p.operationId); setProposedAmount(p.amount); setResult(null); }}
                      className={`rounded-full px-3 h-8 text-xs font-mono border transition-colors ${opId === p.operationId ? "border-bn-seal/50 text-bn-seal bg-bn-seal-glow/[0.08]" : "border-bn-line text-bn-ink-2 hover:text-bn-ink"}`}>
                      #{p.operationId} · {p.amount.toLocaleString("en-US")} USDC
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              {DEMO.approvers.map((a, i) => {
                const stillPending = opId ? canState[i] === true : true;
                const signed = opId ? canState[i] === false : false;
                const isMe = a.address.toLowerCase() === address?.toLowerCase();
                return (
                  <div key={a.address} className={`rounded-panel border p-4 ${signed ? "border-bn-seal/40 bg-bn-seal-glow/[0.06]" : "border-bn-line bg-bn-card"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-bn-ink">{a.label}{isMe && <span className="ml-2 text-[10px] uppercase tracking-wide text-bn-muted">you</span>}</span>
                      {signed ? <span className="inline-flex items-center gap-1 text-bn-seal text-xs font-medium"><Check className="h-3.5 w-3.5" />Signed</span>
                        : <span className="text-bn-muted text-xs">Pending</span>}
                    </div>
                    <div className="font-mono text-[11px] text-bn-muted mt-1">{short(a.address)}</div>
                    {opId && isMe && stillPending && (
                      <button onClick={approve} disabled={isPending || receipt.isLoading || wrongChain}
                        className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-full bg-bn-ink text-bn-paper h-9 text-sm font-semibold disabled:opacity-40">
                        {isPending || receipt.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Sign approval
                      </button>
                    )}
                    {opId && !isMe && stillPending && <p className="mt-3 text-[11px] text-bn-muted">Switch to this wallet in the top bar to sign.</p>}
                  </div>
                );
              })}
            </div>
            {opId && <p className="mt-3 text-xs text-bn-muted">{approvedCount} of 2 signatures{bothApproved ? " · threshold met ✓" : ""}</p>}
            {writeError && <p className="mt-2 text-xs text-bn-ember-ink">{(writeError as any).shortMessage || writeError.message}</p>}
          </Section>

          {/* step 3, execute */}
          <Section n={3} title="Execute" done={result?.ok === true} muted={!bothApproved}>
            <button onClick={execute} disabled={!bothApproved || executing}
              className="inline-flex items-center gap-2 rounded-full bg-bn-ink text-bn-paper px-4 h-10 text-sm font-semibold disabled:opacity-40">
              {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Execute transfer
            </button>
            {result?.ok && (
              <div className="mt-3 rounded-panel border border-bn-seal/40 bg-bn-seal-glow/[0.06] p-3 text-sm">
                <div className="flex items-center gap-2 text-bn-seal font-medium"><Check className="h-4 w-4" />Executed, {proposedAmount?.toLocaleString("en-US")} USDC moved from the vault</div>
                {result.txHash && <a className="mt-1 inline-flex items-center gap-1 text-xs text-bn-muted hover:text-bn-ink font-mono" href={`${DEMO.explorer}/tx/${result.txHash}`} target="_blank" rel="noreferrer">{short(result.txHash)} <ExternalLink className="h-3 w-3" /></a>}
              </div>
            )}
            {result && !result.ok && (
              <div className="mt-3 rounded-panel border border-bn-ember-glow/40 bg-bn-ember/[0.06] p-3 text-sm">
                <div className="flex items-center gap-2 text-bn-ember-ink font-medium"><Ban className="h-4 w-4" />Refused by policy, {result.reason === "ERR_01" ? "over the 1,000,000 USDC spending cap" : result.reason}</div>
                <div className="mt-1 text-xs text-bn-ink-2">The 2-of-2 approvals were met, but the spending-cap program still blocked it. No funds moved.</div>
              </div>
            )}
          </Section>
        </div>

        {/* right: tenant + balances */}
        <aside className="grid gap-4 h-max lg:sticky lg:top-24">
          <div className="rounded-panel border border-bn-line bg-bn-card p-4">
            <div className="text-[11px] font-mono uppercase tracking-wide text-bn-muted mb-3">Governed vault · USDC</div>
            <div className="flex items-baseline justify-between"><span className="text-bn-ink-2 text-sm">Vault</span><span className="font-mono tabular-nums text-lg text-bn-ink">{vaultBal.data !== undefined ? fmtUSDC(vaultBal.data as bigint) : "…"}</span></div>
            <div className="flex items-baseline justify-between mt-1"><span className="text-bn-ink-2 text-sm">Recipient</span><span className="font-mono tabular-nums text-bn-ink">{recipBal.data !== undefined ? fmtUSDC(recipBal.data as bigint) : "…"}</span></div>
          </div>
          <div className="rounded-panel border border-bn-line bg-bn-card p-4 text-[12px]">
            <div className="text-[11px] font-mono uppercase tracking-wide text-bn-muted mb-3">Tenant · Whitechain 1874</div>
            {[["Registry", DEMO.registry], ["Interact", DEMO.interact], ["Vault", DEMO.vault], ["Token (USDC)", DEMO.token]].map(([k, v]) => (
              <a key={k} href={`${DEMO.explorer}/address/${v}`} target="_blank" rel="noreferrer" className="flex items-center justify-between py-1 hover:text-bn-ink text-bn-ink-2">
                <span>{k}</span><span className="font-mono text-bn-muted inline-flex items-center gap-1">{short(v)}<ExternalLink className="h-3 w-3" /></span>
              </a>
            ))}
            <div className="flex items-center justify-between py-1 text-bn-ink-2 border-t border-bn-line mt-2 pt-2"><span>Policy</span><span className="font-mono text-bn-muted">treasury-2of2</span></div>
            <div className="flex items-center justify-between py-1 text-bn-ink-2"><span>Spending cap</span><span className="font-mono text-bn-muted">1,000,000 USDC</span></div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function GuideBar({ tone, text }: { tone: "info" | "warn" | "ok"; text: string }) {
  const map = {
    info: { cls: "border-bn-line bg-bn-paper-2/60 text-bn-ink-2", Icon: Info, iconCls: "text-bn-ink-2" },
    warn: { cls: "border-bn-amber-glow/40 bg-bn-amber-glow/[0.1] text-bn-amber", Icon: AlertTriangle, iconCls: "text-bn-amber" },
    ok: { cls: "border-bn-seal/40 bg-bn-seal-glow/[0.08] text-bn-seal", Icon: Check, iconCls: "text-bn-seal" },
  } as const;
  const { cls, Icon, iconCls } = map[tone];
  return (
    <div className={`flex items-start gap-2.5 rounded-panel border px-4 py-3 text-[13.5px] leading-snug ${cls}`}>
      <Icon className={`h-4 w-4 mt-0.5 flex-none ${iconCls}`} />
      <span>{text}</span>
    </div>
  );
}

function Section({ n, title, children, done, muted }: { n: number; title: string; children: React.ReactNode; done?: boolean; muted?: boolean }) {
  return (
    <section className={`rounded-panel border bg-bn-card p-5 ${muted ? "border-bn-line opacity-60" : done ? "border-bn-seal/40" : "border-bn-line"}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`grid place-items-center h-6 w-6 rounded-full text-xs font-semibold ${done ? "bg-bn-seal text-bn-paper" : "bg-bn-paper-2 text-bn-ink-2 border border-bn-line"}`}>{done ? <Check className="h-3.5 w-3.5" /> : n}</span>
        <h2 className="font-medium text-bn-ink">{title}</h2>
      </div>
      {children}
    </section>
  );
}
