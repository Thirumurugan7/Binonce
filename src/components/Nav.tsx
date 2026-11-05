const LINKS = ["Buy Crypto", "Markets", "Trade", "Futures", "Earn", "Square", "More"];

function BinanceLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 2000 2000" aria-hidden>
      <path
        fill="#F0B90B"
        d="M611.6 756.2L1000 367.8l388.6 388.6 226-226L1000-84 385.4 530.4l226.2 225.8zM-84 1000l226-226 226 226-226 226zm695.6 243.8L1000 1632.2l388.4-388.6 226.2 225.8-.2.2L1000 2084 385.4 1469.6l-.4-.4zM1632 1000l226-226 226 226-226 226zm-463.8-.2h.2L1000 830.6 1139.8 970.4l29.8 29.8-174 174z"
      />
    </svg>
  );
}

export function Nav() {
  return (
    <header className="sticky top-0 z-40 h-16 bg-surface border-b border-line flex items-center gap-7 px-6">
      <div className="flex items-center">
        <BinanceLogo />
        <span className="ml-2 text-xl font-bold tracking-tight">BINANCE</span>
      </div>
      <nav className="hidden md:flex gap-6">
        {LINKS.map((l) => (
          <span key={l} className="text-sm font-semibold text-ink-2 hover:text-yellow cursor-pointer whitespace-nowrap">
            {l}
          </span>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-5 text-ink-3">
        <span className="cursor-pointer hover:text-ink">🔍</span>
        <span className="text-ink-2 font-semibold cursor-pointer hover:text-yellow">Deposit</span>
        <span className="text-ink-2 font-semibold cursor-pointer hover:text-yellow">Wallet</span>
        <span className="text-ink-2 font-semibold cursor-pointer hover:text-yellow hidden sm:inline">Orders</span>
        <span className="cursor-pointer hover:text-ink">🔔</span>
        <span className="cursor-pointer hover:text-ink">👤</span>
      </div>
    </header>
  );
}
