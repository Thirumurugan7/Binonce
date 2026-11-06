"use client";

import { useState } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider, createConfig } from "@privy-io/wagmi";
import { http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { whitechainTestnet } from "@/lib/demo-config";

// Privy needs an appId from dashboard.privy.io — set NEXT_PUBLIC_PRIVY_APP_ID.
const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

const wagmiConfig = createConfig({
  chains: [whitechainTestnet],
  transports: { [whitechainTestnet.id]: http("https://rpc.ankr.com/whitechain_testnet") },
});

export function DemoProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  if (!appId) return <MissingAppId />;

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["wallet"],
        defaultChain: whitechainTestnet,
        supportedChains: [whitechainTestnet],
        embeddedWallets: { createOnLogin: "off" },
        appearance: {
          theme: "dark",
          accentColor: "#f0b90b",
          walletList: ["metamask", "rainbow", "wallet_connect", "detected_wallets"],
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

function MissingAppId() {
  return (
    <div className="min-h-screen grid place-items-center bg-surface-soft text-ink px-6">
      <div className="max-w-md rounded-card border border-line bg-surface p-6 text-center">
        <div className="font-bold mb-2">Privy app ID required</div>
        <p className="text-sm text-ink-2">
          This demo signs with Privy. Create a free app at{" "}
          <a className="text-yellow" href="https://dashboard.privy.io" target="_blank" rel="noreferrer">dashboard.privy.io</a>{" "}
          and set <code className="font-mono text-ink">NEXT_PUBLIC_PRIVY_APP_ID</code> in <code className="font-mono">.env</code>, then restart the dev server.
        </p>
      </div>
    </div>
  );
}
