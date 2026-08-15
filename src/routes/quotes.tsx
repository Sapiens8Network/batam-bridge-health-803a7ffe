import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { CostComparison } from "@/components/hub/CostComparison";
import { MedicalDisclaimer } from "@/components/hub/Disclaimer";
import { Pill } from "@/components/hub/Pill";
import { QuoteBuilder } from "@/components/hub/QuoteBuilder";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/hub/StateBlocks";
import { HospitalShell, PageHeader } from "@/components/layout/HospitalShell";
import { Button } from "@/components/ui/button";
import { inquiriesQuery } from "@/lib/api/queries";
import { sgd, relative } from "@/lib/format";
import { quoteTotals } from "@/lib/quote-math";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/quotes")({
  head: () => ({
    meta: [
      { title: "Quote Builder · Health Tourism Hub" },
      {
        name: "description",
        content:
          "Review AI-estimated medical and travel costs, override line items and send hospital-approved quotes to Singapore patients.",
      },
      { property: "og:title", content: "Quote Builder · Health Tourism Hub" },
      { property: "og:description", content: "Adjust and approve cross-border treatment quotes." },
    ],
  }),
  component: QuotesPage,
});

const quoteStatusMeta = {
  DRAFT: { label: "AI estimate", tone: "info" },
  PENDING_DOCTOR: { label: "Pending doctor", tone: "warning" },
  APPROVED: { label: "Approved", tone: "batam" },
  SENT_TO_PATIENT: { label: "Sent to patient", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
} as const;

function QuotesPage() {
  const { data, isPending, isError, refetch } = useQuery(inquiriesQuery());
  const [selected, setSelected] = useState<string | null>(null);
  const active = data?.find((v) => v.inquiry.id === selected) ?? data?.[0];

  return (
    <HospitalShell>
      <PageHeader
        title="Quotes"
        description="AI produces the estimate — the hospital owns the final price sent to the patient"
      />

      {isPending ? (
        <LoadingBlock label="Loading quotes" rows={4} />
      ) : isError ? (
        <ErrorBlock onRetry={() => void refetch()} />
      ) : !active ? (
        <EmptyBlock title="No quotes yet" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[20rem_1fr]">
          <ol className="max-h-[42rem] space-y-2 overflow-y-auto">
            {(data ?? []).map((v) => {
              const t = quoteTotals(v.quote);
              const meta = quoteStatusMeta[v.quote.status];
              return (
                <li key={v.inquiry.id}>
                  <button
                    onClick={() => setSelected(v.inquiry.id)}
                    className={cn(
                      "w-full rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40",
                      v.inquiry.id === active.inquiry.id && "border-primary bg-accent/40",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{v.patient.name}</span>
                      <Pill tone={meta.tone}>{meta.label}</Pill>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{v.inquiry.aiRequest.treatment}</p>
                    <p className="mt-1 text-xs font-medium tabular-nums text-batam">
                      {sgd(t.packageTotal)} · saves {sgd(t.savings)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{relative(v.quote.updatedAt)}</p>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">
                  {active.patient.name} · {active.inquiry.reference}
                </h2>
                <p className="text-xs text-muted-foreground">{active.hospital.name}</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/inquiries/$id" params={{ id: active.inquiry.id }}>
                  Open full case
                </Link>
              </Button>
            </div>

            <CostComparison
              breakdown={active.quote.breakdown}
              benchmark={active.quote.singaporeBenchmark}
              treatmentLabel={active.inquiry.aiRequest.treatment}
            />
            <QuoteBuilder quote={active.quote} itineraryId={active.itinerary?.id ?? null} />
            <MedicalDisclaimer />
          </div>
        </div>
      )}
    </HospitalShell>
  );
}
