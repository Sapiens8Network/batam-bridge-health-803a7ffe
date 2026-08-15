import { useMutation } from "@tanstack/react-query";
import { Check, HelpCircle, PencilLine, Stethoscope, UserRoundSearch, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Field, Pill } from "@/components/hub/Pill";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { dateTime } from "@/lib/format";
import { reviewMeta } from "@/lib/status";
import type { Doctor, Inquiry } from "@/lib/types";

type Action = "APPROVE" | "MODIFY" | "REQUEST_INFO" | "REFER" | "REJECT";

export function DoctorReviewPanel({ inquiry, doctor }: { inquiry: Inquiry; doctor: Doctor | null }) {
  const [note, setNote] = useState("");
  const review = inquiry.doctorReview;

  const mutation = useMutation({
    mutationFn: (action: Action) =>
      api.doctorReview(doctor?.id ?? "unassigned", {
        inquiryId: inquiry.id,
        action,
        ...(note.trim() ? { note: note.trim() } : {}),
      }),
    onSuccess: (_r, action) => {
      setNote("");
      toast.success(
        action === "APPROVE" ? "Doctor approval recorded" : `Doctor action recorded: ${action.replace("_", " ").toLowerCase()}`,
      );
    },
    onError: () => toast.error("Could not record doctor decision"),
  });

  return (
    <section className="rounded-xl border bg-card" aria-label="Doctor review">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Stethoscope className="size-4 text-primary" /> Doctor review
        </h3>
        <Pill tone={reviewMeta[review.state].tone} dot>
          {reviewMeta[review.state].label}
        </Pill>
      </header>

      <div className="space-y-4 p-4">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Patient request" value={inquiry.aiRequest.treatment} />
          <Field label="AI summary" value={`${inquiry.aiRequest.treatmentCategory} · ${Math.round(inquiry.aiRequest.confidence * 100)}% confidence`} />
          <Field label="Proposed treatment" value={review.proposedTreatment ?? "Not set"} />
          <Field
            label="Estimated duration"
            value={review.estimatedDurationMinutes ? `${review.estimatedDurationMinutes} minutes` : "—"}
          />
          <Field label="Assigned doctor" value={doctor ? `${doctor.name} · ${doctor.specialty}` : "Unassigned"} />
          <Field label="Appointment" value={review.appointmentAt ? dateTime(review.appointmentAt) : "To be scheduled"} />
        </dl>

        {review.state === "APPROVED" && review.decidedAt ? (
          <p className="rounded-lg border border-success/25 bg-success-soft px-3 py-2 text-xs text-success">
            Doctor approval recorded {dateTime(review.decidedAt)}
            {review.note ? ` — ${review.note}` : ""}
          </p>
        ) : (
          <p className="rounded-lg border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            No doctor approval has been recorded for this case yet. Treatment suitability is not confirmed.
          </p>
        )}

        <div className="grid gap-2">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Clinical note for the coordination team (optional)"
            className="min-h-20 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate("APPROVE")}>
              <Check className="size-4" /> Approve
            </Button>
            <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate("MODIFY")}>
              <PencilLine className="size-4" /> Modify
            </Button>
            <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate("REQUEST_INFO")}>
              <HelpCircle className="size-4" /> Request more information
            </Button>
            <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate("REFER")}>
              <UserRoundSearch className="size-4" /> Refer to specialist
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate("REJECT")}
            >
              <X className="size-4" /> Reject
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
