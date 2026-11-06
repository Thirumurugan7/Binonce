/**
 * Tiny toast store (no dependency). Call `toast.loading(...)`, then `toast.success/error(id, ...)`
 * with the same id to turn a pending toast into its result.
 */
export type ToastKind = "loading" | "success" | "error" | "warning" | "info";
export interface ToastLink { href: string; label: string }
export interface Toast { id: string; kind: ToastKind; title: string; body?: string; link?: ToastLink; created: number; duration: number }

type Input = { title: string; body?: string; link?: ToastLink; duration?: number };
let toasts: Toast[] = [];
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
let seq = 0;

const DEFAULTS: Record<ToastKind, number> = { loading: Infinity, success: 5000, info: 5000, warning: 7000, error: 9000 };

function upsert(kind: ToastKind, id: string | undefined, input: Input): string {
  const tid = id ?? `t${++seq}`;
  const next: Toast = { id: tid, kind, ...input, created: Date.now(), duration: input.duration ?? DEFAULTS[kind] };
  const i = toasts.findIndex((t) => t.id === tid);
  toasts = i >= 0 ? toasts.map((t, j) => (j === i ? next : t)) : [...toasts, next].slice(-5);
  emit();
  return tid;
}

export const toast = {
  loading: (input: Input, id?: string) => upsert("loading", id, input),
  success: (input: Input, id?: string) => upsert("success", id, input),
  error: (input: Input, id?: string) => upsert("error", id, input),
  warning: (input: Input, id?: string) => upsert("warning", id, input),
  info: (input: Input, id?: string) => upsert("info", id, input),
  dismiss: (id: string) => { toasts = toasts.filter((t) => t.id !== id); emit(); },
  clear: () => { toasts = []; emit(); },
};

export function subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; }
export function snapshot() { return toasts; }
const EMPTY: Toast[] = [];
export function serverSnapshot() { return EMPTY; }
