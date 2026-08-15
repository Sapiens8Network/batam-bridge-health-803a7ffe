import { useMutation } from "@tanstack/react-query";
import { Bot, CircleUserRound, Hand, PauseCircle, UserPlus, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Pill } from "@/components/hub/Pill";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { Inquiry } from "@/lib/types";

export function detectTakeoverReasons(inquiry: Inquiry): string[] {
  const reasons = new Set(inquiry.humanTakeover.reasons);
  const text = inquiry.originalMessage.toLowerCase();
  if (inquiry.aiRequest.confidence < 0.75) reasons.add("AI confidence below 75%");
  if (/(diagnos|is it safe|should i|symptom)/.test(text))
    reasons.add("Medical diagnosis or suitability request");
  if (/(emergency|urgent|bleeding|severe pain|accident)/.test(text))
    reasons.add("Emergency language detected");
  if (/(human|staff|call me|speak to someone)/.test(text)) reasons.add("Patient requested a human");
  if (!inquiry.aiRequest.treatment) reasons.add("Unknown procedure");
  return [...reasons];
}

export function HumanTakeoverPanel({ inquiry }: { inquiry: Inquiry }) {
  const reasons = detectTakeoverReasons(inquiry);
  const active = inquiry.humanTakeover.active || inquiry.status === "HUMAN_TAKEOVER";

  const mutation = useMutation({
    mutationFn: (action: "TAKE_OVER" | "ASSIGN" | "RETURN_TO_AI" | "CLOSE") =>
      api.humanTakeover(
        inquiry.id,
        action === "ASSIGN" ? { action, staff: "Coordinator Aisha" } : { action },
      ),
    onSuccess: (_r, action) =>
      toast.success(
        {
          TAKE_OVER: "You have taken over this case",
          ASSIGN: "Case assigned to Coordinator Aisha",
          RETURN_TO_AI: "Case returned to the AI agent",
          CLOSE: "Case closed",
        }[action],
      ),
    onError: () => toast.error("Takeover action failed"),
  });

  if (!active && reasons.length === 0) return null;

  return (
    <section
      className={
        active
          ? "rounded-xl border border-destructive/30 bg-destructive/5 p-4"
          : "rounded-xl border border-warning/40 bg-warning-soft/60 p-4"
      }
      aria-label="Human takeover"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <PauseCircle
            className={active ? "mt-0.5 size-5 text-destructive" : "mt-0.5 size-5 text-warning"}
          />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {active ? "HUMAN_REVIEW_REQUIRED" : "Human review recommended"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {active
                ? "AI has paused this case and requested human assistance."
                : "Signals in this inquiry suggest a coordinator should review before the AI continues."}
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {reasons.map((reason) => (
                <li key={reason}>
                  <Pill tone={active ? "danger" : "warning"}>{reason}</Pill>
                </li>
              ))}
            </ul>
            {inquiry.humanTakeover.assignedStaff ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CircleUserRound className="size-3.5" /> Handled by{" "}
                {inquiry.humanTakeover.assignedStaff}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate("TAKE_OVER")}
          >
            <Hand className="size-4" /> Take over
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate("ASSIGN")}
          >
            <UserPlus className="size-4" /> Assign staff
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate("RETURN_TO_AI")}
          >
            <Bot className="size-4" /> Return to AI
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate("CLOSE")}
          >
            <XCircle className="size-4" /> Close case
          </Button>
        </div>
      </div>
    </section>
  );
}
