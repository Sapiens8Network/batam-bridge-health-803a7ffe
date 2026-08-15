import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { MedicalDisclaimer } from "@/components/hub/Disclaimer";
import { ErrorBlock, LoadingBlock } from "@/components/hub/StateBlocks";
import { HospitalShell, PageHeader } from "@/components/layout/HospitalShell";
import { analyticsQuery } from "@/lib/api/queries";
import { pct, sgd } from "@/lib/format";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics & Conversion · Health Tourism Hub" },
      {
        name: "description",
        content:
          "Inquiry volume, AI response times, treatment demand, conversion funnel and estimated patient savings across Singapore-Batam cases.",
      },
      { property: "og:title", content: "Analytics & Conversion · Health Tourism Hub" },
      { property: "og:description", content: "Performance metrics for cross-border medical travel operations." },
    ],
  }),
  component: AnalyticsPage,
});

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </section>
  );
}

const axis = { stroke: "var(--color-muted-foreground)", fontSize: 11 } as const;
const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--color-foreground)",
};

function AnalyticsPage() {
  const { data, isPending, isError, refetch } = useQuery(analyticsQuery());

  if (isPending) {
    return (
      <HospitalShell>
        <LoadingBlock label="Loading analytics" rows={4} />
      </HospitalShell>
    );
  }
  if (isError || !data) {
    return (
      <HospitalShell>
        <ErrorBlock onRetry={() => void refetch()} />
      </HospitalShell>
    );
  }

  return (
    <HospitalShell>
      <PageHeader title="Analytics" description="Volume, speed, demand and value delivered to Singapore patients" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Conversion rate" value={pct(data.conversionRate)} hint="Inquiry to confirmed booking" />
        <Kpi label="Avg. patient savings" value={sgd(data.avgSavings)} hint="Versus Singapore benchmark" />
        <Kpi label="Pipeline value" value={sgd(data.revenueOpportunity)} hint="Sum of active packages" />
        <Kpi label="Cases tracked" value={String(data.funnel[0]?.count ?? 0)} hint="Across all channels" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Inquiry volume" subtitle="Monthly inbound inquiries and confirmed bookings">
          <BarChart data={data.monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="month" {...axis} />
            <YAxis {...axis} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="inquiries" name="Inquiries" fill="var(--color-singapore)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="confirmed" name="Confirmed" fill="var(--color-batam)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </Panel>

        <Panel title="AI response time" subtitle="Seconds from inbound message to structured itinerary">
          <LineChart data={data.responseTimes}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="day" {...axis} />
            <YAxis {...axis} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="seconds" name="Seconds" stroke="var(--color-batam)" strokeWidth={2} dot={false} />
          </LineChart>
        </Panel>

        <Panel title="Treatment pricing demand" subtitle="Batam package versus Singapore benchmark by treatment">
          <BarChart data={data.byTreatment}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="name" {...axis} interval={0} height={50} angle={-15} textAnchor="end" />
            <YAxis {...axis} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => sgd(v)} />
            <Bar dataKey="singapore" name="Singapore" fill="var(--color-singapore)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="batam" name="Batam" fill="var(--color-batam)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </Panel>

        <Panel title="Conversion funnel" subtitle="From inbound inquiry to confirmed cross-border booking">
          <BarChart data={data.funnel} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
            <XAxis type="number" {...axis} />
            <YAxis type="category" dataKey="stage" width={120} {...axis} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" name="Cases" radius={[0, 6, 6, 0]}>
              {data.funnel.map((_, i) => (
                <Cell
                  key={i}
                  fill={i === 0 ? "var(--color-singapore)" : i === data.funnel.length - 1 ? "var(--color-batam)" : "var(--color-info)"}
                />
              ))}
            </Bar>
          </BarChart>
        </Panel>
      </div>

      <MedicalDisclaimer className="mt-4" />
    </HospitalShell>
  );
}
