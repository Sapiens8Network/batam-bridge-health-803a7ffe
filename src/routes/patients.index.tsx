import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { ChannelPill } from "@/components/hub/InquiryCard";
import { Pill } from "@/components/hub/Pill";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/hub/StateBlocks";
import { HospitalShell, PageHeader } from "@/components/layout/HospitalShell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { patientsQuery } from "@/lib/api/queries";
import { dateShort } from "@/lib/format";
import { inquiryStatusMeta } from "@/lib/status";

export const Route = createFileRoute("/patients/")({
  head: () => ({
    meta: [
      { title: "Singapore Patients · Health Tourism Hub" },
      {
        name: "description",
        content: "Directory of Singapore patients travelling to Batam, their channels, preferred dates and case status.",
      },
      { property: "og:title", content: "Singapore Patients · Health Tourism Hub" },
      { property: "og:description", content: "Manage cross-border patient records and case history." },
    ],
  }),
  component: PatientsPage,
});

function PatientsPage() {
  const { data, isPending, isError, refetch } = useQuery(patientsQuery());

  return (
    <HospitalShell>
      <PageHeader title="Patients" description="Singapore patients registered through WhatsApp and Telegram" />

      {isPending ? (
        <LoadingBlock label="Loading patients" rows={4} />
      ) : isError ? (
        <ErrorBlock onRetry={() => void refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyBlock title="No patients yet" description="Patients appear here as soon as an inbound message arrives." />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Travellers</TableHead>
                <TableHead>Preferred date</TableHead>
                <TableHead>Inquiries</TableHead>
                <TableHead>Latest status</TableHead>
                <TableHead>Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((row) => (
                <TableRow key={row.patient.id}>
                  <TableCell>
                    <Link to="/patients/$id" params={{ id: row.patient.id }} className="font-medium hover:underline">
                      {row.patient.name}
                    </Link>
                    <span className="block text-[11px] text-muted-foreground">{row.patient.language}</span>
                  </TableCell>
                  <TableCell className="text-sm">{row.patient.country}</TableCell>
                  <TableCell>
                    <ChannelPill channel={row.patient.channel} />
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">{row.patient.phoneMasked}</TableCell>
                  <TableCell className="text-sm tabular-nums">{row.patient.travellers}</TableCell>
                  <TableCell className="text-sm">{row.patient.preferredDate}</TableCell>
                  <TableCell className="text-sm tabular-nums">{row.inquiries}</TableCell>
                  <TableCell>
                    {row.lastStatus ? (
                      <Pill tone={inquiryStatusMeta[row.lastStatus].tone}>{inquiryStatusMeta[row.lastStatus].short}</Pill>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{dateShort(row.patient.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </HospitalShell>
  );
}
