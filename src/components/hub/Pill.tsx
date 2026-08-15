import { cn } from "@/lib/utils";
import { dotClass, toneClass, type Tone } from "@/lib/status";

export function Pill({
  tone = "neutral",
  children,
  dot = false,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 tracking-wide",
        toneClass[tone],
        className,
      )}
    >
      {dot ? <span className={cn("size-1.5 rounded-full", dotClass[tone])} /> : null}
      {children}
    </span>
  );
}

export function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function ConfidenceBar({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  const tone: Tone = percent >= 85 ? "success" : percent >= 75 ? "warning" : "danger";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", dotClass[tone])} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums text-foreground">{percent}%</span>
    </div>
  );
}
