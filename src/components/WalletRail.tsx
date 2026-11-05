const ITEMS = ["Overview", "Spot", "Funding", "Cross Margin", "Isolated Margin", "USD-M Futures", "Earn", "History"];

export function WalletRail() {
  return (
    <nav className="flex md:flex-col gap-1 overflow-x-auto">
      {ITEMS.map((it, i) => {
        const on = i === 0;
        return (
          <a
            key={it}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-data text-sm whitespace-nowrap cursor-pointer ${
              on ? "bg-[#FEF6D8] text-ink font-semibold" : "text-ink-2 font-medium hover:bg-surface-fill"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${on ? "bg-yellow" : "bg-transparent"}`} />
            {it}
          </a>
        );
      })}
    </nav>
  );
}
