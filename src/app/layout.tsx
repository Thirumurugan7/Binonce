import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Instrument_Serif } from "next/font/google";
import "./globals.css";

// Editorial display face for the landing page (one weight + italic, by design).
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif", display: "swap" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://binonce.vercel.app";
const DESCRIPTION =
  "Binonce replays EIP-7702 wallet drains on a real chain, step by step, starting with the October 2026 Binance hot-wallet drain, and records every sweeper it sees to a public on-chain blacklist.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Binonce, A valid signature is not an approved action", template: "%s" },
  description: DESCRIPTION,
  // opengraph-image.png and twitter-image.png in this folder are picked up automatically.
  openGraph: { title: "Binonce", description: DESCRIPTION, siteName: "Binonce", type: "website", url: SITE_URL },
  twitter: { card: "summary_large_image", title: "Binonce", description: DESCRIPTION },
};

// Before paint: apply the saved theme (or the system one) and skip the intro after the first visit this session.
const PREPAINT = `(function(){var d=document.documentElement;try{var t=localStorage.getItem('theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark')d.classList.add('dark');}catch(e){}try{if(sessionStorage.getItem('bn-intro')){d.setAttribute('data-intro','skip');}else{sessionStorage.setItem('bn-intro','1');}}catch(e){d.setAttribute('data-intro','skip');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREPAINT }} />
      </head>
      <body className="bn-scope font-sans antialiased bg-bn-paper text-bn-ink">{children}</body>
    </html>
  );
}
