import { useMutation } from "@tanstack/react-query";
import { Calculator, Check, Send, Stethoscope, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Pill } from "@/components/hub/Pill";
import { MedicalDisclaimer } from "@/components/hub/Disclaimer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { pct, sgd } from "@/lib/format";
import { breakdownLabels, computeTotals, medicalKeys, travelKeys } from "@/lib/quote-math";
import type { CostBreakdown, Quote } from "@/lib/types";

const quoteStatusTone = {
  DRAFT: "neutral",
  PENDING_DOCTOR: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  SENT_TO_PATIENT: "batam",
} as const;

export function QuoteBuilder({ quote, itineraryId }: { quote: Quote; itineraryId: string | null }) {
  const [draft, setDraft] = useState<CostBreakdown>(quote.breakdown);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) setDraft(quote.breakdown);
  }, [quote.breakdown, dirty]);

  const totals = computeTotals(draft, quote.singaporeBenchmark);

  const action = useMutation({
    mutationFn: (input: {
      action: "SAVE_DRAFT" | "REQUEST_DOCTOR" | "APPROVE" | "REJECT" | "SEND";
    }) => api.quoteAction(quote.id, { action: input.action, breakdown: draft }),
    onSuccess: (_res, input) => {
      setDirty(false);
      const label: Record<typeof input.action, string> = {
        SAVE_DRAFT: "Draft saved",
        REQUEST_DOCTOR: "Doctor review requested",
        APPROVE: "Quote approved — hospital pricing is now the source of truth",
        REJECT: "Quote rejected",
        SEND: "Quote sent to patient",
      };
      toast.success(label[input.action]);
    },
    onError: () => toast.error("Action failed — please retry"),
  });

  const set = (key: keyof CostBreakdown, value: string) => {
    setDirty(true);
    setDraft((prev) => ({ ...prev, [key]: Math.max(0, Number(value) || 0) }));
  };

  return (
    <section className="rounded-xl border bg-card" aria-label="Hospital quote builder">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Calculator className="size-4 text-primary" /> Hospital quote builder
          </h3>
          <p className="text-xs text-muted-foreground">
            Hospital edits override AI estimates. The backend remains the source of truth.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone={quote.source === "HOSPITAL_OVERRIDE" ? "batam" : "info"}>
            {quote.source === "HOSPITAL_OVERRIDE" ? "Hospital pricing" : "AI estimate"}
          </Pill>
          <Pill tone={quoteStatusTone[quote.status]}>{quote.status.replace(/_/g, " ")}</Pill>
        </div>
      </header>

      <div className="grid gap-4 p-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset className="space-y-2.5">
            <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Medical
            </legend>
            {medicalKeys.map((key) => (
              <div key={key} className="grid gap-1">
                <Label htmlFor={`q-${key}`} className="text-xs text-muted-foreground">
                  {breakdownLabels[key]}
                </Label>
                <Input
                  id={`q-${key}`}
                  type="number"
                  min={0}
                  value={draft[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className="h-9 tabular-nums"
                />
              </div>
            ))}
          </fieldset>
          <fieldset className="space-y-2.5">
            <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Travel & services
            </legend>
            {travelKeys.map((key) => (
              <div key={key} className="grid gap-1">
                <Label htmlFor={`q-${key}`} className="text-xs text-muted-foreground">
                  {breakdownLabels[key]}
                </Label>
                <Input
                  id={`q-${key}`}
                  type="number"
                  min={0}
                  value={draft[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className="h-9 tabular-nums"
                />
              </div>
            ))}
          </fieldset>
        </div>

        <div className="space-y-3">
          <dl className="rounded-lg border bg-muted/40 p-3 text-sm">
            {[
              ["Medical subtotal", sgd(totals.medicalSubtotal)],
              ["Travel subtotal", sgd(totals.travelSubtotal)],
              ["Singapore benchmark", sgd(totals.benchmarkTotal)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between py-1">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium tabular-nums">{value}</dd>
              </div>
            ))}
            <div className="mt-1 flex items-baseline justify-between border-t pt-2">
              <dt className="font-semibold text-foreground">Complete package</dt>
              <dd className="text-lg font-semibold tabular-nums text-batam">
                {sgd(totals.packageTotal)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-muted-foreground">Estimated savings</dt>
              <dd className="font-semibold tabular-nums text-success">
                {sgd(totals.savings)} · {pct(totals.savingsPct)}
              </dd>
            </div>
          </dl>

          {dirty ? <Pill tone="warning">Unsaved hospital edits</Pill> : null}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={action.isPending}
              onClick={() => action.mutate({ action: "SAVE_DRAFT" })}
            >
              <Save className="size-4" /> Save draft
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={action.isPending}
              onClick={() => action.mutate({ action: "REQUEST_DOCTOR" })}
            >
              <Stethoscope className="size-4" /> Doctor review
            </Button>
            <Button
              size="sm"
              disabled={action.isPending}
              onClick={() => action.mutate({ action: "APPROVE" })}
            >
              <Check className="size-4" /> Approve quote
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={action.isPending || quote.status === "DRAFT"}
              onClick={() => {
                action.mutate({ action: "SEND" });
                if (itineraryId) void api.sendItinerary(itineraryId);
              }}
            >
              <Send className="size-4" /> Send to patient
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="col-span-2 text-destructive hover:text-destructive"
              disabled={action.isPending}
              onClick={() => action.mutate({ action: "REJECT" })}
            >
              <X className="size-4" /> Reject quote
            </Button>
          </div>

          <MedicalDisclaimer compact />
        </div>
      </div>
    </section>
  );
}
