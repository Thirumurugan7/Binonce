import { DefenseProviders } from "./providers";

export default function DefenseLayout({ children }: { children: React.ReactNode }) {
  return <DefenseProviders>{children}</DefenseProviders>;
}
