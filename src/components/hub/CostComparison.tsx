import { ArrowRight, PiggyBank } from "lucide-react";

import { Pill } from "@/components/hub/Pill";
import { sgd, pct } from "@/lib/format";
import { breakdownLabels, computeTotals, medicalKeys, travelKeys } from "@/lib/quote-math";
import { ESTIMATE_NOTE } from "@/lib/status";
import type { CostBreakdown, SingaporeBenchmark } from "@/lib/types";
import { cn } from "@/lib/utils";

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <span className={cn("truncate", muted ? "text-muted-foreground" : "text-foreground/80")}>
        {label}
      </span>
      <span className="shrink-0 font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export function CostComparison({
  breakdown,
  benchmark,
  treatmentLabel,
  className,
}: {
  breakdown: CostBreakdown;
  benchmark: SingaporeBenchmark;
  treatmentLabel: string;
  className?: string;
}) {
  const totals = computeTotals(breakdown, benchmark);

  return (
    <section
      className={cn("overflow-hidden rounded-xl border bg-card", className)}
      aria-label="Cost comparison"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Cost comparison · {treatmentLabel}
          </h3>
          <p className="text-xs text-muted-foreground">
            Singapore benchmark versus complete Batam package
          </p>
        </div>
        <Pill tone="warning">{ESTIMATE_NOTE}</Pill>
      </header>

      <div className="grid gap-px bg-border sm:grid-cols-2">
        <div className="bg-card p-4">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-singapore" />
            <h4 className="text-xs font-semibold uppercase tracking-wide text-singapore">
              Singapore
            </h4>
          </div>
          <div className="mt-3 divide-y divide-border/60">
            <Row label="Treatment" value={sgd(benchmark.treatment)} />
            <Row label="Travel" value={sgd(benchmark.travel)} muted />
            <Row label="Accommodation" value={sgd(benchmark.accommodation)} muted />
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t pt-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total
            </span>
            <span className="text-xl font-semibold tabular-nums text-singapore">
              {sgd(totals.benchmarkTotal)}
            </span>
          </div>
        </div>

        <div className="bg-card p-4">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-batam" />
            <h4 className="text-xs font-semibold uppercase tracking-wide text-batam">
              Batam medical tourism
            </h4>
          </div>
          <div className="mt-3 divide-y divide-border/60">
            {medicalKeys
              .filter((k) => breakdown[k] > 0)
              .map((k) => (
                <Row key={k} label={breakdownLabels[k]} value={sgd(breakdown[k])} />
              ))}
            {travelKeys
              .filter((k) => breakdown[k] > 0)
              .map((k) => (
                <Row key={k} label={breakdownLabels[k]} value={sgd(breakdown[k])} />
              ))}
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t pt-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total
            </span>
            <span className="text-xl font-semibold tabular-nums text-batam">
              {sgd(totals.packageTotal)}
            </span>
          </div>
        </div>
      </div>

      <footer className="journey-gradient flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-primary-foreground">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide">
          Singapore <ArrowRight className="size-3.5" /> Batam
        </div>
        <div className="flex items-center gap-3">
          <PiggyBank className="size-5" />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide opacity-90">
              Estimated saving
            </p>
            <p className="text-lg font-semibold tabular-nums">
              {sgd(totals.savings)}{" "}
              <span className="text-sm font-medium opacity-90">· {pct(totals.savingsPct)}</span>
            </p>
          </div>
        </div>
      </footer>
    </section>
  );
}
