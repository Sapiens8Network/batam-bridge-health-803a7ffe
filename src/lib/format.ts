export const sgd = (value: number, opts: { compact?: boolean } = {}) =>
  new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    maximumFractionDigits: 0,
    notation: opts.compact ? "compact" : "standard",
  }).format(value);

export const pct = (value: number, digits = 1) => `${value.toFixed(digits)}%`;

export const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", hour12: false });

export const dateShort = (iso: string) =>
  new Date(iso).toLocaleDateString("en-SG", { day: "2-digit", month: "short" });

export const dateTime = (iso: string) => `${dateShort(iso)} · ${clock(iso)}`;

export const duration = (ms: number | null) =>
  ms === null ? "—" : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;

export const relative = (iso: string, now = Date.now()) => {
  const diff = now - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};
