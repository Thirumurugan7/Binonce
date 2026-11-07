"use client";

import { useState } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider, createConfig } from "@privy-io/wagmi";
import { http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { whitechainTestnet, sepoliaTestnet } from "@/lib/demo-config";
import { DefenseWalletBridge } from "./wallet-context";

// Same Privy/wagmi wiring as /demo — the connected wallet's network selects which tenant the run targets.
const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

const wagmiConfig = createConfig({
  chains: [whitechainTestnet, sepoliaTestnet],
  transports: {
    [whitechainTestnet.id]: http("https://rpc.ankr.com/whitechain_testnet"),
    [sepoliaTestnet.id]: http("https://rpc.sepolia.ethpandaops.io"),
  },
});

export function DefenseProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  if (!appId) return <>{children}</>; // no Privy configured -> page still works server-driven

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["wallet"],
        defaultChain: whitechainTestnet,
        supportedChains: [whitechainTestnet, sepoliaTestnet],
        embeddedWallets: { createOnLogin: "off" },
        appearance: { theme: "dark", accentColor: "#f0b90b", walletList: ["metamask", "rainbow", "wallet_connect", "detected_wallets"] },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <DefenseWalletBridge>{children}</DefenseWalletBridge>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
