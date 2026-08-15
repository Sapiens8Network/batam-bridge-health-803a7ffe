import { Link } from "@tanstack/react-router";
import { CalendarDays, MessageSquare, Send } from "lucide-react";

import { ConfidenceBar, Pill } from "@/components/hub/Pill";
import type { InquiryView } from "@/lib/api";
import { pct, relative, sgd } from "@/lib/format";
import { quoteTotals } from "@/lib/quote-math";
import { inquiryStatusMeta, priorityMeta, reviewMeta } from "@/lib/status";
import { cn } from "@/lib/utils";

export function ChannelPill({ channel }: { channel: "WHATSAPP" | "TELEGRAM" }) {
  const Icon = channel === "WHATSAPP" ? MessageSquare : Send;
  return (
    <Pill tone={channel === "WHATSAPP" ? "success" : "info"}>
      <Icon className="size-3" />
      {channel === "WHATSAPP" ? "WhatsApp" : "Telegram"}
    </Pill>
  );
}

export function InquiryCard({ view, className }: { view: InquiryView; className?: string }) {
  const { inquiry, patient, quote } = view;
  const totals = quoteTotals(quote);
  const status = inquiryStatusMeta[inquiry.status];

  return (
    <Link
      to="/inquiries/$id"
      params={{ id: inquiry.id }}
      className={cn(
        "block rounded-xl border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-accent/40",
        inquiry.priority === "URGENT" && "border-destructive/40",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{patient.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {patient.country} · {inquiry.reference} · {relative(inquiry.createdAt)}
          </p>
        </div>
        <Pill tone={priorityMeta[inquiry.priority].tone} dot>
          {priorityMeta[inquiry.priority].label}
        </Pill>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <ChannelPill channel={inquiry.channel} />
        <Pill tone={status.tone}>{status.short}</Pill>
        <Pill tone="batam">{inquiry.aiRequest.treatment}</Pill>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        <span className="text-muted-foreground">SG benchmark</span>
        <span className="text-right font-medium tabular-nums text-singapore">{sgd(totals.benchmarkTotal)}</span>
        <span className="text-muted-foreground">Batam treatment</span>
        <span className="text-right font-medium tabular-nums">{sgd(quote.breakdown.treatment)}</span>
        <span className="text-muted-foreground">Complete trip</span>
        <span className="text-right font-medium tabular-nums text-batam">{sgd(totals.packageTotal)}</span>
        <span className="text-muted-foreground">Est. saving</span>
        <span className="text-right font-semibold tabular-nums text-success">
          {sgd(totals.savings)} · {pct(totals.savingsPct, 0)}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CalendarDays className="size-3.5" /> {patient.preferredDate}
        </span>
        <ConfidenceBar value={inquiry.aiRequest.confidence} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Pill tone={reviewMeta[inquiry.hospitalReview].tone}>Hospital: {reviewMeta[inquiry.hospitalReview].label}</Pill>
        <Pill tone={reviewMeta[inquiry.doctorReview.state].tone}>
          Doctor: {reviewMeta[inquiry.doctorReview.state].label}
        </Pill>
      </div>
    </Link>
  );
}
