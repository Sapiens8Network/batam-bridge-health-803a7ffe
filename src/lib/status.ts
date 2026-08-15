import type { InquiryStatus, Priority, ReviewState, ConfirmationState } from "./types";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "batam" | "singapore";

export const toneClass: Record<Tone, string> = {
  neutral: "bg-neutral-soft text-muted-foreground border-border",
  info: "bg-info-soft text-info border-info/25",
  success: "bg-success-soft text-success border-success/25",
  warning: "bg-warning-soft text-warning-foreground border-warning/40",
  danger: "bg-destructive/10 text-destructive border-destructive/25",
  batam: "bg-batam-soft text-batam border-batam/25",
  singapore: "bg-singapore-soft text-singapore border-singapore/25",
};

export const dotClass: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  batam: "bg-batam",
  singapore: "bg-singapore",
};

export const inquiryStatusMeta: Record<InquiryStatus, { label: string; tone: Tone; short: string }> = {
  NEW_INQUIRY: { label: "New inquiry", tone: "info", short: "New" },
  AI_PROCESSING: { label: "AI processing", tone: "info", short: "Processing" },
  AI_ITINERARY_READY: { label: "AI itinerary ready", tone: "batam", short: "Itinerary ready" },
  HOSPITAL_REVIEW_REQUIRED: { label: "Hospital review required", tone: "warning", short: "Hospital review" },
  DOCTOR_REVIEW_REQUIRED: { label: "Doctor review required", tone: "warning", short: "Doctor review" },
  QUOTE_APPROVED: { label: "Quote approved", tone: "success", short: "Approved" },
  PATIENT_CONFIRMATION_PENDING: { label: "Patient confirmation pending", tone: "info", short: "Awaiting patient" },
  CONFIRMED_BOOKING: { label: "Confirmed booking", tone: "success", short: "Confirmed" },
  TRAVEL_READY: { label: "Travel ready", tone: "batam", short: "Travel ready" },
  COMPLETED: { label: "Completed", tone: "neutral", short: "Completed" },
  HUMAN_TAKEOVER: { label: "Human takeover", tone: "danger", short: "Human takeover" },
};

export const pipelineOrder: InquiryStatus[] = [
  "NEW_INQUIRY",
  "AI_PROCESSING",
  "AI_ITINERARY_READY",
  "HOSPITAL_REVIEW_REQUIRED",
  "DOCTOR_REVIEW_REQUIRED",
  "QUOTE_APPROVED",
  "PATIENT_CONFIRMATION_PENDING",
  "CONFIRMED_BOOKING",
  "TRAVEL_READY",
  "COMPLETED",
  "HUMAN_TAKEOVER",
];

export const priorityMeta: Record<Priority, { label: string; tone: Tone }> = {
  LOW: { label: "Low", tone: "neutral" },
  NORMAL: { label: "Normal", tone: "info" },
  HIGH: { label: "High", tone: "warning" },
  URGENT: { label: "Urgent", tone: "danger" },
};

export const reviewMeta: Record<ReviewState, { label: string; tone: Tone }> = {
  NOT_REQUIRED: { label: "Not required", tone: "neutral" },
  PENDING: { label: "Pending", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
};

export const confirmationMeta: Record<ConfirmationState, { label: string; tone: Tone }> = {
  CONFIRMED: { label: "Confirmed", tone: "success" },
  PENDING: { label: "Pending", tone: "warning" },
  ESTIMATED: { label: "Estimated", tone: "info" },
};

export const MEDICAL_DISCLAIMER =
  "This platform provides travel and cost estimates for planning purposes only. Medical suitability, treatment recommendations, availability and final pricing must be confirmed by the treating hospital and doctor.";

export const ESTIMATE_NOTE = "ESTIMATE — subject to hospital confirmation.";
