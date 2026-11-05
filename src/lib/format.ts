export const num = (v: string | number) => Number(String(v).replace(/,/g, "")) || 0;

export const money = (x: number) =>
  x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const amount = (x: number, max = 4) =>
  x.toLocaleString("en-US", { maximumFractionDigits: max });

export const shortAddr = (a?: string) =>
  a && a.startsWith("0x") && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || "—";

export const clock = (t?: number) =>
  new Date(t || Date.now()).toLocaleTimeString("en-GB");
