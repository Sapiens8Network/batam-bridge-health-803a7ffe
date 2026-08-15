import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Columns3, Table2 } from "lucide-react";
import { useMemo, useState } from "react";

import { ChannelPill, InquiryCard } from "@/components/hub/InquiryCard";
import { ConfidenceBar, Pill } from "@/components/hub/Pill";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/hub/StateBlocks";
import { HospitalShell, PageHeader } from "@/components/layout/HospitalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inquiriesQuery } from "@/lib/api/queries";
import { pct, sgd } from "@/lib/format";
import { quoteTotals } from "@/lib/quote-math";
import { inquiryStatusMeta, pipelineOrder, priorityMeta, reviewMeta } from "@/lib/status";

export const Route = createFileRoute("/inquiries/")({
  head: () => ({
    meta: [
      { title: "Live Inquiry Pipeline · MedBridge Pass" },
      {
        name: "description",
        content:
          "Kanban and table views of every Singapore patient inquiry from AI processing through hospital approval and confirmed Batam booking.",
      },
      { property: "og:title", content: "Live Inquiry Pipeline · MedBridge Pass" },
      { property: "og:description", content: "Track every cross-border patient inquiry through the approval workflow." },
    ],
  }),
  component: InquiriesPage,
});

function InquiriesPage() {
  const { data, isPending, isError, refetch } = useQuery(inquiriesQuery());
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter((v) =>
      [v.patient.name, v.inquiry.reference, v.inquiry.aiRequest.treatment]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [data, search]);

  const columns = pipelineOrder
    .map((status) => ({ status, items: filtered.filter((v) => v.inquiry.status === status) }))
    .filter((c) => c.items.length > 0 || ["NEW_INQUIRY", "HOSPITAL_REVIEW_REQUIRED", "QUOTE_APPROVED"].includes(c.status));

  return (
    <HospitalShell>
      <PageHeader
        title="Live inquiry pipeline"
        description="Every Singapore lead, from inbound message to completed Batam journey"
        actions={
          <>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by patient, reference, treatment"
              className="h-9 w-full sm:w-64"
            />
            <div className="flex rounded-lg border p-0.5">
              <Button
                variant={view === "kanban" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView("kanban")}
                className="h-8"
              >
                <Columns3 className="size-4" /> Kanban
              </Button>
              <Button
                variant={view === "table" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView("table")}
                className="h-8"
              >
                <Table2 className="size-4" /> Table
              </Button>
            </div>
          </>
        }
      />

      {isPending ? (
        <LoadingBlock label="Loading pipeline" rows={4} />
      ) : isError ? (
        <ErrorBlock onRetry={() => void refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyBlock title="No inquiries match" description="Adjust your filter or wait for the next inbound message." />
      ) : view === "kanban" ? (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-3">
          {columns.map((column) => {
            const meta = inquiryStatusMeta[column.status];
            return (
              <section key={column.status} className="w-72 shrink-0" aria-label={meta.label}>
                <header className="mb-2 flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Pill tone={meta.tone} dot>
                      {meta.short}
                    </Pill>
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">{column.items.length}</span>
                </header>
                <div className="space-y-2">
                  {column.items.map((v) => (
                    <InquiryCard key={v.inquiry.id} view={v} />
                  ))}
                  {column.items.length === 0 ? (
                    <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                      Empty
                    </p>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Treatment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>AI confidence</TableHead>
                <TableHead className="text-right">SG benchmark</TableHead>
                <TableHead className="text-right">Batam package</TableHead>
                <TableHead className="text-right">Saving</TableHead>
                <TableHead>Travel date</TableHead>
                <TableHead>Hospital</TableHead>
                <TableHead>Doctor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => {
                const totals = quoteTotals(v.quote);
                const meta = inquiryStatusMeta[v.inquiry.status];
                return (
                  <TableRow key={v.inquiry.id}>
                    <TableCell>
                      <Link to="/inquiries/$id" params={{ id: v.inquiry.id }} className="font-medium hover:underline">
                        {v.patient.name}
                      </Link>
                      <span className="block text-[11px] text-muted-foreground">
                        {v.patient.country} · {v.inquiry.reference}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ChannelPill channel={v.inquiry.channel} />
                    </TableCell>
                    <TableCell className="text-sm">{v.inquiry.aiRequest.treatment}</TableCell>
                    <TableCell>
                      <Pill tone={meta.tone}>{meta.short}</Pill>
                    </TableCell>
                    <TableCell>
                      <Pill tone={priorityMeta[v.inquiry.priority].tone} dot>
                        {priorityMeta[v.inquiry.priority].label}
                      </Pill>
                    </TableCell>
                    <TableCell>
                      <ConfidenceBar value={v.inquiry.aiRequest.confidence} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-singapore">{sgd(totals.benchmarkTotal)}</TableCell>
                    <TableCell className="text-right tabular-nums text-batam">{sgd(totals.packageTotal)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium text-success">
                      {sgd(totals.savings)} · {pct(totals.savingsPct, 0)}
                    </TableCell>
                    <TableCell className="text-sm">{v.patient.preferredDate}</TableCell>
                    <TableCell>
                      <Pill tone={reviewMeta[v.inquiry.hospitalReview].tone}>
                        {reviewMeta[v.inquiry.hospitalReview].label}
                      </Pill>
                    </TableCell>
                    <TableCell>
                      <Pill tone={reviewMeta[v.inquiry.doctorReview.state].tone}>
                        {reviewMeta[v.inquiry.doctorReview.state].label}
                      </Pill>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </HospitalShell>
  );
}
