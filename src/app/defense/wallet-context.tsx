"use client";

import { createContext, useContext, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useSwitchChain, useSignTypedData } from "wagmi";
import { APP_CHAINS } from "@/lib/demo-config";

const SUPPORTED: number[] = APP_CHAINS.map((c) => c.id);

export interface OperatorWallet {
  ready: boolean;
  connected: boolean;
  address?: `0x${string}`;
  chainId?: number; // the connected wallet's network (drives which tenant the run targets)
  wrongChain: boolean; // connected to a network the app doesn't support
  login: () => void;
  logout: () => void;
  switchChain: () => void;
  signTypedData: (td: {
    domain: Record<string, unknown>;
    types: Record<string, { name: string; type: string }[]>;
    primaryType: string;
    message: Record<string, unknown>;
  }) => Promise<`0x${string}`>;
}

const Ctx = createContext<OperatorWallet | null>(null);

/** Null when Privy isn't configured — the page then runs server-driven. */
export const useOperatorWallet = () => useContext(Ctx);

/** Lives inside PrivyProvider; exposes the connected operator wallet to the page via context. */
export function DefenseWalletBridge({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { signTypedDataAsync } = useSignTypedData();
  const connected = authenticated && isConnected;
  const wrongChain = connected && !SUPPORTED.includes(chainId ?? -1);

  const value = useMemo<OperatorWallet>(() => ({
    ready, connected, address, chainId, wrongChain, login, logout,
    // On an unsupported network, offer to switch to Whitechain (the default); Sepolia is reached by the wallet itself.
    switchChain: () => switchChain({ chainId: 1874 }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signTypedData: (td) => signTypedDataAsync(td as any),
  }), [ready, connected, address, chainId, wrongChain, login, logout, switchChain, signTypedDataAsync]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
