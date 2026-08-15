/**
 * Frontend API layer. Every call goes to a backend endpoint (TanStack server
 * function) which owns the database, the Hermes AI agent and the messaging
 * providers. The frontend only ever consumes structured JSON.
 */
import {
  confirmItineraryByToken,
  doctorReview,
  getAiActivity,
  getAnalytics,
  getDashboard,
  getInquiries,
  getInquiry,
  getItinerary,
  getMessages,
  getPatient,
  getPatients,
  getPublicItinerary,
  getReference,
  humanTakeover,
  inboundMessage,
  quoteAction as quoteActionFn,
  sendItinerary as sendItineraryFn,
  sendStaffMessage,
  updateQuotePricing,
  type AnalyticsPayload,
  type InquiryViewPayload,
  type PatientItineraryPayload,
} from "../hub.functions";
import type { Channel, CostBreakdown } from "../types";

export type InquiryView = InquiryViewPayload;
export type { PatientItineraryPayload, AnalyticsPayload };

const origin = () => (typeof window === "undefined" ? undefined : window.location.origin);

export const api = {
  /* ---------- inbound channel simulation (same pipeline as the webhooks) ---------- */
  webhookTelegram: (payload: { name: string; message: string }) =>
    inboundMessage({ data: { ...payload, channel: "TELEGRAM" as Channel } }),

  webhookWhatsapp: (payload: { name: string; message: string }) =>
    inboundMessage({ data: { ...payload, channel: "WHATSAPP" as Channel } }),

  /* ---------- reads ---------- */
  dashboardSummary: () => getDashboard(),
  inquiries: () => getInquiries(),
  inquiry: (id: string) => getInquiry({ data: { id } }),
  patients: () => getPatients(),
  patient: (id: string) => getPatient({ data: { id } }),
  messages: (patientId?: string) => getMessages({ data: { patientId } }),
  aiActivity: (inquiryId: string) => getAiActivity({ data: { inquiryId } }),
  aiActivityAll: () => getAiActivity({ data: {} }),
  itinerary: (id: string) => getItinerary({ data: { id } }),
  quotes: () => getInquiries(),
  reference: () => getReference(),
  analytics: () => getAnalytics(),
  publicItinerary: (token: string) => getPublicItinerary({ data: { token } }),

  /* ---------- writes ---------- */
  patchItinerary: (id: string, body: { breakdown: CostBreakdown }) =>
    updateQuotePricing({ data: { itineraryId: id, breakdown: body.breakdown } }),

  approveItinerary: (id: string) => quoteActionFn({ data: { itineraryId: id, action: "APPROVE" } }),

  sendItinerary: (id: string) => sendItineraryFn({ data: { itineraryId: id, origin: origin() } }),

  confirmItineraryByToken: (token: string) => confirmItineraryByToken({ data: { token } }),

  humanTakeover: (
    inquiryId: string,
    body: { action: "TAKE_OVER" | "ASSIGN" | "RETURN_TO_AI" | "CLOSE"; staff?: string },
  ) => humanTakeover({ data: { inquiryId, action: body.action, staff: body.staff } }),

  /**
   * Quote workflow. The quote is keyed by its itinerary on the backend, so the
   * dashboard passes the itinerary id it already holds.
   */
  quoteAction: (
    itineraryId: string,
    body: { action: "SAVE_DRAFT" | "REQUEST_DOCTOR" | "APPROVE" | "REJECT" | "SEND"; breakdown?: CostBreakdown },
  ) =>
    quoteActionFn({
      data: {
        itineraryId,
        action: body.action,
        breakdown: body.breakdown,
        origin: origin(),
      },
    }),

  doctorReview: (
    doctorId: string,
    body: {
      inquiryId: string;
      action: "APPROVE" | "MODIFY" | "REQUEST_INFO" | "REFER" | "REJECT";
      note?: string;
      proposedTreatment?: string;
      appointmentAt?: string;
      estimatedDurationMinutes?: number;
    },
  ) => doctorReview({ data: { doctorId, ...body } }),

  sendMessage: (body: { patientId: string; inquiryId: string; channel: Channel; text: string }) =>
    sendStaffMessage({ data: body }),
};

export type Api = typeof api;
