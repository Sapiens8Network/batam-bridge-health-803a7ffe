import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, MessagesSquare } from "lucide-react";

import { AiActivityPanel } from "@/components/hub/AiActivityPanel";
import { CostComparison } from "@/components/hub/CostComparison";
import { MedicalDisclaimer } from "@/components/hub/Disclaimer";
import { DoctorReviewPanel } from "@/components/hub/DoctorReviewPanel";
import { HumanTakeoverPanel } from "@/components/hub/HumanTakeoverPanel";
import { ChannelPill } from "@/components/hub/InquiryCard";
import { PatientMessagePreview } from "@/components/hub/PatientMessagePreview";
import { ConfidenceBar, Field, Pill } from "@/components/hub/Pill";
import { QuoteBuilder } from "@/components/hub/QuoteBuilder";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/hub/StateBlocks";
import { HospitalShell, PageHeader } from "@/components/layout/HospitalShell";
import { Button } from "@/components/ui/button";
import { activityQuery, inquiryQuery } from "@/lib/api/queries";
import { dateTime } from "@/lib/format";
import { quoteTotals } from "@/lib/quote-math";
import { inquiryStatusMeta, priorityMeta } from "@/lib/status";

export const Route = createFileRoute("/inquiries/$id")({
  head: () => ({
    meta: [
      { title: "Inquiry Detail · MedBridge Pass" },
      {
        name: "description",
        content:
          "Structured patient request, AI-extracted treatment data, cost comparison, quote builder and doctor review for a single inquiry.",
      },
      { property: "og:title", content: "Inquiry Detail · MedBridge Pass" },
      { property: "og:description", content: "Review and approve a cross-border medical travel proposal." },
    ],
  }),
  component: InquiryDetailPage,
});

function InquiryDetailPage() {
  const { id } = Route.useParams();
  const detail = useQuery(inquiryQuery(id));
  const activity = useQuery(activityQuery(id));

  if (detail.isPending) {
    return (
      <HospitalShell>
        <LoadingBlock label="Loading inquiry" rows={5} />
      </HospitalShell>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <HospitalShell>
        <EmptyBlock
          title="Inquiry not found"
          description="This inquiry may have been closed or does not exist."
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/inquiries">Back to pipeline</Link>
            </Button>
          }
        />
      </HospitalShell>
    );
  }

  const { inquiry, patient, quote, hospital, doctor, itinerary } = detail.data;
  const totals = quoteTotals(quote);
  const status = inquiryStatusMeta[inquiry.status];

  const structured = {
    inquiryId: inquiry.id,
    reference: inquiry.reference,
    channel: inquiry.channel,
    status: inquiry.status,
    ai_extracted_request: inquiry.aiRequest,
    pricing: { currency: quote.currency, source: quote.source, breakdown: quote.breakdown, totals },
    benchmark: quote.singaporeBenchmark,
    hospital: { id: hospital.id, name: hospital.name, review: inquiry.hospitalReview },
    doctor_review: inquiry.doctorReview,
    itinerary: itinerary ? { id: itinerary.id, status: itinerary.status, steps: itinerary.steps.length } : null,
  };

  return (
    <HospitalShell>
      <PageHeader
        title={`${patient.name} · ${inquiry.aiRequest.treatment}`}
        description={`${inquiry.reference} · received ${dateTime(inquiry.createdAt)} · ${hospital.name}`}
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <Link to="/inquiries">
                <ArrowLeft className="size-4" /> Pipeline
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/messages" search={{ patient: patient.id }}>
                <MessagesSquare className="size-4" /> Conversation
              </Link>
            </Button>
            {itinerary ? (
              <Button asChild size="sm" variant="secondary">
                <Link to="/itinerary/$token" params={{ token: itinerary.token }} target="_blank">
                  <ExternalLink className="size-4" /> Patient view
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Pill tone={status.tone} dot>
          {status.label}
        </Pill>
        <Pill tone={priorityMeta[inquiry.priority].tone} dot>
          Priority: {priorityMeta[inquiry.priority].label}
        </Pill>
        <ChannelPill channel={inquiry.channel} />
      </div>

      <HumanTakeoverPanel inquiry={inquiry} />

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-4" aria-label="Patient information">
            <h2 className="text-sm font-semibold text-foreground">Patient information</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Name" value={patient.name} />
              <Field label="Country" value={patient.country} />
              <Field label="Phone" value={patient.phoneMasked} />
              <Field label="Channel" value={inquiry.channel === "WHATSAPP" ? "WhatsApp" : "Telegram"} />
              <Field label="Travellers" value={String(patient.travellers)} />
              <Field label="Preferred date" value={patient.preferredDate} />
            </dl>
            <div className="mt-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Original patient message
              </p>
              <blockquote className="mt-1.5 rounded-lg border-l-2 border-primary bg-muted/50 px-3 py-2 text-sm leading-6 text-foreground">
                {inquiry.originalMessage}
              </blockquote>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-4" aria-label="AI extracted request">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">AI extracted request</h2>
              <ConfidenceBar value={inquiry.aiRequest.confidence} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Treatment" value={inquiry.aiRequest.treatment} />
              <Field label="Category" value={inquiry.aiRequest.treatmentCategory} />
              <Field label="Preferred duration" value={`${inquiry.aiRequest.preferredDurationDays} days`} />
            </dl>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Patient requirements
                </p>
                <ul className="mt-1.5 space-y-1 text-sm text-foreground">
                  {inquiry.aiRequest.requirements.map((r) => (
                    <li key={r} className="flex gap-2">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Special requirements
                </p>
                <ul className="mt-1.5 space-y-1 text-sm text-foreground">
                  {inquiry.aiRequest.specialRequirements.map((r) => (
                    <li key={r} className="flex gap-2">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-warning" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Fields above are extracted from the patient's own words. No clinical assessment is inferred.
            </p>
          </section>

          <CostComparison
            breakdown={quote.breakdown}
            benchmark={quote.singaporeBenchmark}
            treatmentLabel={inquiry.aiRequest.treatment}
          />

          <QuoteBuilder quote={quote} itineraryId={itinerary?.id ?? null} />
          <DoctorReviewPanel inquiry={inquiry} doctor={doctor} />
        </div>

        <div className="space-y-4">
          {activity.isPending ? (
            <LoadingBlock label="Loading AI activity" />
          ) : activity.isError ? (
            <ErrorBlock onRetry={() => void activity.refetch()} />
          ) : (
            <AiActivityPanel events={activity.data ?? []} structured={structured} />
          )}

          <PatientMessagePreview
            totals={totals}
            patientId={patient.id}
            inquiryId={inquiry.id}
            channel={inquiry.channel}
          />

          <MedicalDisclaimer />
        </div>
      </div>
    </HospitalShell>
  );
}
