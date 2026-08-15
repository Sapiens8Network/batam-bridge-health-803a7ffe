import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  CalendarCheck,
  CheckCircle2,
  HeartPulse,
  Phone,
  PiggyBank,
  Ship,
  Stethoscope,
  Sun,
} from "lucide-react";
import { toast } from "sonner";

import { MedicalDisclaimer } from "@/components/hub/Disclaimer";
import { Pill } from "@/components/hub/Pill";
import { EmptyBlock, LoadingBlock } from "@/components/hub/StateBlocks";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { publicItineraryQuery, qk } from "@/lib/api/queries";
import { pct, sgd } from "@/lib/format";
import { breakdownLabels, medicalKeys, travelKeys } from "@/lib/quote-math";
import { confirmationMeta } from "@/lib/status";

export const Route = createFileRoute("/itinerary/$token")({
  head: () => ({
    meta: [
      { title: "Your Batam Care Journey · MedBridge Pass" },
      {
        name: "description",
        content:
          "Your hospital-approved medical travel itinerary: ferry times, appointment, recovery stay and a full cost breakdown in SGD.",
      },
      { property: "og:title", content: "Your Batam Care Journey · MedBridge Pass" },
      {
        property: "og:description",
        content:
          "Hospital-approved treatment, travel and recovery plan with transparent Singapore-comparison pricing.",
      },
    ],
  }),
  component: PatientItineraryPage,
});

const stepIcon = {
  OUTBOUND_FERRY: Ship,
  ARRIVAL: Building2,
  HOSPITAL: Stethoscope,
  RECOVERY: Sun,
  FOLLOW_UP: HeartPulse,
  RETURN_FERRY: Ship,
} as const;

function PatientItineraryPage() {
  const { token } = Route.useParams();
  const queryClient = useQueryClient();
  const { data, isPending, isError } = useQuery(publicItineraryQuery(token));

  const confirm = useMutation({
    mutationFn: () => api.confirmItineraryByToken(token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.publicItinerary(token) });
      toast.success("Your journey is confirmed — the hospital has been notified");
    },
    onError: () => toast.error("We couldn't confirm right now. Please message us on WhatsApp."),
  });

  if (isPending) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10">
        <LoadingBlock label="Loading your itinerary" rows={4} />
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <EmptyBlock
          title="This itinerary link is no longer valid"
          description="Please reply on WhatsApp or Telegram and we will send you a fresh link."
        />
      </main>
    );
  }

  const confirmed = data.status === "PATIENT_CONFIRMED";

  return (
    <main className="min-h-screen bg-background pb-16">
      <header className="journey-gradient px-5 pb-8 pt-10 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
          MedBridge Pass
        </p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">Your Batam care journey</h1>
        <p className="mt-1 text-sm text-white/85">
          {data.patientName} · {data.treatment}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-xs font-medium">
            {data.hospitalName}
          </span>
          <span className="rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-xs font-medium">
            {confirmed ? "Confirmed by you" : "Approved by hospital"}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-xl space-y-5 px-4 pt-5">
        <section className="rounded-2xl border bg-card p-4" aria-label="Savings summary">
          <div className="flex items-center gap-2">
            <PiggyBank className="size-4 text-batam" />
            <h2 className="text-sm font-semibold">You save {sgd(data.cost.savings)}</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {pct(data.cost.savingsPct)} less than the equivalent Singapore care pathway.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-singapore-soft/50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-singapore">
                Singapore
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-singapore">
                {sgd(data.cost.benchmark)}
              </p>
            </div>
            <div className="rounded-xl border bg-batam-soft/50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-batam">
                Your Batam package
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-batam">
                {sgd(data.cost.packageTotal)}
              </p>
            </div>
          </div>
        </section>

        <section aria-label="Journey timeline" className="space-y-3">
          <h2 className="text-sm font-semibold">Your day-by-day plan</h2>
          <ol className="relative space-y-3 border-l pl-5">
            {[...data.steps]
              .sort((a, b) => a.order - b.order)
              .map((step) => {
                const Icon = stepIcon[step.kind];
                const meta = confirmationMeta[step.state];
                return (
                  <li key={step.order} className="relative rounded-2xl border bg-card p-4">
                    <span className="absolute -left-[1.85rem] top-5 flex size-6 items-center justify-center rounded-full border bg-background">
                      <Icon className="size-3.5 text-batam" />
                    </span>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">{step.title}</h3>
                      <Pill tone={meta.tone}>{meta.label}</Pill>
                    </div>
                    <dl className="mt-2 space-y-1">
                      {step.facts.map((f) => (
                        <div
                          key={f.label}
                          className="flex items-baseline justify-between gap-3 text-sm"
                        >
                          <dt className="text-muted-foreground">{f.label}</dt>
                          <dd className="text-right font-medium text-foreground">{f.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                );
              })}
          </ol>
        </section>

        <section className="rounded-2xl border bg-card p-4" aria-label="Cost breakdown">
          <h2 className="text-sm font-semibold">Cost breakdown</h2>
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Medical
              </p>
              {medicalKeys.map((k) => (
                <div key={k} className="flex items-baseline justify-between gap-3 py-1 text-sm">
                  <span className="text-foreground/80">{breakdownLabels[k]}</span>
                  <span className="font-medium tabular-nums">{sgd(data.cost.breakdown[k])}</span>
                </div>
              ))}
              <div className="flex items-baseline justify-between border-t pt-1.5 text-sm font-semibold">
                <span>Medical subtotal</span>
                <span className="tabular-nums">{sgd(data.cost.medicalSubtotal)}</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Travel & stay
              </p>
              {travelKeys.map((k) => (
                <div key={k} className="flex items-baseline justify-between gap-3 py-1 text-sm">
                  <span className="text-foreground/80">{breakdownLabels[k]}</span>
                  <span className="font-medium tabular-nums">{sgd(data.cost.breakdown[k])}</span>
                </div>
              ))}
              <div className="flex items-baseline justify-between border-t pt-1.5 text-sm font-semibold">
                <span>Travel subtotal</span>
                <span className="tabular-nums">{sgd(data.cost.travelSubtotal)}</span>
              </div>
            </div>
            <div className="flex items-baseline justify-between rounded-xl bg-batam-soft/60 px-3 py-2">
              <span className="text-sm font-semibold text-batam">Total package</span>
              <span className="text-lg font-semibold tabular-nums text-batam">
                {sgd(data.cost.packageTotal)}
              </span>
            </div>
          </div>
        </section>

        <MedicalDisclaimer />

        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            disabled={confirmed || confirm.isPending}
            onClick={() => confirm.mutate()}
            className="w-full"
          >
            {confirmed ? (
              <>
                <CheckCircle2 className="size-4" /> Journey confirmed
              </>
            ) : (
              <>
                <CalendarCheck className="size-4" /> Confirm my journey
              </>
            )}
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full">
            <a href={`tel:${data.hospitalPhone.replace(/\s/g, "")}`}>
              <Phone className="size-4" /> Call {data.hospitalName}
            </a>
          </Button>
        </div>
      </div>
    </main>
  );
}
