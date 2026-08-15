import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  BadgeCheck,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  PlayCircle,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";

import { MedicalDisclaimer } from "@/components/hub/Disclaimer";
import { InquiryCard } from "@/components/hub/InquiryCard";
import { Pill } from "@/components/hub/Pill";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/hub/StateBlocks";
import { HospitalShell, PageHeader } from "@/components/layout/HospitalShell";
import { Button } from "@/components/ui/button";
import { dashboardQuery, inquiriesQuery } from "@/lib/api/queries";
import { runLiveDemo, simulateInboundMessage } from "@/lib/events/live";
import { clock, sgd } from "@/lib/format";
import { useUi } from "@/lib/ui-store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Operations Dashboard · MedBridge Pass" },
      {
        name: "description",
        content:
          "Live cross-border medical tourism operations: Singapore leads, AI itineraries, hospital reviews and confirmed Batam bookings.",
      },
      { property: "og:title", content: "Operations Dashboard · MedBridge Pass" },
      {
        property: "og:description",
        content: "Track Singapore patient leads, AI-generated itineraries and hospital approvals in one place.",
      },
    ],
  }),
  component: DashboardPage,
});

const kpiIcons = [Users, FileCheck2, ClipboardCheck, BadgeCheck, Activity, CircleDollarSign];

function DashboardPage() {
  const dashboard = useQuery(dashboardQuery());
  const inquiries = useQuery(inquiriesQuery());
  const demoRunning = useUi((s) => s.demoRunning);
  const [busy, setBusy] = useState(false);

  const summary = dashboard.data?.summary;
  const kpis = summary
    ? [
        { label: "Singapore leads", value: String(summary.singaporeLeads), hint: "Active patient inquiries" },
        { label: "AI itineraries generated", value: String(summary.itinerariesGenerated), hint: "Structured proposals" },
        { label: "Hospital reviews pending", value: String(summary.hospitalReviewsPending), hint: "Awaiting confirmation" },
        { label: "Confirmed bookings", value: String(summary.confirmedBookings), hint: "Travel-ready patients" },
        { label: "Completed patients", value: String(summary.completedPatients), hint: "Journeys closed" },
        { label: "Estimated patient savings", value: sgd(summary.estimatedSavings), hint: "Versus Singapore benchmark" },
      ]
    : [];

  const attention = (inquiries.data ?? []).filter(
    (v) =>
      v.inquiry.hospitalReview === "PENDING" ||
      v.inquiry.status === "HOSPITAL_REVIEW_REQUIRED" ||
      v.inquiry.humanTakeover.active,
  );

  return (
    <HospitalShell>
      <PageHeader
        title="Operations dashboard"
        description="Seamless cross-border patient & medical experiences · Singapore ↔ Batam"
        actions={
          <>
            <Button
              variant="outline"
              disabled={busy || demoRunning}
              onClick={async () => {
                setBusy(true);
                try {
                  await simulateInboundMessage({
                    name: "Rachel Foong",
                    channel: "WHATSAPP",
                    message: "Hi, how much for a health screening in Batam including ferry? Travelling next week.",
                  });
                } finally {
                  setBusy(false);
                }
              }}
            >
              <UserPlus className="size-4" /> Simulate inbound message
            </Button>
            <Button disabled={demoRunning} onClick={() => void runLiveDemo()}>
              <PlayCircle className="size-4" /> {demoRunning ? "Demo running…" : "Run live demo"}
            </Button>
          </>
        }
      />

      {dashboard.isPending ? (
        <LoadingBlock label="Loading dashboard" rows={2} />
      ) : dashboard.isError ? (
        <ErrorBlock onRetry={() => void dashboard.refetch()} />
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Key metrics">
          {kpis.map((kpi, i) => {
            const Icon = kpiIcons[i] ?? Activity;
            return (
              <article key={kpi.label} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
                  <Icon className="size-4 text-primary" />
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{kpi.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{kpi.hint}</p>
              </article>
            );
          })}
        </section>
      )}

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <section className="rounded-xl border bg-card" aria-label="Needs attention">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Needs hospital attention</h2>
            <Link to="/inquiries" className="text-xs font-medium text-primary hover:underline">
              Open pipeline
            </Link>
          </header>
          <div className="p-3">
            {inquiries.isPending ? (
              <LoadingBlock label="Loading inquiries" />
            ) : inquiries.isError ? (
              <ErrorBlock onRetry={() => void inquiries.refetch()} />
            ) : attention.length === 0 ? (
              <EmptyBlock title="Nothing waiting on the hospital" description="All active cases are with the AI agent or the patient." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {attention.slice(0, 4).map((view) => (
                  <InquiryCard key={view.inquiry.id} view={view} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border bg-card" aria-label="Live activity feed">
          <header className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Live activity</h2>
            <Pill tone="success" dot>
              Streaming
            </Pill>
          </header>
          <ol className="max-h-[26rem] divide-y overflow-y-auto">
            {(dashboard.data?.feed ?? []).map((item) => (
              <li key={item.id} className="flex items-start gap-3 px-4 py-2.5">
                <span className="w-11 shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
                  {clock(item.at)}
                </span>
                <span className="min-w-0 flex-1 text-sm text-foreground">{item.label}</span>
                <Pill tone={item.tone === "SUCCESS" ? "success" : item.tone === "ATTENTION" ? "warning" : "info"} />
              </li>
            ))}
          </ol>
        </section>
      </div>

      <MedicalDisclaimer className="mt-5" />
    </HospitalShell>
  );
}
