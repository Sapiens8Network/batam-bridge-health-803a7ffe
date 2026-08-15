import { create } from "zustand";

import type {
  ActivityFeedItem,
  AiActivityEvent,
  Channel,
  CostBreakdown,
  Inquiry,
  InquiryStatus,
  Itinerary,
  Message,
  Patient,
  Quote,
  ReviewState,
} from "../types";
import {
  doctors,
  hospitals,
  hotels,
  patients as seedPatients,
  seedActivity,
  seedFeed,
  seedInquiries,
  seedItineraries,
  seedMessages,
  seedQuotes,
  transportOptions,
  treatments,
} from "./data";

/**
 * In-memory mock backend. This module stands in for the real API + realtime
 * channel: `src/lib/api` reads from it and the event helpers push updates the
 * same shape a WebSocket/SSE feed would deliver.
 */

export interface HubState {
  version: number;
  patients: Patient[];
  inquiries: Inquiry[];
  quotes: Quote[];
  itineraries: Itinerary[];
  activity: AiActivityEvent[];
  messages: Message[];
  feed: ActivityFeedItem[];
  activeHospitalId: string;
  connections: { ai: boolean; whatsapp: boolean; telegram: boolean };
  demoRunning: boolean;
  demoInquiryId: string | null;
  seq: number;

  setActiveHospital: (id: string) => void;
  setConnection: (key: "ai" | "whatsapp" | "telegram", value: boolean) => void;
  pushFeed: (label: string, tone: ActivityFeedItem["tone"], inquiryId?: string) => void;
  pushActivity: (inquiryId: string, label: string, state: AiActivityEvent["state"], durationMs?: number | null, detail?: Record<string, unknown>) => void;
  createInboundInquiry: (input: { name: string; channel: Channel; message: string; treatmentId?: string; hospitalId?: string }) => { inquiry: Inquiry; patient: Patient };
  setInquiryStatus: (inquiryId: string, status: InquiryStatus) => void;
  setPriority: (inquiryId: string, priority: Inquiry["priority"]) => void;
  updateQuote: (quoteId: string, breakdown: CostBreakdown) => void;
  setQuoteStatus: (quoteId: string, status: Quote["status"]) => void;
  setHospitalReview: (inquiryId: string, state: ReviewState) => void;
  setDoctorReview: (inquiryId: string, patch: Partial<Inquiry["doctorReview"]>) => void;
  setTakeover: (inquiryId: string, patch: Partial<Inquiry["humanTakeover"]>) => void;
  setItineraryStatus: (inquiryId: string, status: Itinerary["status"]) => void;
  addMessage: (msg: Omit<Message, "id" | "at"> & { at?: string }) => Message;
  markMessageSent: (id: string) => void;
  setDemo: (running: boolean, inquiryId?: string | null) => void;
}

const nowIso = () => new Date().toISOString();

export const useHub = create<HubState>((set, get) => ({
  version: 0,
  patients: seedPatients,
  inquiries: seedInquiries,
  quotes: seedQuotes,
  itineraries: seedItineraries,
  activity: seedActivity,
  messages: seedMessages,
  feed: seedFeed,
  activeHospitalId: hospitals[0]!.id,
  connections: { ai: true, whatsapp: true, telegram: true },
  demoRunning: false,
  demoInquiryId: null,
  seq: 100,

  setActiveHospital: (id) => set((s) => ({ activeHospitalId: id, version: s.version + 1 })),
  setConnection: (key, value) =>
    set((s) => ({ connections: { ...s.connections, [key]: value }, version: s.version + 1 })),

  pushFeed: (label, tone, inquiryId) =>
    set((s) => ({
      feed: [{ id: `f_${s.seq + 1}`, at: nowIso(), label, tone, inquiryId }, ...s.feed].slice(0, 40),
      seq: s.seq + 1,
      version: s.version + 1,
    })),

  pushActivity: (inquiryId, label, state, durationMs = null, detail) =>
    set((s) => ({
      activity: [
        ...s.activity,
        { id: `act_${s.seq + 1}`, inquiryId, at: nowIso(), label, state, durationMs, detail },
      ],
      seq: s.seq + 1,
      version: s.version + 1,
    })),

  createInboundInquiry: ({ name, channel, message, treatmentId = "trt_dental_implant", hospitalId }) => {
    const state = get();
    const n = state.seq + 1;
    const treatment = treatments.find((t) => t.id === treatmentId) ?? treatments[0]!;
    const hospital = hospitals.find((h) => h.id === (hospitalId ?? state.activeHospitalId)) ?? hospitals[0]!;
    const hotel = hotels[0]!;
    const ferry = transportOptions[0]!;
    const doctor = doctors.find((d) => d.hospitalId === hospital.id) ?? doctors[0]!;
    const preferredDate = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

    const patient: Patient = {
      id: `pat_live_${n}`,
      name,
      country: "Singapore",
      phoneMasked: "+65 •••• 3907",
      channel,
      travellers: 1,
      preferredDate,
      createdAt: nowIso(),
      language: "English",
    };

    const inquiryId = `inq_live_${n}`;
    const quoteId = `qte_live_${n}`;
    const itineraryId = `itn_live_${n}`;

    const quote: Quote = {
      id: quoteId,
      inquiryId,
      currency: "SGD",
      source: "AI_ESTIMATE",
      breakdown: {
        treatment: treatment.batamPrice,
        doctorFee: Math.round(treatment.batamPrice * 0.12),
        hospitalFee: Math.round(treatment.batamPrice * 0.08),
        diagnostics: 60,
        medication: 35,
        ferry: ferry.price,
        hotel: hotel.nightlyRate * treatment.stayNights,
        localTransport: 30,
        otherServices: 0,
      },
      singaporeBenchmark: { treatment: treatment.singaporeBenchmark, travel: 0, accommodation: 0 },
      status: "DRAFT",
      updatedAt: nowIso(),
    };

    const itinerary: Itinerary = {
      id: itineraryId,
      token: `tkn-live-${n}-9d1b`,
      inquiryId,
      hospitalId: hospital.id,
      status: "DRAFT",
      updatedAt: nowIso(),
      steps: [
        {
          order: 1,
          kind: "OUTBOUND_FERRY",
          title: "Singapore → Batam",
          state: "ESTIMATED",
          facts: [
            { label: "Operator", value: ferry.name },
            { label: "Departure terminal", value: "HarbourFront Centre, Singapore" },
            { label: "Departure time", value: `${preferredDate} · 08:20` },
            { label: "Estimated duration", value: `${ferry.durationMinutes} minutes` },
            { label: "Return", value: "Open return included in package" },
          ],
        },
        {
          order: 2,
          kind: "ARRIVAL",
          title: "Batam arrival & transfer",
          state: "ESTIMATED",
          facts: [
            { label: "Arrival terminal", value: "Batam Centre Ferry Terminal" },
            { label: "Transport", value: "Private car transfer (hospital coordinated)" },
            { label: "Transfer time", value: "25 minutes to hospital" },
          ],
        },
        {
          order: 3,
          kind: "HOSPITAL",
          title: "Hospital appointment",
          state: "PENDING",
          facts: [
            { label: "Hospital", value: hospital.name },
            { label: "Doctor", value: doctor.name },
            { label: "Procedure", value: treatment.name },
            { label: "Appointment", value: `${preferredDate} · 11:00 (to be confirmed)` },
            { label: "Estimated duration", value: `${treatment.durationMinutes} minutes` },
          ],
        },
        {
          order: 4,
          kind: "RECOVERY",
          title: "Recovery & accommodation",
          state: "ESTIMATED",
          facts: [
            { label: "Hotel", value: hotel.name },
            { label: "Nights", value: String(treatment.stayNights) },
            { label: "Area", value: hotel.area },
            { label: "Distance to hospital", value: `${hotel.distanceToHospitalKm} km` },
          ],
        },
        {
          order: 5,
          kind: "FOLLOW_UP",
          title: "Doctor follow-up",
          state: "PENDING",
          facts: [
            { label: "Follow-up", value: "Next-morning review before departure" },
            { label: "Doctor", value: doctor.name },
          ],
        },
        {
          order: 6,
          kind: "RETURN_FERRY",
          title: "Batam → Singapore",
          state: "ESTIMATED",
          facts: [
            { label: "Operator", value: ferry.name },
            { label: "Departure terminal", value: "Batam Centre Ferry Terminal" },
            { label: "Departure time", value: "16:40 local time" },
            { label: "Estimated duration", value: `${ferry.durationMinutes} minutes` },
          ],
        },
      ],
    };

    const inquiry: Inquiry = {
      id: inquiryId,
      reference: `HTH-${2700 + n}`,
      patientId: patient.id,
      hospitalId: hospital.id,
      status: "NEW_INQUIRY",
      priority: "HIGH",
      channel,
      originalMessage: message,
      aiRequest: {
        treatment: treatment.name,
        treatmentCategory: treatment.category,
        confidence: 0.94,
        requirements: ["Complete cost including ferry and hotel", "1 traveller from Singapore"],
        preferredDurationDays: treatment.stayNights + 1,
        specialRequirements: ["English-speaking coordinator requested"],
      },
      hospitalReview: "PENDING",
      doctorReview: {
        doctorId: doctor.id,
        state: "NOT_REQUIRED",
        proposedTreatment: treatment.name,
        estimatedDurationMinutes: treatment.durationMinutes,
        appointmentAt: `${preferredDate}T11:00:00+07:00`,
        note: null,
        decidedAt: null,
      },
      humanTakeover: { active: false, reasons: [], assignedStaff: null, openedAt: null },
      quoteId,
      itineraryId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    set((s) => ({
      patients: [patient, ...s.patients],
      inquiries: [inquiry, ...s.inquiries],
      quotes: [quote, ...s.quotes],
      itineraries: [itinerary, ...s.itineraries],
      messages: [
        ...s.messages,
        { id: `msg_${n}`, patientId: patient.id, inquiryId, channel, author: "PATIENT", body: message, at: nowIso() },
      ],
      seq: n,
      version: s.version + 1,
    }));

    return { inquiry, patient };
  },

  setInquiryStatus: (inquiryId, status) =>
    set((s) => ({
      inquiries: s.inquiries.map((i) => (i.id === inquiryId ? { ...i, status, updatedAt: nowIso() } : i)),
      version: s.version + 1,
    })),

  setPriority: (inquiryId, priority) =>
    set((s) => ({
      inquiries: s.inquiries.map((i) => (i.id === inquiryId ? { ...i, priority, updatedAt: nowIso() } : i)),
      version: s.version + 1,
    })),

  updateQuote: (quoteId, breakdown) =>
    set((s) => ({
      quotes: s.quotes.map((q) =>
        q.id === quoteId ? { ...q, breakdown, source: "HOSPITAL_OVERRIDE", updatedAt: nowIso() } : q,
      ),
      version: s.version + 1,
    })),

  setQuoteStatus: (quoteId, status) =>
    set((s) => ({
      quotes: s.quotes.map((q) => (q.id === quoteId ? { ...q, status, updatedAt: nowIso() } : q)),
      version: s.version + 1,
    })),

  setHospitalReview: (inquiryId, state) =>
    set((s) => ({
      inquiries: s.inquiries.map((i) =>
        i.id === inquiryId ? { ...i, hospitalReview: state, updatedAt: nowIso() } : i,
      ),
      version: s.version + 1,
    })),

  setDoctorReview: (inquiryId, patch) =>
    set((s) => ({
      inquiries: s.inquiries.map((i) =>
        i.id === inquiryId
          ? {
              ...i,
              doctorReview: {
                ...i.doctorReview,
                ...patch,
                decidedAt: patch.state === "APPROVED" || patch.state === "REJECTED" ? nowIso() : i.doctorReview.decidedAt,
              },
              updatedAt: nowIso(),
            }
          : i,
      ),
      version: s.version + 1,
    })),

  setTakeover: (inquiryId, patch) =>
    set((s) => ({
      inquiries: s.inquiries.map((i) =>
        i.id === inquiryId ? { ...i, humanTakeover: { ...i.humanTakeover, ...patch }, updatedAt: nowIso() } : i,
      ),
      version: s.version + 1,
    })),

  setItineraryStatus: (inquiryId, status) =>
    set((s) => ({
      itineraries: s.itineraries.map((it) =>
        it.inquiryId === inquiryId
          ? {
              ...it,
              status,
              updatedAt: nowIso(),
              steps:
                status === "HOSPITAL_CONFIRMED" || status === "SENT" || status === "PATIENT_CONFIRMED"
                  ? it.steps.map((step) => (step.kind === "FOLLOW_UP" ? step : { ...step, state: "CONFIRMED" as const }))
                  : it.steps,
            }
          : it,
      ),
      version: s.version + 1,
    })),

  addMessage: (msg) => {
    const state = get();
    const created: Message = { ...msg, id: `msg_${state.seq + 1}`, at: msg.at ?? nowIso() };
    set((s) => ({ messages: [...s.messages, created], seq: s.seq + 1, version: s.version + 1 }));
    return created;
  },

  markMessageSent: (id) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, sent: true, suggested: false } : m)),
      version: s.version + 1,
    })),

  setDemo: (running, inquiryId = null) =>
    set((s) => ({ demoRunning: running, demoInquiryId: inquiryId ?? s.demoInquiryId, version: s.version + 1 })),
}));

export const hubStatics = { hospitals, doctors, hotels, transportOptions, treatments };
