import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Stethoscope } from "lucide-react";

import { DoctorReviewPanel } from "@/components/hub/DoctorReviewPanel";
import { Field, Pill } from "@/components/hub/Pill";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/hub/StateBlocks";
import { HospitalShell, PageHeader } from "@/components/layout/HospitalShell";
import { Button } from "@/components/ui/button";
import { inquiriesQuery, referenceQuery } from "@/lib/api/queries";
import { reviewMeta } from "@/lib/status";

export const Route = createFileRoute("/doctors")({
  head: () => ({
    meta: [
      { title: "Doctor Review Queue · MedBridge Pass" },
      {
        name: "description",
        content:
          "Batam specialists confirm proposed treatments, procedure duration and appointment slots before any quote reaches the patient.",
      },
      { property: "og:title", content: "Doctor Review Queue · MedBridge Pass" },
      { property: "og:description", content: "Clinical sign-off for cross-border medical travel cases." },
    ],
  }),
  component: DoctorsPage,
});

function DoctorsPage() {
  const inquiries = useQuery(inquiriesQuery());
  const reference = useQuery(referenceQuery());

  const pending = (inquiries.data ?? []).filter((v) => v.inquiry.doctorReview.state !== "APPROVED");

  return (
    <HospitalShell>
      <PageHeader title="Doctors & clinical review" description="Specialist confirmation is required before a quote is sent" />

      {inquiries.isPending || reference.isPending ? (
        <LoadingBlock label="Loading clinical queue" rows={4} />
      ) : inquiries.isError || reference.isError ? (
        <ErrorBlock onRetry={() => void inquiries.refetch()} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Review queue</h2>
            {pending.length === 0 ? (
              <EmptyBlock title="No cases awaiting clinical review" description="Every active case has doctor approval." />
            ) : (
              pending.map((v) => (
                <div key={v.inquiry.id} className="space-y-3 rounded-xl border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold">
                        {v.patient.name} · {v.inquiry.reference}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {v.inquiry.aiRequest.treatment} · {v.hospital.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Pill tone={reviewMeta[v.inquiry.doctorReview.state].tone}>
                        {reviewMeta[v.inquiry.doctorReview.state].label}
                      </Pill>
                      <Button asChild variant="outline" size="sm">
                        <Link to="/inquiries/$id" params={{ id: v.inquiry.id }}>
                          Case
                        </Link>
                      </Button>
                    </div>
                  </div>
                  <DoctorReviewPanel inquiry={v.inquiry} doctor={v.doctor} />
                </div>
              ))
            )}
          </div>

          <section className="space-y-2" aria-label="Specialists">
            <h2 className="text-sm font-semibold">Specialists</h2>
            {(reference.data?.doctors ?? []).map((d) => (
              <div key={d.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2">
                  <Stethoscope className="size-4 text-batam" />
                  <h3 className="text-sm font-semibold">{d.name}</h3>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3">
                  <Field label="Specialty" value={d.specialty} />
                  <Field label="Experience" value={`${d.yearsExperience} yrs`} />
                  <Field label="Languages" value={d.languages.join(", ")} />
                </dl>
              </div>
            ))}
          </section>
        </div>
      )}
    </HospitalShell>
  );
}
