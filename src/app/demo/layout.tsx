import { DemoProviders } from "./providers";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <DemoProviders>{children}</DemoProviders>;
}
