import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BedDouble, Ship, Star } from "lucide-react";

import { Field, Pill } from "@/components/hub/Pill";
import { ErrorBlock, LoadingBlock } from "@/components/hub/StateBlocks";
import { HospitalShell, PageHeader } from "@/components/layout/HospitalShell";
import { referenceQuery } from "@/lib/api/queries";
import { sgd } from "@/lib/format";

const mins = (m: number) => (m < 60 ? `${m} min` : `${(m / 60).toFixed(1)} h`);

export const Route = createFileRoute("/logistics")({
  head: () => ({
    meta: [
      { title: "Travel & Logistics · MedBridge Pass" },
      {
        name: "description",
        content:
          "Ferry crossings, private transfers and recovery hotels used to assemble Singapore-to-Batam care journeys.",
      },
      { property: "og:title", content: "Travel & Logistics · MedBridge Pass" },
      {
        property: "og:description",
        content: "Ferries, transfers and recovery stays for medical travellers.",
      },
    ],
  }),
  component: LogisticsPage,
});

function LogisticsPage() {
  const { data, isPending, isError, refetch } = useQuery(referenceQuery());

  return (
    <HospitalShell>
      <PageHeader
        title="Travel & logistics"
        description="The Singapore to Batam journey layer of every itinerary"
      />

      {isPending ? (
        <LoadingBlock label="Loading logistics" rows={4} />
      ) : isError ? (
        <ErrorBlock onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-3" aria-label="Transport options">
            <h2 className="text-sm font-semibold">Transport</h2>
            {(data?.transport ?? []).map((t) => (
              <div key={t.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Ship className="size-4 text-singapore" />
                    <h3 className="text-sm font-semibold">{t.name}</h3>
                  </div>
                  <Pill tone="singapore">{t.type}</Pill>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-3">
                  <Field label="Route" value={t.route} />
                  <Field label="Duration" value={mins(t.durationMinutes)} />
                  <Field label="Price" value={sgd(t.price)} />
                </dl>
              </div>
            ))}
          </section>

          <section className="space-y-3" aria-label="Recovery hotels">
            <h2 className="text-sm font-semibold">Recovery hotels</h2>
            {(data?.hotels ?? []).map((h) => (
              <div key={h.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BedDouble className="size-4 text-batam" />
                    <h3 className="text-sm font-semibold">{h.name}</h3>
                  </div>
                  <Pill tone="batam">
                    <Star className="size-3" /> {h.rating.toFixed(1)}
                  </Pill>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-3">
                  <Field label="Area" value={h.area} />
                  <Field label="Per night" value={sgd(h.nightlyRate)} />
                  <Field label="To hospital" value={`${h.distanceToHospitalKm} km`} />
                </dl>
              </div>
            ))}
          </section>
        </div>
      )}
    </HospitalShell>
  );
}
