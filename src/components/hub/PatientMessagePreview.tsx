import { useMutation } from "@tanstack/react-query";
import { MessageCircle, RefreshCw, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Pill } from "@/components/hub/Pill";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { sgd } from "@/lib/format";
import type { Channel, QuoteTotals } from "@/lib/types";

export function buildPatientMessage(totals: QuoteTotals) {
  return [
    "Your Batam medical travel estimate is ready.",
    `🇮🇩 Batam package: ${sgd(totals.packageTotal)}`,
    `🇸🇬 Singapore estimate: ${sgd(totals.benchmarkTotal)}`,
    `💰 Estimated saving: ${sgd(totals.savings)}`,
    "Your itinerary is waiting for hospital confirmation.",
  ].join("\n");
}

export function PatientMessagePreview({
  totals,
  patientId,
  inquiryId,
  channel,
}: {
  totals: QuoteTotals;
  patientId: string;
  inquiryId: string;
  channel: Channel;
}) {
  const [text, setText] = useState(() => buildPatientMessage(totals));

  useEffect(() => {
    setText(buildPatientMessage(totals));
  }, [totals.packageTotal, totals.benchmarkTotal, totals.savings]);

  const send = useMutation({
    mutationFn: (target: Channel) =>
      api.sendMessage({ patientId, inquiryId, channel: target, text }),
    onSuccess: (_r, target) =>
      toast.success(`Message sent on ${target === "WHATSAPP" ? "WhatsApp" : "Telegram"}`),
    onError: () => toast.error("Message could not be sent"),
  });

  const lines = text.split("\n").filter(Boolean).length;

  return (
    <section className="rounded-xl border bg-card" aria-label="Patient response preview">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MessageCircle className="size-4 text-primary" /> Patient response preview
        </h3>
        <Pill tone={lines >= 4 && lines <= 8 ? "success" : "warning"}>{lines} lines</Pill>
      </header>
      <div className="space-y-3 p-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-32 text-sm leading-6"
        />
        <p className="text-xs text-muted-foreground">
          AI-suggested wording is always editable and is never auto-sent. Keep patient messages to
          4–8 lines.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={send.isPending} onClick={() => send.mutate("WHATSAPP")}>
            <Send className="size-4" /> Send WhatsApp
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={send.isPending}
            onClick={() => send.mutate("TELEGRAM")}
          >
            <Send className="size-4" /> Send Telegram
          </Button>
          <Button size="sm" variant="outline" onClick={() => setText(buildPatientMessage(totals))}>
            <RefreshCw className="size-4" /> Regenerate
          </Button>
          <span className="self-center text-xs text-muted-foreground">
            Channel of record: {channel.toLowerCase()}
          </span>
        </div>
      </div>
    </section>
  );
}
