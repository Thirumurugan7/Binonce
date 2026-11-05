"use client";

export interface ToastItem {
  id: number;
  kind: "ok" | "warn";
  title: string;
  sub: string;
}

export function Toasts({ items, shifted }: { items: ToastItem[]; shifted: boolean }) {
  return (
    <div
      className="fixed top-[76px] z-[70] flex flex-col gap-2.5 w-[340px] max-w-[90vw] transition-[right] duration-300"
      style={{ right: shifted ? 460 : 20 }}
    >
      {items.map((t) => (
        <div
          key={t.id}
          className="bg-surface border border-line rounded-[10px] px-4 py-3.5 shadow-toast flex gap-3 items-start animate-toastin"
        >
          <div
            className={`w-[22px] h-[22px] flex-none rounded-full flex items-center justify-center text-[13px] ${
              t.kind === "ok" ? "bg-[#E6F9F1] text-up" : "bg-[#FEF0F0] text-down"
            }`}
          >
            {t.kind === "ok" ? "✓" : "!"}
          </div>
          <div>
            <b className="block text-[13px] font-semibold">{t.title}</b>
            <span className="text-ink-3 text-[12.5px]">{t.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
