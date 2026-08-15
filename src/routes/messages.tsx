import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Hand, FileText, Send, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { MedicalDisclaimer } from "@/components/hub/Disclaimer";
import { ChannelPill } from "@/components/hub/InquiryCard";
import { buildPatientMessage } from "@/components/hub/PatientMessagePreview";
import { Pill } from "@/components/hub/Pill";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/hub/StateBlocks";
import { HospitalShell, PageHeader } from "@/components/layout/HospitalShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { inquiriesQuery, messagesQuery } from "@/lib/api/queries";
import { dateTime, relative } from "@/lib/format";
import { quoteTotals } from "@/lib/quote-math";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  patient: z.string().optional(),
  channel: z.enum(["ALL", "WHATSAPP", "TELEGRAM", "WEB"]).default("ALL"),
});

export const Route = createFileRoute("/messages")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Unified Messaging Centre · MedBridge Pass" },
      {
        name: "description",
        content:
          "One inbox for WhatsApp and Telegram patient conversations, with editable AI-suggested replies and hospital takeover.",
      },
      { property: "og:title", content: "Unified Messaging Centre · MedBridge Pass" },
      {
        property: "og:description",
        content: "Handle Singapore patient conversations across WhatsApp and Telegram.",
      },
    ],
  }),
  component: MessagesPage,
});

const authorMeta = {
  PATIENT: { label: "Patient", tone: "singapore" },
  AI: { label: "AI", tone: "info" },
  HOSPITAL_STAFF: { label: "Hospital staff", tone: "batam" },
  SYSTEM: { label: "System", tone: "neutral" },
} as const;

function MessagesPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const inquiries = useQuery(inquiriesQuery());
  const messages = useQuery(messagesQuery());
  const [reply, setReply] = useState("");

  const threads = useMemo(() => {
    const views = inquiries.data ?? [];
    const all = messages.data ?? [];
    return views
      .filter((v) => search.channel === "ALL" || v.inquiry.channel === search.channel)
      .map((v) => ({
        view: v,
        messages: all
          .filter((m) => m.inquiryId === v.inquiry.id)
          .sort((a, b) => a.at.localeCompare(b.at)),
      }))
      .sort((a, b) => (b.messages.at(-1)?.at ?? "").localeCompare(a.messages.at(-1)?.at ?? ""));
  }, [inquiries.data, messages.data, search.channel]);

  const active = threads.find((t) => t.view.patient.id === search.patient) ?? threads[0];

  const send = useMutation({
    mutationFn: (text: string) =>
      api.sendMessage({
        patientId: active!.view.patient.id,
        inquiryId: active!.view.inquiry.id,
        channel: active!.view.inquiry.channel,
        text,
      }),
    onSuccess: () => {
      setReply("");
      toast.success("Reply sent");
    },
    onError: () => toast.error("Reply failed to send"),
  });

  if (inquiries.isPending || messages.isPending) {
    return (
      <HospitalShell>
        <LoadingBlock label="Loading conversations" rows={4} />
      </HospitalShell>
    );
  }

  if (inquiries.isError || messages.isError) {
    return (
      <HospitalShell>
        <ErrorBlock onRetry={() => void inquiries.refetch()} />
      </HospitalShell>
    );
  }

  return (
    <HospitalShell>
      <PageHeader
        title="Messaging centre"
        description="WhatsApp and Telegram conversations, AI suggestions and hospital replies in one thread"
        actions={
          <Tabs
            value={search.channel}
            onValueChange={(value) =>
              void navigate({ to: ".", search: (prev) => ({ ...prev, channel: value as "ALL" }) })
            }
          >
            <TabsList>
              <TabsTrigger value="ALL">All</TabsTrigger>
              <TabsTrigger value="WHATSAPP">WhatsApp</TabsTrigger>
              <TabsTrigger value="TELEGRAM">Telegram</TabsTrigger>
              <TabsTrigger value="WEB">Website</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {threads.length === 0 || !active ? (
        <EmptyBlock title="No conversations on this channel" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[19rem_1fr]">
          <ol className="max-h-[38rem] space-y-2 overflow-y-auto" aria-label="Conversations">
            {threads.map((thread) => {
              const last = thread.messages.at(-1);
              const selected = thread.view.patient.id === active.view.patient.id;
              return (
                <li key={thread.view.inquiry.id}>
                  <button
                    onClick={() =>
                      void navigate({
                        to: ".",
                        search: (prev) => ({ ...prev, patient: thread.view.patient.id }),
                      })
                    }
                    className={cn(
                      "w-full rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40",
                      selected && "border-primary bg-accent/40",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">
                        {thread.view.patient.name}
                      </span>
                      <ChannelPill channel={thread.view.inquiry.channel} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{last?.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {last ? relative(last.at) : ""}
                    </p>
                  </button>
                </li>
              );
            })}
          </ol>

          <section
            className="flex min-h-[38rem] flex-col rounded-xl border bg-card"
            aria-label="Conversation"
          >
            <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">{active.view.patient.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {active.view.inquiry.reference} · {active.view.inquiry.aiRequest.treatment}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/inquiries/$id" params={{ id: active.view.inquiry.id }}>
                    <FileText className="size-4" /> Open case
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void api.humanTakeover(active.view.inquiry.id, { action: "TAKE_OVER" });
                    toast.success("You have taken over this conversation");
                  }}
                >
                  <Hand className="size-4" /> Take over
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (active.view.itinerary) {
                      void api.sendItinerary(active.view.itinerary.id);
                      toast.success("Itinerary sent to patient");
                    }
                  }}
                >
                  <Send className="size-4" /> Send itinerary
                </Button>
              </div>
            </header>

            <ol className="flex-1 space-y-3 overflow-y-auto p-4">
              {active.messages.map((m) => {
                const meta = authorMeta[m.author];
                const mine = m.author === "HOSPITAL_STAFF";
                return (
                  <li key={m.id} className={cn("flex flex-col gap-1", mine && "items-end")}>
                    <div className="flex items-center gap-2">
                      <Pill tone={meta.tone}>{meta.label}</Pill>
                      <span className="text-[11px] text-muted-foreground">{dateTime(m.at)}</span>
                      {m.suggested ? <Pill tone="warning">Suggested draft</Pill> : null}
                    </div>
                    <p
                      className={cn(
                        "max-w-[42rem] whitespace-pre-line rounded-xl border px-3 py-2 text-sm leading-6",
                        m.author === "PATIENT" && "bg-singapore-soft/60",
                        m.author === "AI" && "bg-info-soft/50",
                        mine && "bg-batam-soft/60",
                        m.author === "SYSTEM" && "bg-muted text-muted-foreground",
                      )}
                    >
                      {m.body}
                    </p>
                  </li>
                );
              })}
            </ol>

            <div className="space-y-2 border-t p-4">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a reply to the patient…"
                className="min-h-24 text-sm"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  disabled={!reply.trim() || send.isPending}
                  onClick={() => send.mutate(reply)}
                >
                  <Send className="size-4" /> Reply
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setReply(buildPatientMessage(quoteTotals(active.view.quote)))}
                >
                  <Sparkles className="size-4" /> AI suggest reply
                </Button>
                <span className="text-xs text-muted-foreground">
                  AI suggestions are drafts — review and edit before sending.
                </span>
              </div>
            </div>
          </section>
        </div>
      )}

      <MedicalDisclaimer className="mt-4" />
    </HospitalShell>
  );
}
