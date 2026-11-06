"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useReadContract, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ShieldCheck, Check, Loader2, ArrowRight, ExternalLink, Ban } from "lucide-react";
import { DEMO, INTERACT_ABI, ERC20_ABI, fmtUSDC, whitechainTestnet } from "@/lib/demo-config";

const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
const PRESETS = [
  { label: "250,000", amount: 250000, tone: "ok" as const, note: "under the 1M cap" },
  { label: "1,500,000", amount: 1500000, tone: "hot" as const, note: "over the 1M cap" },
];

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
      if (r.ok) { setOpId(null); refreshPending(false); } // op closed — drop from the pending list
    } finally { setExecuting(false); }
  }

  return (
    <div className={`${embedded ? "" : "min-h-screen"} bg-surface-soft text-ink`}>
      {/* header */}
      <header className={`${embedded ? "" : "sticky top-0 z-30"} h-16 bg-surface/95 backdrop-blur border-b border-line flex items-center gap-3 px-5 sm:px-6`}>
        <ShieldCheck className="h-5 w-5 text-up" />
        <div className="leading-tight">
          <div className="font-bold tracking-tight">Chainwall · 2-of-2 Treasury</div>
          <div className="text-[11px] text-ink-3 font-mono">Whitechain Testnet · live multisig</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!connected ? (
            <button onClick={login} disabled={!ready}
              className="rounded-chip bg-yellow text-night h-9 px-4 font-bold text-sm disabled:opacity-40">
              Connect Wallet
            </button>
          ) : (
            <>
              {wrongChain ? (
                <button onClick={() => switchChain({ chainId: whitechainTestnet.id })}
                  className="rounded-chip bg-down/15 text-down h-9 px-3 text-sm font-semibold">Wrong network</button>
              ) : (
                <span className="rounded-chip bg-surface-fill h-9 px-3 grid place-items-center font-mono text-xs text-ink-2">{short(address)}</span>
              )}
              <button onClick={logout} className="rounded-chip border border-line h-9 px-3 text-sm text-ink-2 hover:text-ink">Disconnect</button>
            </>
          )}
        </div>
      </header>

      <main className="max-w-shell mx-auto px-5 sm:px-6 py-8 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* left: the flow */}
        <div className="grid gap-5">
          {wrongChain && (
            <button onClick={() => switchChain({ chainId: whitechainTestnet.id })}
              className="rounded-card border border-yellow/40 bg-yellow/10 text-yellow px-4 py-3 text-sm font-medium text-left">
              Wrong network — click to switch to Whitechain Testnet (1874)
            </button>
          )}

          {/* step 1 — propose */}
          <Section n={1} title="Propose a treasury transfer" done={!!opId}>
            <p className="text-sm text-ink-2 mb-3">A relayer proposes the transfer. It then needs <b>both</b> treasury signers to approve — a real 2-of-2, enforced on-chain, plus a 1,000,000 USDC spending cap.</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESETS.map((p) => (
                <button key={p.amount} onClick={() => setAmount(p.amount)} disabled={!!opId}
                  className={`rounded-chip px-3 h-9 text-sm font-semibold border transition-colors disabled:opacity-40 ${amount === p.amount ? (p.tone === "hot" ? "border-down text-down bg-down/10" : "border-up text-up bg-up/10") : "border-line text-ink-2 hover:text-ink"}`}>
                  {p.label} USDC <span className="text-ink-4 font-normal">· {p.note}</span>
                </button>
              ))}
            </div>
            <button onClick={propose} disabled={!connected || !!opId || proposing || wrongChain}
              className="inline-flex items-center gap-2 rounded-chip bg-up text-night px-4 h-10 text-sm font-bold disabled:opacity-40">
              {proposing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Propose {amount.toLocaleString("en-US")} USDC
            </button>
            {opId && <p className="mt-3 text-xs font-mono text-ink-3">operation #{opId} created · awaiting 2 signatures</p>}
          </Section>

          {/* step 2 — approvals */}
          <Section n={2} title="Two wallets sign" done={bothApproved} muted={!opId}>
            {pending.length > 0 && (
              <div className="mb-3">
                <div className="text-[11px] uppercase tracking-wide text-ink-3 mb-2">Open proposals — pick one to sign</div>
                <div className="flex flex-wrap gap-2">
                  {pending.map((p) => (
                    <button key={p.operationId} onClick={() => { setOpId(p.operationId); setProposedAmount(p.amount); setResult(null); }}
                      className={`rounded-chip px-3 h-8 text-xs font-mono border transition-colors ${opId === p.operationId ? "border-up text-up bg-up/10" : "border-line text-ink-2 hover:text-ink"}`}>
                      #{p.operationId} · {p.amount.toLocaleString("en-US")} USDC
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              {DEMO.approvers.map((a, i) => {
                const pending = opId ? canState[i] === true : true;
                const signed = opId ? canState[i] === false : false;
                const isMe = a.address.toLowerCase() === address?.toLowerCase();
                return (
                  <div key={a.address} className={`rounded-card border p-4 ${signed ? "border-up/40 bg-up/5" : "border-line bg-surface"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{a.label}{isMe && <span className="ml-2 text-[10px] uppercase tracking-wide text-ink-4">you</span>}</span>
                      {signed ? <span className="inline-flex items-center gap-1 text-up text-xs font-semibold"><Check className="h-3.5 w-3.5" />Signed</span>
                        : <span className="text-ink-4 text-xs">Pending</span>}
                    </div>
                    <div className="font-mono text-[11px] text-ink-3 mt-1">{short(a.address)}</div>
                    {opId && isMe && pending && (
                      <button onClick={approve} disabled={isPending || receipt.isLoading || wrongChain}
                        className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-chip bg-yellow text-night h-9 text-sm font-bold disabled:opacity-40">
                        {isPending || receipt.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Sign approval
                      </button>
                    )}
                    {opId && !isMe && pending && <p className="mt-3 text-[11px] text-ink-4">Connect this wallet to sign.</p>}
                  </div>
                );
              })}
            </div>
            {opId && <p className="mt-3 text-xs text-ink-3">{approvedCount} of 2 signatures{bothApproved ? " · threshold met ✓" : ""}</p>}
            {writeError && <p className="mt-2 text-xs text-down">{(writeError as any).shortMessage || writeError.message}</p>}
          </Section>

          {/* step 3 — execute */}
          <Section n={3} title="Execute" done={result?.ok === true} muted={!bothApproved}>
            <button onClick={execute} disabled={!bothApproved || executing}
              className="inline-flex items-center gap-2 rounded-chip bg-ink text-surface px-4 h-10 text-sm font-bold disabled:opacity-40">
              {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Execute transfer
            </button>
            {result?.ok && (
              <div className="mt-3 rounded-card border border-up/40 bg-up/5 p-3 text-sm">
                <div className="flex items-center gap-2 text-up font-semibold"><Check className="h-4 w-4" />Executed — {proposedAmount?.toLocaleString("en-US")} USDC moved from the vault</div>
                {result.txHash && <a className="mt-1 inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink font-mono" href={`${DEMO.explorer}/tx/${result.txHash}`} target="_blank" rel="noreferrer">{short(result.txHash)} <ExternalLink className="h-3 w-3" /></a>}
              </div>
            )}
            {result && !result.ok && (
              <div className="mt-3 rounded-card border border-down/40 bg-down/5 p-3 text-sm">
                <div className="flex items-center gap-2 text-down font-semibold"><Ban className="h-4 w-4" />Refused by policy — {result.reason === "ERR_01" ? "over the 1,000,000 USDC spending cap" : result.reason}</div>
                <div className="mt-1 text-xs text-ink-3">The 2-of-2 approvals were met, but the spending-cap program still blocked it. No funds moved.</div>
              </div>
            )}
          </Section>
        </div>

        {/* right: tenant + balances */}
        <aside className="grid gap-4 h-max lg:sticky lg:top-24">
          <div className="rounded-card border border-line bg-surface p-4">
            <div className="text-[11px] font-mono uppercase tracking-wide text-ink-3 mb-3">Governed vault · USDC</div>
            <div className="flex items-baseline justify-between"><span className="text-ink-2 text-sm">Vault</span><span className="font-mono tabular-nums text-lg">{vaultBal.data !== undefined ? fmtUSDC(vaultBal.data as bigint) : "…"}</span></div>
            <div className="flex items-baseline justify-between mt-1"><span className="text-ink-2 text-sm">Recipient</span><span className="font-mono tabular-nums">{recipBal.data !== undefined ? fmtUSDC(recipBal.data as bigint) : "…"}</span></div>
          </div>
          <div className="rounded-card border border-line bg-surface p-4 text-[12px]">
            <div className="text-[11px] font-mono uppercase tracking-wide text-ink-3 mb-3">Tenant · Whitechain 1874</div>
            {[["Registry", DEMO.registry], ["Interact", DEMO.interact], ["Vault", DEMO.vault], ["Token (USDC)", DEMO.token]].map(([k, v]) => (
              <a key={k} href={`${DEMO.explorer}/address/${v}`} target="_blank" rel="noreferrer" className="flex items-center justify-between py-1 hover:text-ink text-ink-2">
                <span>{k}</span><span className="font-mono text-ink-3 inline-flex items-center gap-1">{short(v)}<ExternalLink className="h-3 w-3" /></span>
              </a>
            ))}
            <div className="flex items-center justify-between py-1 text-ink-2 border-t border-line mt-2 pt-2"><span>Policy</span><span className="font-mono text-ink-3">treasury-2of2</span></div>
            <div className="flex items-center justify-between py-1 text-ink-2"><span>Spending cap</span><span className="font-mono text-ink-3">1,000,000 USDC</span></div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Section({ n, title, children, done, muted }: { n: number; title: string; children: React.ReactNode; done?: boolean; muted?: boolean }) {
  return (
    <section className={`rounded-card border bg-surface p-5 ${muted ? "border-line opacity-60" : done ? "border-up/40" : "border-line"}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`grid place-items-center h-6 w-6 rounded-full text-xs font-bold ${done ? "bg-up text-night" : "bg-surface-fill text-ink-2 border border-line"}`}>{done ? <Check className="h-3.5 w-3.5" /> : n}</span>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}
