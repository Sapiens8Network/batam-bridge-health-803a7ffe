import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { MedicalDisclaimer } from "@/components/hub/Disclaimer";
import { Pill } from "@/components/hub/Pill";
import { ErrorBlock, LoadingBlock } from "@/components/hub/StateBlocks";
import { HospitalShell, PageHeader } from "@/components/layout/HospitalShell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { referenceQuery } from "@/lib/api/queries";
import { pct, sgd } from "@/lib/format";

const mins = (m: number) => (m < 60 ? `${m} min` : `${(m / 60).toFixed(1)} h`);

export const Route = createFileRoute("/treatments")({
  head: () => ({
    meta: [
      { title: "Treatment Catalogue · MedBridge Pass" },
      {
        name: "description",
        content:
          "Batam treatment catalogue with Singapore benchmark prices, expected savings, recovery nights and procedure duration.",
      },
      { property: "og:title", content: "Treatment Catalogue · MedBridge Pass" },
      {
        property: "og:description",
        content: "Compare Batam treatment pricing against Singapore benchmarks.",
      },
    ],
  }),
  component: TreatmentsPage,
});

function TreatmentsPage() {
  const { data, isPending, isError, refetch } = useQuery(referenceQuery());

  return (
    <HospitalShell>
      <PageHeader
        title="Treatments"
        description="Catalogue powering every AI cost estimate and patient quote"
      />

      {isPending ? (
        <LoadingBlock label="Loading catalogue" rows={5} />
      ) : isError ? (
        <ErrorBlock onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Treatment</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Batam price</TableHead>
                  <TableHead>Singapore benchmark</TableHead>
                  <TableHead>Savings</TableHead>
                  <TableHead>Procedure time</TableHead>
                  <TableHead>Recovery nights</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.treatments ?? []).map((t) => {
                  const savings = t.singaporeBenchmark - t.batamPrice;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-sm">{t.category}</TableCell>
                      <TableCell className="text-sm tabular-nums text-batam">
                        {sgd(t.batamPrice)}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-singapore">
                        {sgd(t.singaporeBenchmark)}
                      </TableCell>
                      <TableCell>
                        <Pill tone="success">
                          {sgd(savings)} · {pct((savings / t.singaporeBenchmark) * 100)}
                        </Pill>
                      </TableCell>
                      <TableCell className="text-sm">{mins(t.durationMinutes)}</TableCell>
                      <TableCell className="text-sm tabular-nums">{t.stayNights}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <MedicalDisclaimer />
        </div>
      )}
    </HospitalShell>
  );
}
