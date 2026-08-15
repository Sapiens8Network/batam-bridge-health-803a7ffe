import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle, Send, ShieldCheck } from "lucide-react";

import { MedicalDisclaimer } from "@/components/hub/Disclaimer";
import { Field, Pill } from "@/components/hub/Pill";
import { ErrorBlock, LoadingBlock } from "@/components/hub/StateBlocks";
import { HospitalShell, PageHeader } from "@/components/layout/HospitalShell";
import { referenceQuery } from "@/lib/api/queries";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Hospital Settings · MedBridge Pass" },
      {
        name: "description",
        content: "Hospital profiles, messaging channel status and the orchestration pipeline that powers patient itineraries.",
      },
      { property: "og:title", content: "Hospital Settings · MedBridge Pass" },
      { property: "og:description", content: "Channel connections and workflow configuration for Batam facilities." },
    ],
  }),
  component: SettingsPage,
});

const pipeline = [
  "WhatsApp / Telegram inbound message",
  "Backend API ingests and normalises the request",
  "Hermes AI agent returns structured JSON",
  "Business logic prices treatment, travel and stay",
  "Database stores inquiry, quote and itinerary",
  "Hospital dashboard review and edits",
  "Hospital approval",
  "Patient itinerary delivered back on WhatsApp / Telegram",
];

function SettingsPage() {
  const { data, isPending, isError, refetch } = useQuery(referenceQuery());

  return (
    <HospitalShell>
      <PageHeader title="Settings" description="Facilities, channels and the orchestration pipeline" />

      {isPending ? (
        <LoadingBlock label="Loading settings" rows={4} />
      ) : isError ? (
        <ErrorBlock onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="space-y-3" aria-label="Hospitals">
            <h2 className="text-sm font-semibold">Facilities</h2>
            {(data?.hospitals ?? []).map((h) => (
              <div key={h.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{h.name}</h3>
                  <Pill tone="batam">
                    <ShieldCheck className="size-3" /> {h.accreditation}
                  </Pill>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3">
                  <Field label="City" value={h.city} />
                  <Field label="Contact" value={h.contactPhone} />
                </dl>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {h.specialties.map((s) => (
                    <Pill key={s} tone="neutral">
                      {s}
                    </Pill>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <div className="space-y-4">
            <section className="rounded-xl border bg-card p-4" aria-label="Channels">
              <h2 className="text-sm font-semibold">Patient channels</h2>
              <ul className="mt-3 space-y-2">
                <li className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                  <span className="flex items-center gap-2 text-sm">
                    <MessageCircle className="size-4 text-batam" /> WhatsApp Business
                  </span>
                  <Pill tone="success">Connected</Pill>
                </li>
                <li className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                  <span className="flex items-center gap-2 text-sm">
                    <Send className="size-4 text-singapore" /> Telegram Bot
                  </span>
                  <Pill tone="success">Connected</Pill>
                </li>
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Messages are received and sent by the backend. This dashboard never talks to the AI agent directly.
              </p>
            </section>

            <section className="rounded-xl border bg-card p-4" aria-label="Pipeline">
              <h2 className="text-sm font-semibold">Orchestration pipeline</h2>
              <ol className="mt-3 space-y-2">
                {pipeline.map((step, i) => (
                  <li key={step} className="flex gap-3 text-sm">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tabular-nums">
                      {i + 1}
                    </span>
                    <span className="text-foreground/80">{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            <MedicalDisclaimer />
          </div>
        </div>
      )}
    </HospitalShell>
  );
}
