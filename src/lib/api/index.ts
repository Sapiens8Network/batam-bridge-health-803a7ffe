import { hubStatics, useHub } from "../mock/store";
import { monthlyInquiries, responseTimes } from "../mock/data";
import { quoteTotals } from "../quote-math";
import type {
  ActivityFeedItem,
  AiActivityEvent,
  Channel,
  CostBreakdown,
  DashboardSummary,
  Doctor,
  Hospital,
  Hotel,
  Inquiry,
  Itinerary,
  Message,
  Patient,
  Quote,
  ReviewState,
  TransportOption,
  Treatment,
} from "../types";
import { ApiError, request } from "./client";

const db = () => useHub.getState();

export interface InquiryView {
  inquiry: Inquiry;
  patient: Patient;
  quote: Quote;
  hospital: Hospital;
  doctor: Doctor | null;
  itinerary: Itinerary | null;
}

function buildView(inquiry: Inquiry): InquiryView {
  const s = db();
  return {
    inquiry,
    patient: s.patients.find((p) => p.id === inquiry.patientId)!,
    quote: s.quotes.find((q) => q.id === inquiry.quoteId)!,
    hospital: hubStatics.hospitals.find((h) => h.id === inquiry.hospitalId)!,
    doctor: hubStatics.doctors.find((d) => d.id === inquiry.doctorReview.doctorId) ?? null,
    itinerary: s.itineraries.find((i) => i.inquiryId === inquiry.id) ?? null,
  };
}

export interface PatientItineraryPayload {
  patientName: string;
  hospitalName: string;
  hospitalPhone: string;
  status: Itinerary["status"];
  treatment: string;
  steps: Itinerary["steps"];
  cost: {
    benchmark: number;
    packageTotal: number;
    savings: number;
    savingsPct: number;
    medicalSubtotal: number;
    travelSubtotal: number;
    breakdown: CostBreakdown;
  };
}

export const api = {
  /* ---------- inbound webhooks (mocked; replaceable with real endpoints) ---------- */
  webhookTelegram: (payload: { name: string; message: string; treatmentId?: string }) =>
    request<{ inquiryId: string }>("/api/webhooks/telegram", {
      method: "POST",
      body: payload,
      mock: () => {
        const { inquiry } = db().createInboundInquiry({ ...payload, channel: "TELEGRAM" });
        return { inquiryId: inquiry.id };
      },
    }),

  webhookWhatsapp: (payload: { name: string; message: string; treatmentId?: string }) =>
    request<{ inquiryId: string }>("/api/webhooks/whatsapp", {
      method: "POST",
      body: payload,
      mock: () => {
        const { inquiry } = db().createInboundInquiry({ ...payload, channel: "WHATSAPP" });
        return { inquiryId: inquiry.id };
      },
    }),

  /* ---------- reads ---------- */
  dashboardSummary: () =>
    request<{ summary: DashboardSummary; feed: ActivityFeedItem[] }>("/api/dashboard/summary", {
      mock: () => {
        const s = db();
        const savings = s.inquiries.reduce((sum, i) => {
          const quote = s.quotes.find((q) => q.id === i.quoteId);
          if (!quote) return sum;
          const t = quoteTotals(quote);
          return sum + Math.max(t.savings, 0);
        }, 0);
        return {
          summary: {
            singaporeLeads: s.inquiries.length,
            itinerariesGenerated: s.itineraries.length,
            hospitalReviewsPending: s.inquiries.filter((i) => i.hospitalReview === "PENDING").length,
            confirmedBookings: s.inquiries.filter((i) =>
              ["CONFIRMED_BOOKING", "TRAVEL_READY"].includes(i.status),
            ).length,
            completedPatients: s.inquiries.filter((i) => i.status === "COMPLETED").length,
            estimatedSavings: Math.round(savings),
          },
          feed: s.feed,
        };
      },
    }),

  inquiries: () =>
    request<InquiryView[]>("/api/inquiries", {
      mock: () => db().inquiries.map(buildView),
    }),

  inquiry: (id: string) =>
    request<InquiryView>(`/api/inquiries/${id}`, {
      mock: () => {
        const found = db().inquiries.find((i) => i.id === id);
        if (!found) throw new ApiError("Inquiry not found", 404);
        return buildView(found);
      },
    }),

  patients: () =>
    request<{ patient: Patient; inquiries: number; lastStatus: Inquiry["status"] | null }[]>("/api/patients", {
      mock: () => {
        const s = db();
        return s.patients.map((patient) => {
          const own = s.inquiries.filter((i) => i.patientId === patient.id);
          return { patient, inquiries: own.length, lastStatus: own[0]?.status ?? null };
        });
      },
    }),

  patient: (id: string) =>
    request<{ patient: Patient; inquiries: InquiryView[]; messages: Message[] }>(`/api/patients/${id}`, {
      mock: () => {
        const s = db();
        const patient = s.patients.find((p) => p.id === id);
        if (!patient) throw new ApiError("Patient not found", 404);
        return {
          patient,
          inquiries: s.inquiries.filter((i) => i.patientId === id).map(buildView),
          messages: s.messages.filter((m) => m.patientId === id),
        };
      },
    }),

  messages: (patientId?: string) =>
    request<Message[]>(`/api/messages/${patientId ?? ""}`, {
      mock: () => {
        const all = db().messages;
        return patientId ? all.filter((m) => m.patientId === patientId) : all;
      },
    }),

  aiActivity: (inquiryId: string) =>
    request<AiActivityEvent[]>(`/api/ai/activity/${inquiryId}`, {
      mock: () => db().activity.filter((a) => a.inquiryId === inquiryId),
    }),

  aiActivityAll: () =>
    request<AiActivityEvent[]>("/api/ai/activity", { mock: () => db().activity }),

  itinerary: (id: string) =>
    request<Itinerary>(`/api/itineraries/${id}`, {
      mock: () => {
        const found = db().itineraries.find((i) => i.id === id);
        if (!found) throw new ApiError("Itinerary not found", 404);
        return found;
      },
    }),

  quotes: () => request<InquiryView[]>("/api/quotes", { mock: () => db().inquiries.map(buildView) }),

  reference: () =>
    request<{
      hospitals: Hospital[];
      doctors: Doctor[];
      hotels: Hotel[];
      transport: TransportOption[];
      treatments: Treatment[];
    }>("/api/reference", {
      mock: () => ({
        hospitals: hubStatics.hospitals,
        doctors: hubStatics.doctors,
        hotels: hubStatics.hotels,
        transport: hubStatics.transportOptions,
        treatments: hubStatics.treatments,
      }),
    }),

  analytics: () =>
    request<{
      monthly: typeof monthlyInquiries;
      responseTimes: typeof responseTimes;
      byTreatment: { name: string; patients: number; batam: number; singapore: number }[];
      funnel: { stage: string; count: number }[];
      conversionRate: number;
      avgSavings: number;
      revenueOpportunity: number;
    }>("/api/analytics", {
      mock: () => {
        const s = db();
        const byTreatment = hubStatics.treatments.map((t) => ({
          name: t.name,
          patients: s.inquiries.filter((i) => i.aiRequest.treatment === t.name).length,
          batam: t.batamPrice,
          singapore: t.singaporeBenchmark,
        }));
        const totals = s.inquiries.map((i) => {
          const q = s.quotes.find((x) => x.id === i.quoteId)!;
          return quoteTotals(q);
        });
        const confirmed = s.inquiries.filter((i) =>
          ["CONFIRMED_BOOKING", "TRAVEL_READY", "COMPLETED"].includes(i.status),
        ).length;
        return {
          monthly: monthlyInquiries,
          responseTimes,
          byTreatment,
          funnel: [
            { stage: "Inquiries", count: s.inquiries.length },
            { stage: "AI itinerary", count: s.itineraries.length },
            { stage: "Hospital review", count: s.inquiries.filter((i) => i.hospitalReview !== "NOT_REQUIRED").length },
            { stage: "Approved quote", count: s.quotes.filter((q) => q.status === "APPROVED" || q.status === "SENT_TO_PATIENT").length },
            { stage: "Confirmed", count: confirmed },
          ],
          conversionRate: s.inquiries.length ? (confirmed / s.inquiries.length) * 100 : 0,
          avgSavings: totals.length ? totals.reduce((a, b) => a + b.savings, 0) / totals.length : 0,
          revenueOpportunity: totals.reduce((a, b) => a + b.packageTotal, 0),
        };
      },
    }),

  publicItinerary: (token: string) =>
    request<PatientItineraryPayload>(`/api/public/itinerary/${token}`, {
      mock: () => {
        const s = db();
        const itinerary = s.itineraries.find((i) => i.token === token);
        if (!itinerary) throw new ApiError("Itinerary not found", 404);
        const inquiry = s.inquiries.find((i) => i.id === itinerary.inquiryId)!;
        const patient = s.patients.find((p) => p.id === inquiry.patientId)!;
        const hospital = hubStatics.hospitals.find((h) => h.id === itinerary.hospitalId)!;
        const quote = s.quotes.find((q) => q.id === inquiry.quoteId)!;
        const t = quoteTotals(quote);
        return {
          patientName: patient.name,
          hospitalName: hospital.name,
          hospitalPhone: hospital.contactPhone,
          status: itinerary.status,
          treatment: inquiry.aiRequest.treatment,
          steps: itinerary.steps,
          cost: {
            benchmark: t.benchmarkTotal,
            packageTotal: t.packageTotal,
            savings: t.savings,
            savingsPct: t.savingsPct,
            medicalSubtotal: t.medicalSubtotal,
            travelSubtotal: t.travelSubtotal,
            breakdown: quote.breakdown,
          },
        };
      },
    }),

  /* ---------- writes ---------- */
  patchItinerary: (id: string, body: { breakdown: CostBreakdown }) =>
    request<{ ok: true }>(`/api/itineraries/${id}`, {
      method: "PATCH",
      body,
      mock: () => {
        const s = db();
        const itinerary = s.itineraries.find((i) => i.id === id);
        if (!itinerary) throw new ApiError("Itinerary not found", 404);
        const inquiry = s.inquiries.find((i) => i.id === itinerary.inquiryId)!;
        s.updateQuote(inquiry.quoteId, body.breakdown);
        s.pushFeed("Hospital updated package pricing", "INFO", inquiry.id);
        return { ok: true } as const;
      },
    }),

  approveItinerary: (id: string) =>
    request<{ ok: true }>(`/api/itineraries/${id}/approve`, {
      method: "POST",
      mock: () => {
        const s = db();
        const itinerary = s.itineraries.find((i) => i.id === id);
        if (!itinerary) throw new ApiError("Itinerary not found", 404);
        s.setItineraryStatus(itinerary.inquiryId, "HOSPITAL_CONFIRMED");
        s.setHospitalReview(itinerary.inquiryId, "APPROVED");
        s.setInquiryStatus(itinerary.inquiryId, "QUOTE_APPROVED");
        s.pushActivity(itinerary.inquiryId, "Hospital approved itinerary", "DONE", 400);
        s.pushFeed("Hospital approved itinerary", "SUCCESS", itinerary.inquiryId);
        return { ok: true } as const;
      },
    }),

  sendItinerary: (id: string) =>
    request<{ ok: true }>(`/api/itineraries/${id}/send`, {
      method: "POST",
      mock: () => {
        const s = db();
        const itinerary = s.itineraries.find((i) => i.id === id);
        if (!itinerary) throw new ApiError("Itinerary not found", 404);
        const inquiry = s.inquiries.find((i) => i.id === itinerary.inquiryId)!;
        s.setItineraryStatus(inquiry.id, "SENT");
        s.setInquiryStatus(inquiry.id, "PATIENT_CONFIRMATION_PENDING");
        s.addMessage({
          patientId: inquiry.patientId,
          inquiryId: inquiry.id,
          channel: inquiry.channel,
          author: "HOSPITAL_STAFF",
          body: "Your confirmed itinerary link has been sent. Please review and confirm your booking.",
          sent: true,
        });
        s.pushActivity(inquiry.id, "Patient notified", "DONE", 260);
        s.pushFeed(`Itinerary sent to patient on ${inquiry.channel.toLowerCase()}`, "SUCCESS", inquiry.id);
        return { ok: true } as const;
      },
    }),

  humanTakeover: (inquiryId: string, body: { action: "TAKE_OVER" | "ASSIGN" | "RETURN_TO_AI" | "CLOSE"; staff?: string }) =>
    request<{ ok: true }>(`/api/inquiries/${inquiryId}/human-takeover`, {
      method: "POST",
      body,
      mock: () => {
        const s = db();
        if (body.action === "TAKE_OVER") {
          s.setTakeover(inquiryId, { active: true, assignedStaff: "You", openedAt: new Date().toISOString() });
          s.setInquiryStatus(inquiryId, "HUMAN_TAKEOVER");
          s.pushFeed("Human takeover started", "ATTENTION", inquiryId);
        } else if (body.action === "ASSIGN") {
          s.setTakeover(inquiryId, { active: true, assignedStaff: body.staff ?? "Coordinator" });
          s.pushFeed(`Case assigned to ${body.staff ?? "Coordinator"}`, "INFO", inquiryId);
        } else if (body.action === "RETURN_TO_AI") {
          s.setTakeover(inquiryId, { active: false, assignedStaff: null, reasons: [] });
          s.setInquiryStatus(inquiryId, "AI_ITINERARY_READY");
          s.pushFeed("Case returned to AI agent", "INFO", inquiryId);
        } else {
          s.setTakeover(inquiryId, { active: false });
          s.setInquiryStatus(inquiryId, "COMPLETED");
          s.pushFeed("Case closed", "INFO", inquiryId);
        }
        return { ok: true } as const;
      },
    }),

  quoteAction: (
    quoteId: string,
    body: { action: "SAVE_DRAFT" | "REQUEST_DOCTOR" | "APPROVE" | "REJECT" | "SEND"; breakdown?: CostBreakdown },
  ) =>
    request<{ ok: true }>(`/api/quotes/${quoteId}/approve`, {
      method: "POST",
      body,
      mock: () => {
        const s = db();
        const quote = s.quotes.find((q) => q.id === quoteId);
        if (!quote) throw new ApiError("Quote not found", 404);
        if (body.breakdown) s.updateQuote(quoteId, body.breakdown);
        const inquiryId = quote.inquiryId;
        if (body.action === "SAVE_DRAFT") {
          s.setQuoteStatus(quoteId, "DRAFT");
          s.pushFeed("Quote draft saved", "INFO", inquiryId);
        } else if (body.action === "REQUEST_DOCTOR") {
          s.setQuoteStatus(quoteId, "PENDING_DOCTOR");
          s.setDoctorReview(inquiryId, { state: "PENDING" });
          s.setInquiryStatus(inquiryId, "DOCTOR_REVIEW_REQUIRED");
          s.pushFeed("Doctor review requested", "ATTENTION", inquiryId);
        } else if (body.action === "APPROVE") {
          s.setQuoteStatus(quoteId, "APPROVED");
          s.setHospitalReview(inquiryId, "APPROVED");
          s.setInquiryStatus(inquiryId, "QUOTE_APPROVED");
          s.setItineraryStatus(inquiryId, "HOSPITAL_CONFIRMED");
          s.pushActivity(inquiryId, "Hospital approved quote", "DONE", 320);
          s.pushFeed("Quote approved by hospital", "SUCCESS", inquiryId);
        } else if (body.action === "REJECT") {
          s.setQuoteStatus(quoteId, "REJECTED");
          s.setHospitalReview(inquiryId, "REJECTED");
          s.pushFeed("Quote rejected by hospital", "ATTENTION", inquiryId);
        } else {
          s.setQuoteStatus(quoteId, "SENT_TO_PATIENT");
          s.setInquiryStatus(inquiryId, "PATIENT_CONFIRMATION_PENDING");
          s.setItineraryStatus(inquiryId, "SENT");
          s.pushFeed("Quote sent to patient", "SUCCESS", inquiryId);
        }
        return { ok: true } as const;
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
  ) =>
    request<{ ok: true }>(`/api/doctors/${doctorId}/review`, {
      method: "POST",
      body,
      mock: () => {
        const s = db();
        const map: Record<typeof body.action, ReviewState> = {
          APPROVE: "APPROVED",
          MODIFY: "PENDING",
          REQUEST_INFO: "PENDING",
          REFER: "PENDING",
          REJECT: "REJECTED",
        };
        s.setDoctorReview(body.inquiryId, {
          state: map[body.action],
          ...(body.note !== undefined ? { note: body.note } : {}),
          ...(body.proposedTreatment !== undefined ? { proposedTreatment: body.proposedTreatment } : {}),
          ...(body.appointmentAt !== undefined ? { appointmentAt: body.appointmentAt } : {}),
          ...(body.estimatedDurationMinutes !== undefined
            ? { estimatedDurationMinutes: body.estimatedDurationMinutes }
            : {}),
        });
        if (body.action === "APPROVE") {
          s.setInquiryStatus(body.inquiryId, "HOSPITAL_REVIEW_REQUIRED");
          s.pushActivity(body.inquiryId, "Doctor approved treatment plan", "DONE", 500, { doctorId });
          s.pushFeed("Doctor approved treatment plan", "SUCCESS", body.inquiryId);
        } else {
          s.pushFeed(`Doctor action: ${body.action.replace("_", " ").toLowerCase()}`, "ATTENTION", body.inquiryId);
        }
        return { ok: true } as const;
      },
    }),

  sendMessage: (body: { patientId: string; inquiryId: string; channel: Channel; text: string }) =>
    request<{ ok: true }>("/api/messages", {
      method: "POST",
      body,
      mock: () => {
        const s = db();
        s.addMessage({
          patientId: body.patientId,
          inquiryId: body.inquiryId,
          channel: body.channel,
          author: "HOSPITAL_STAFF",
          body: body.text,
          sent: true,
        });
        s.pushFeed(`Reply sent on ${body.channel.toLowerCase()}`, "INFO", body.inquiryId);
        return { ok: true } as const;
      },
    }),
};

export type Api = typeof api;
