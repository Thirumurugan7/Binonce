import { DefenseProviders } from "../defense/providers";

// Reuses the shared Privy/wagmi wallet wrapper (defined under /defense) so the attack page can read
// the connected wallet's network and target the matching tenant. Server-driven when no wallet is set.
export default function AttackLayout({ children }: { children: React.ReactNode }) {
  return <DefenseProviders>{children}</DefenseProviders>;
}
