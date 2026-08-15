import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { MedicalDisclaimer } from "@/components/hub/Disclaimer";
import { ChannelPill, InquiryCard } from "@/components/hub/InquiryCard";
import { Field, Pill } from "@/components/hub/Pill";
import { EmptyBlock, LoadingBlock } from "@/components/hub/StateBlocks";
import { HospitalShell, PageHeader } from "@/components/layout/HospitalShell";
import { Button } from "@/components/ui/button";
import { patientQuery } from "@/lib/api/queries";
import { dateTime } from "@/lib/format";

export const Route = createFileRoute("/patients/$id")({
  head: () => ({
    meta: [
      { title: "Patient Record · Health Tourism Hub" },
      {
        name: "description",
        content: "Patient profile with case history, communication channel and every Batam medical travel inquiry.",
      },
      { property: "og:title", content: "Patient Record · Health Tourism Hub" },
      { property: "og:description", content: "Full case history for one cross-border patient." },
    ],
  }),
  component: PatientDetailPage,
});

const authorTone = {
  PATIENT: "singapore",
  AI: "info",
  HOSPITAL_STAFF: "batam",
  SYSTEM: "neutral",
} as const;

function PatientDetailPage() {
  const { id } = Route.useParams();
  const { data, isPending, isError } = useQuery(patientQuery(id));

  if (isPending) {
    return (
      <HospitalShell>
        <LoadingBlock label="Loading patient" rows={4} />
      </HospitalShell>
    );
  }

  if (isError || !data) {
    return (
      <HospitalShell>
        <EmptyBlock
          title="Patient not found"
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/patients">Back to patients</Link>
            </Button>
          }
        />
      </HospitalShell>
    );
  }

  const { patient, inquiries, messages } = data;

  return (
    <HospitalShell>
      <PageHeader
        title={patient.name}
        description={`${patient.country} · registered ${dateTime(patient.createdAt)}`}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/patients">
              <ArrowLeft className="size-4" /> Patients
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">Patient profile</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Country" value={patient.country} />
              <Field label="Phone" value={patient.phoneMasked} />
              <Field label="Channel" value={<ChannelPill channel={patient.channel} />} />
              <Field label="Travellers" value={String(patient.travellers)} />
              <Field label="Preferred date" value={patient.preferredDate} />
              <Field label="Language" value={patient.language} />
            </dl>
          </section>

          <section aria-label="Patient inquiries" className="space-y-2">
            <h2 className="text-sm font-semibold">Inquiries</h2>
            {inquiries.length === 0 ? (
              <EmptyBlock title="No inquiries for this patient" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {inquiries.map((v) => (
                  <InquiryCard key={v.inquiry.id} view={v} />
                ))}
              </div>
            )}
          </section>

          <MedicalDisclaimer />
        </div>

        <section className="rounded-xl border bg-card" aria-label="Conversation history">
          <header className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Conversation history</h2>
          </header>
          <ol className="max-h-[36rem] divide-y overflow-y-auto">
            {messages.map((m) => (
              <li key={m.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <Pill tone={authorTone[m.author]}>{m.author.replace("_", " ")}</Pill>
                  <span className="text-[11px] text-muted-foreground">{dateTime(m.at)}</span>
                </div>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-foreground">{m.body}</p>
                {m.suggested ? <Pill tone="warning" className="mt-1.5">Suggested — not sent</Pill> : null}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </HospitalShell>
  );
}
