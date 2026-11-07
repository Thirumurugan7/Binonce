"use client";

import { useEffect, useRef, useState } from "react";
import { Wallet, ChevronDown, Check, LogOut, AlertTriangle } from "lucide-react";
import { useOperatorWallet } from "@/app/defense/wallet-context";
import { APP_CHAINS } from "@/lib/demo-config";
import { shortAddr } from "@/lib/format";

const shortChain = (name: string) => name.replace(/\s*Testnet$/i, "");

/**
 * Shared wallet control for the app top bar. One connect button across /attack and /defense, with a
 * menu to switch between the supported networks (Whitechain ↔ Sepolia) and disconnect. Renders
 * nothing when Privy isn't configured, the pages then run server-driven.
 */
export function WalletMenu() {
  const wallet = useOperatorWallet();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onEsc); };
  }, [open]);

  if (!wallet) return null; // Privy not configured

  if (!wallet.connected) {
    return (
      <button onClick={wallet.login} disabled={!wallet.ready}
        className="bn-focus inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-bn-line bg-bn-card text-[13px] text-bn-ink hover:bg-bn-paper-2 disabled:opacity-50 transition-colors">
        <Wallet className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Connect wallet</span><span className="sm:hidden">Connect</span>
      </button>
    );
  }

  const current = APP_CHAINS.find((c) => c.id === wallet.chainId);
  const dotTone = wallet.wrongChain ? "bg-bn-amber-glow" : "bg-bn-seal";

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu"
        className="bn-focus inline-flex items-center gap-2 h-8 pl-2.5 pr-2 rounded-full border border-bn-line bg-bn-card text-[13px] text-bn-ink hover:bg-bn-paper-2 transition-colors">
        <span className={`h-1.5 w-1.5 rounded-full ${dotTone}`} aria-hidden />
        <span className="hidden sm:inline text-bn-ink-2">{wallet.wrongChain ? "Wrong network" : current ? shortChain(current.name) : "Network"}</span>
        <span className="font-mono text-[12px]">{shortAddr(wallet.address)}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-bn-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div role="menu"
          className="absolute right-0 mt-2 w-60 rounded-panel border border-bn-line bg-bn-card shadow-bn-2 p-1.5 z-[60]">
          <div className="px-2.5 pt-1.5 pb-1 text-[11px] uppercase tracking-wide text-bn-muted">Network</div>
          {wallet.wrongChain && (
            <div className="mx-1 mb-1 flex items-center gap-1.5 rounded-data bg-bn-amber-glow/[0.12] px-2.5 py-1.5 text-[12px] text-bn-amber">
              <AlertTriangle className="h-3.5 w-3.5 flex-none" /> Connected to an unsupported network.
            </div>
          )}
          {APP_CHAINS.map((c) => {
            const active = c.id === wallet.chainId;
            return (
              <button key={c.id} role="menuitem" onClick={() => { wallet.switchChain(c.id); setOpen(false); }}
                className="bn-focus w-full flex items-center gap-2 h-9 px-2.5 rounded-data text-[13px] text-bn-ink hover:bg-bn-paper-2 transition-colors">
                <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-bn-seal" : "bg-bn-line"}`} aria-hidden />
                <span className="flex-1 text-left">{shortChain(c.name)}</span>
                {active && <Check className="h-4 w-4 text-bn-seal" />}
              </button>
            );
          })}
          <div className="my-1.5 border-t border-bn-line" />
          <div className="px-2.5 pb-1 font-mono text-[11.5px] text-bn-muted break-all">{wallet.address}</div>
          <button role="menuitem" onClick={() => { wallet.logout(); setOpen(false); }}
            className="bn-focus w-full flex items-center gap-2 h-9 px-2.5 rounded-data text-[13px] text-bn-ink-2 hover:text-bn-ink hover:bg-bn-paper-2 transition-colors">
            <LogOut className="h-4 w-4" /> Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
