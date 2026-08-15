import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AiActivityPanel } from "@/components/hub/AiActivityPanel";
import { Pill } from "@/components/hub/Pill";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/hub/StateBlocks";
import { HospitalShell, PageHeader } from "@/components/layout/HospitalShell";
import { activityQuery, inquiriesQuery } from "@/lib/api/queries";
import { relative } from "@/lib/format";
import { inquiryStatusMeta } from "@/lib/status";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ai-activity")({
  head: () => ({
    meta: [
      { title: "AI Agent Activity · Health Tourism Hub" },
      {
        name: "description",
        content:
          "Real-time workflow events from the orchestration backend: treatment identification, pricing retrieval, itinerary generation and review flags.",
      },
      { property: "og:title", content: "AI Agent Activity · Health Tourism Hub" },
      { property: "og:description", content: "Audit the structured AI workflow behind every patient proposal." },
    ],
  }),
  component: AiActivityPage,
});

function AiActivityPage() {
  const inquiries = useQuery(inquiriesQuery());
  const [selected, setSelected] = useState<string | null>(null);
  const activeId = selected ?? inquiries.data?.[0]?.inquiry.id ?? null;
  const activity = useQuery({ ...activityQuery(activeId ?? undefined), enabled: Boolean(activeId) });

  const structured = (() => {
    const view = inquiries.data?.find((v) => v.inquiry.id === activeId);
    if (!view) return undefined;
    return {
      inquiryId: view.inquiry.id,
      status: view.inquiry.status,
      ai_extracted_request: view.inquiry.aiRequest,
      pricing: view.quote.breakdown,
      benchmark: view.quote.singaporeBenchmark,
      hospital_review: view.inquiry.hospitalReview,
      doctor_review: view.inquiry.doctorReview,
    };
  })();

  return (
    <HospitalShell>
      <PageHeader
        title="AI agent activity"
        description="Structured events emitted by the orchestration backend — never raw model reasoning"
      />

      {inquiries.isPending ? (
        <LoadingBlock label="Loading cases" rows={3} />
      ) : inquiries.isError ? (
        <ErrorBlock onRetry={() => void inquiries.refetch()} />
      ) : (inquiries.data ?? []).length === 0 ? (
        <EmptyBlock title="No AI activity yet" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[19rem_1fr]">
          <ol className="max-h-[38rem] space-y-2 overflow-y-auto">
            {(inquiries.data ?? []).map((v) => {
              const meta = inquiryStatusMeta[v.inquiry.status];
              return (
                <li key={v.inquiry.id}>
                  <button
                    onClick={() => setSelected(v.inquiry.id)}
                    className={cn(
                      "w-full rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40",
                      v.inquiry.id === activeId && "border-primary bg-accent/40",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{v.patient.name}</span>
                      <Pill tone={meta.tone}>{meta.short}</Pill>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {v.inquiry.aiRequest.treatment} · {relative(v.inquiry.updatedAt)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ol>

          {activity.isPending ? (
            <LoadingBlock label="Loading events" />
          ) : activity.isError ? (
            <ErrorBlock onRetry={() => void activity.refetch()} />
          ) : (
            <AiActivityPanel events={activity.data ?? []} structured={structured} />
          )}
        </div>
      )}
    </HospitalShell>
  );
}
