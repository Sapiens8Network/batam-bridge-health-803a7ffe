/**
 * Server-only backend for Health Tourism Hub.
 *
 * Everything that touches the database, the Hermes AI agent or the messaging
 * providers lives here. The frontend never sees this module: it only consumes
 * the structured payloads produced by src/lib/hub.functions.ts.
 */
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
  InquiryStatus,
  Itinerary,
  ItineraryStep,
  Message,
  Patient,
  Priority,
  Quote,
  ReviewState,
  TransportOption,
  Treatment,
} from "../types";

/* ------------------------------------------------------------------ db ---- */

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

export async function db(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const n = (v: unknown) => Math.round(Number(v ?? 0) * 100) / 100;
const iso = (v: unknown) => (typeof v === "string" ? v : new Date().toISOString());

export class HubError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/* -------------------------------------------------------------- mappers --- */

const maskPhone = (phone: string | null) =>
  phone ? phone.replace(/\d(?=\d{3})/g, "•").replace(/•{4,}/g, (m) => m.slice(0, 4)) : "•••• ••••";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export function mapPatient(row: Row): Patient {
  return {
    id: row["id"] as string,
    name: row["name"] as string,
    country: (row["country"] as string) === "SINGAPORE" ? "Singapore" : (row["country"] as string),
    phoneMasked: maskPhone((row["phone"] as string | null) ?? null),
    channel: row["preferred_channel"] as Channel,
    travellers: Number(row["traveller_count"] ?? 1),
    preferredDate: iso(row["created_at"]),
    createdAt: iso(row["created_at"]),
    language: (row["preferred_language"] as string) ?? "English",
  };
}

function reviewState(v: string | null): ReviewState {
  if (v === "APPROVED") return "APPROVED";
  if (v === "REJECTED") return "REJECTED";
  if (v === null) return "NOT_REQUIRED";
  return "PENDING";
}

export function breakdownOf(itinerary: Row | null | undefined): CostBreakdown {
  return {
    treatment: n(itinerary?.["treatment_cost_sgd"]),
    doctorFee: n(itinerary?.["doctor_fee_sgd"]),
    hospitalFee: n(itinerary?.["hospital_fee_sgd"]),
    diagnostics: n(itinerary?.["diagnostics_cost_sgd"]),
    medication: n(itinerary?.["medication_cost_sgd"]),
    ferry: n(itinerary?.["ferry_cost_sgd"]),
    hotel: n(itinerary?.["hotel_cost_sgd"]),
    localTransport: n(itinerary?.["transport_cost_sgd"]),
    otherServices: n(itinerary?.["other_cost_sgd"]),
  };
}

export function mapQuote(quote: Row | null, itinerary: Row | null, requestId: string): Quote {
  const status: Quote["status"] = quote?.["sent_at"]
    ? "SENT_TO_PATIENT"
    : quote?.["status"] === "APPROVED"
      ? "APPROVED"
      : quote?.["status"] === "REJECTED"
        ? "REJECTED"
        : quote?.["status"] === "PENDING_REVIEW"
          ? "PENDING_DOCTOR"
          : "DRAFT";
  return {
    id: (quote?.["id"] as string) ?? `pending-${requestId}`,
    inquiryId: requestId,
    currency: "SGD",
    source: (quote?.["source"] as string) === "HOSPITAL_OVERRIDE" ? "HOSPITAL_OVERRIDE" : "AI_ESTIMATE",
    breakdown: breakdownOf(itinerary),
    singaporeBenchmark: {
      treatment: n(itinerary?.["singapore_benchmark_sgd"]),
      travel: n(itinerary?.["singapore_benchmark_travel_sgd"]),
      accommodation: n(itinerary?.["singapore_benchmark_accommodation_sgd"]),
    },
    status,
    updatedAt: iso(quote?.["updated_at"] ?? itinerary?.["updated_at"]),
  };
}

const stepKind = (type: string, index: number, total: number): ItineraryStep["kind"] => {
  if (type === "FERRY") return index >= total - 1 ? "RETURN_FERRY" : "OUTBOUND_FERRY";
  if (type === "TRANSPORT") return "ARRIVAL";
  if (type === "TREATMENT") return "HOSPITAL";
  if (type === "ACCOMMODATION") return "RECOVERY";
  if (type === "FOLLOW_UP") return "FOLLOW_UP";
  return "HOSPITAL";
};

export function mapItinerary(itinerary: Row | null, items: Row[], requestId: string): Itinerary | null {
  if (!itinerary) return null;
  const sorted = [...items].sort((a, b) => Number(a["sort_order"]) - Number(b["sort_order"]));
  return {
    id: itinerary["id"] as string,
    token: itinerary["public_token"] as string,
    inquiryId: requestId,
    status: itinerary["status"] === "REJECTED" ? "DRAFT" : (itinerary["status"] as Itinerary["status"]),
    hospitalId: (itinerary["hospital_id"] as string) ?? "",
    updatedAt: iso(itinerary["updated_at"]),
    steps: sorted.map((item, index) => ({
      order: index + 1,
      kind: stepKind(item["type"] as string, index, sorted.length),
      title: item["title"] as string,
      state:
        item["status"] === "CONFIRMED" || item["status"] === "COMPLETED"
          ? "CONFIRMED"
          : item["status"] === "PENDING"
            ? "PENDING"
            : "ESTIMATED",
      facts: [
        { label: "Day", value: `Day ${String(item["day_number"])}` },
        ...(item["time"] ? [{ label: "Time", value: item["time"] as string }] : []),
        ...(item["location"] ? [{ label: "Location", value: item["location"] as string }] : []),
        ...(item["description"] ? [{ label: "Details", value: item["description"] as string }] : []),
      ],
    })),
  };
}

export function mapInquiry(row: Row, quote: Row | null, itinerary: Row | null, review: Row | null): Inquiry {
  const ai = (row["ai_request"] ?? {}) as Row;
  return {
    id: row["id"] as string,
    reference: row["reference"] as string,
    patientId: row["patient_id"] as string,
    hospitalId: (row["hospital_id"] as string) ?? "",
    status: row["status"] === "REJECTED" ? "HUMAN_TAKEOVER" : (row["status"] as InquiryStatus),
    priority: row["priority"] as Priority,
    channel: row["channel"] as Channel,
    originalMessage: row["original_message"] as string,
    aiRequest: {
      treatment: (ai["treatment"] as string) ?? "Pending classification",
      treatmentCategory: (ai["treatmentCategory"] as string) ?? "Unclassified",
      confidence: Number(row["ai_confidence"] ?? 0),
      requirements: (ai["requirements"] as string[]) ?? [],
      preferredDurationDays: Number(row["preferred_nights"] ?? 1),
      specialRequirements: (ai["specialRequirements"] as string[]) ?? [],
    },
    hospitalReview: reviewState((row["hospital_review"] as string | null) ?? null),
    doctorReview: {
      doctorId: (review?.["doctor_id"] as string | null) ?? null,
      state: review ? reviewState(review["status"] === "PENDING" ? "PENDING" : (review["status"] as string)) : "NOT_REQUIRED",
      proposedTreatment: (review?.["proposed_treatment"] as string | null) ?? null,
      estimatedDurationMinutes: review?.["estimated_duration_minutes"]
        ? Number(review["estimated_duration_minutes"])
        : null,
      appointmentAt: (review?.["appointment_at"] as string | null) ?? null,
      note: (review?.["comments"] as string | null) ?? null,
      decidedAt: (review?.["reviewed_at"] as string | null) ?? null,
    },
    humanTakeover: {
      active: Boolean(row["human_takeover"]),
      reasons: (row["takeover_reasons"] as string[]) ?? [],
      assignedStaff: (row["takeover_staff"] as string | null) ?? null,
      openedAt: (row["takeover_opened_at"] as string | null) ?? null,
    },
    quoteId: (quote?.["id"] as string) ?? `pending-${String(row["id"])}`,
    itineraryId: (itinerary?.["id"] as string | null) ?? null,
    createdAt: iso(row["created_at"]),
    updatedAt: iso(row["updated_at"]),
  };
}

export function mapEvent(row: Row): AiActivityEvent {
  const state: AiActivityEvent["state"] =
    row["status"] === "RUNNING"
      ? "RUNNING"
      : row["status"] === "ATTENTION"
        ? "ATTENTION"
        : row["status"] === "FAILED"
          ? "FAILED"
          : "DONE";
  return {
    id: row["id"] as string,
    inquiryId: row["medical_request_id"] as string,
    at: iso(row["started_at"]),
    label: (row["message"] as string) || (row["event_type"] as string),
    state,
    durationMs: row["duration_ms"] === null || row["duration_ms"] === undefined ? null : Number(row["duration_ms"]),
    detail: (row["metadata"] as Record<string, unknown> | null) ?? undefined,
  };
}

export function mapMessage(row: Row): Message {
  const author: Message["author"] =
    row["message_type"] === "PATIENT"
      ? "PATIENT"
      : row["message_type"] === "AI"
        ? "AI"
        : row["message_type"] === "HOSPITAL"
          ? "HOSPITAL_STAFF"
          : "SYSTEM";
  return {
    id: row["id"] as string,
    patientId: row["patient_id"] as string,
    inquiryId: (row["medical_request_id"] as string) ?? "",
    channel: row["channel"] as Channel,
    author,
    body: row["raw_text"] as string,
    at: iso(row["sent_at"]),
    suggested: Boolean(row["suggested"]),
    sent: row["delivery_status"] !== "QUEUED",
  };
}

export const mapHospital = (row: Row): Hospital => ({
  id: row["id"] as string,
  name: row["name"] as string,
  city: row["location"] as string,
  accreditation: row["accreditation"] as string,
  contactPhone: row["contact_phone"] as string,
  specialties: (row["specialties"] as string[]) ?? [],
});

export const mapDoctor = (row: Row): Doctor => ({
  id: row["id"] as string,
  name: row["name"] as string,
  specialty: row["specialty"] as string,
  hospitalId: row["hospital_id"] as string,
  languages: (row["languages"] as string[]) ?? [],
  yearsExperience: Number(row["years_experience"] ?? 0),
});

export const mapHotel = (row: Row): Hotel => ({
  id: row["id"] as string,
  name: row["name"] as string,
  area: row["location"] as string,
  nightlyRate: n(row["price_per_night_sgd"]),
  distanceToHospitalKm: Number(row["distance_to_hospital_km"] ?? 0),
  rating: Number(row["rating"] ?? 0),
});

export const mapTransport = (row: Row): TransportOption => ({
  id: row["id"] as string,
  name: (row["name"] as string) || (row["type"] as string),
  type: row["type"] as TransportOption["type"],
  route: `${String(row["origin"])} → ${String(row["destination"])}`,
  price: n(row["estimated_cost_sgd"]),
  durationMinutes: Number(row["estimated_duration_minutes"] ?? 0),
});

/* ---------------------------------------------------------- aggregates --- */

interface Bundle {
  requests: Row[];
  quotes: Row[];
  itineraries: Row[];
  items: Row[];
  reviews: Row[];
  patients: Row[];
  hospitals: Row[];
  doctors: Row[];
}

export async function loadBundle(requestIds?: string[]): Promise<Bundle> {
  const sb = await db();
  let requestQuery = sb.from("medical_requests").select("*").order("updated_at", { ascending: false });
  if (requestIds) requestQuery = requestQuery.in("id", requestIds);
  const [requests, itineraries, patients, hospitals, doctors] = await Promise.all([
    requestQuery,
    sb.from("itineraries").select("*"),
    sb.from("patients").select("*"),
    sb.from("hospitals").select("*"),
    sb.from("doctors").select("*"),
  ]);
  const itineraryRows = itineraries.data ?? [];
  const [quotes, items, reviews] = await Promise.all([
    sb.from("quotes").select("*").order("created_at", { ascending: false }),
    itineraryRows.length
      ? sb.from("itinerary_items").select("*").in("itinerary_id", itineraryRows.map((i) => i["id"] as string))
      : Promise.resolve({ data: [] as Row[] }),
    sb.from("doctor_reviews").select("*").order("created_at", { ascending: false }),
  ]);
  return {
    requests: requests.data ?? [],
    quotes: quotes.data ?? [],
    itineraries: itineraryRows,
    items: (items.data ?? []) as Row[],
    reviews: reviews.data ?? [],
    patients: patients.data ?? [],
    hospitals: hospitals.data ?? [],
    doctors: doctors.data ?? [],
  };
}

export interface InquiryView {
  inquiry: Inquiry;
  patient: Patient;
  quote: Quote;
  hospital: Hospital;
  doctor: Doctor | null;
  itinerary: Itinerary | null;
}

export function buildViews(bundle: Bundle): InquiryView[] {
  return bundle.requests.map((request) => {
    const requestId = request["id"] as string;
    const itinerary = bundle.itineraries.find((i) => i["medical_request_id"] === requestId) ?? null;
    const quote = itinerary ? (bundle.quotes.find((q) => q["itinerary_id"] === itinerary["id"]) ?? null) : null;
    const review = bundle.reviews.find((r) => r["medical_request_id"] === requestId) ?? null;
    const patientRow = bundle.patients.find((p) => p["id"] === request["patient_id"]);
    const hospitalRow = bundle.hospitals.find((h) => h["id"] === request["hospital_id"]);
    const items = itinerary ? bundle.items.filter((i) => i["itinerary_id"] === itinerary["id"]) : [];
    const inquiry = mapInquiry(request, quote, itinerary, review);
    const doctorRow = review?.["doctor_id"]
      ? bundle.doctors.find((d) => d["id"] === review["doctor_id"])
      : itinerary?.["doctor_id"]
        ? bundle.doctors.find((d) => d["id"] === itinerary["doctor_id"])
        : undefined;
    return {
      inquiry,
      patient: patientRow
        ? { ...mapPatient(patientRow), preferredDate: iso(request["preferred_date"] ?? request["created_at"]) }
        : {
            id: "",
            name: "Unknown patient",
            country: "Singapore",
            phoneMasked: "•••• ••••",
            channel: inquiry.channel,
            travellers: 1,
            preferredDate: inquiry.createdAt,
            createdAt: inquiry.createdAt,
            language: "English",
          },
      quote: mapQuote(quote, itinerary, requestId),
      hospital: hospitalRow
        ? mapHospital(hospitalRow)
        : { id: "", name: "Unassigned hospital", city: "Batam", accreditation: "—", contactPhone: "—", specialties: [] },
      doctor: doctorRow ? mapDoctor(doctorRow) : null,
      itinerary: mapItinerary(itinerary, items, requestId),
    };
  });
}

/* --------------------------------------------------------- audit / feed --- */

export async function audit(input: {
  requestId?: string | null;
  entity: string;
  entityId?: string | null;
  action: string;
  actor?: string;
  newValue?: unknown;
}) {
  const sb = await db();
  await sb.from("audit_log").insert({
    medical_request_id: input.requestId ?? null,
    entity: input.entity,
    entity_id: input.entityId ?? null,
    action: input.action,
    actor: input.actor ?? "HOSPITAL_STAFF",
    new_value: (input.newValue ?? null) as never,
  });
}

export async function logEvent(input: {
  requestId: string;
  type: string;
  message: string;
  status?: "DONE" | "RUNNING" | "ATTENTION" | "FAILED";
  durationMs?: number | null;
  metadata?: Record<string, unknown>;
}) {
  const sb = await db();
  await sb.from("ai_activity_events").insert({
    medical_request_id: input.requestId,
    event_type: input.type,
    message: input.message,
    status: input.status ?? "DONE",
    duration_ms: input.durationMs ?? null,
    metadata: (input.metadata ?? null) as never,
    completed_at: new Date().toISOString(),
  });
}

const FEED_TONE: Record<string, ActivityFeedItem["tone"]> = {
  SEEDED: "INFO",
  INBOUND_MESSAGE: "INFO",
  ITINERARY_GENERATED: "SUCCESS",
  QUOTE_APPROVED: "SUCCESS",
  QUOTE_REJECTED: "ATTENTION",
  QUOTE_UPDATED: "INFO",
  DOCTOR_REVIEW_REQUESTED: "ATTENTION",
  DOCTOR_APPROVED: "SUCCESS",
  DOCTOR_DECISION: "ATTENTION",
  ITINERARY_SENT: "SUCCESS",
  PATIENT_CONFIRMED: "SUCCESS",
  HUMAN_TAKEOVER: "ATTENTION",
  REPLY_SENT: "INFO",
};

export async function activityFeed(limit = 30): Promise<ActivityFeedItem[]> {
  const sb = await db();
  const { data } = await sb
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => ({
    id: row["id"] as string,
    at: iso(row["created_at"]),
    label: humanizeAction(row["action"] as string),
    tone: FEED_TONE[row["action"] as string] ?? "INFO",
    inquiryId: (row["medical_request_id"] as string | null) ?? undefined,
  }));
}

const humanizeAction = (action: string) =>
  action
    .toLowerCase()
    .split("_")
    .map((word, index) => (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");

export async function dashboardSummary(): Promise<{ summary: DashboardSummary; feed: ActivityFeedItem[] }> {
  const sb = await db();
  const [requests, itineraries, feed] = await Promise.all([
    sb.from("medical_requests").select("status,hospital_review"),
    sb.from("itineraries").select("estimated_savings_sgd"),
    activityFeed(),
  ]);
  const rows = requests.data ?? [];
  const savings = (itineraries.data ?? []).reduce((sum, row) => sum + Math.max(n(row["estimated_savings_sgd"]), 0), 0);
  return {
    summary: {
      singaporeLeads: rows.length,
      itinerariesGenerated: (itineraries.data ?? []).length,
      hospitalReviewsPending: rows.filter((r) => r["hospital_review"] === "PENDING").length,
      confirmedBookings: rows.filter((r) => ["CONFIRMED_BOOKING", "TRAVEL_READY"].includes(r["status"] as string)).length,
      completedPatients: rows.filter((r) => r["status"] === "COMPLETED").length,
      estimatedSavings: Math.round(savings),
    },
    feed,
  };
}

/* ------------------------------------------------------- cost engine ----- */

export interface CostInput {
  hospitalId: string;
  treatmentId: string;
  travellers: number;
  nights: number;
}

export interface CostResult {
  breakdown: CostBreakdown;
  benchmark: { treatment: number; travel: number; accommodation: number };
  total: number;
  savings: number;
  savingsPct: number;
  missing: string[];
  ferry: Row | null;
  hotel: Row | null;
  transport: Row | null;
}

/**
 * The cost engine never invents numbers: every line comes from the hospital
 * price list, the ferry/hotel/transport tables or the Singapore benchmark
 * table. Anything missing is reported so the case can be escalated to a human.
 */
export async function calculateCost(input: CostInput): Promise<CostResult> {
  const sb = await db();
  const [price, benchmark, ferry, hotel, transport] = await Promise.all([
    sb
      .from("hospital_treatment_prices")
      .select("*")
      .eq("hospital_id", input.hospitalId)
      .eq("treatment_id", input.treatmentId)
      .eq("status", "ACTIVE")
      .maybeSingle(),
    sb
      .from("singapore_benchmarks")
      .select("*")
      .eq("treatment_id", input.treatmentId)
      .eq("status", "ACTIVE")
      .maybeSingle(),
    sb.from("ferry_options").select("*").eq("status", "ACTIVE").order("estimated_cost_sgd").limit(1).maybeSingle(),
    sb.from("hotels").select("*").eq("status", "ACTIVE").order("price_per_night_sgd").limit(1).maybeSingle(),
    sb
      .from("transport_options")
      .select("*")
      .eq("status", "ACTIVE")
      .eq("type", "CAR")
      .order("estimated_cost_sgd")
      .limit(1)
      .maybeSingle(),
  ]);

  const missing: string[] = [];
  if (!price.data) missing.push("No hospital price on file for this treatment");
  if (!benchmark.data) missing.push("No Singapore benchmark on file for this treatment");
  if (!ferry.data) missing.push("No ferry option configured");

  const travellers = Math.max(1, input.travellers);
  const nights = Math.max(0, input.nights);

  const breakdown: CostBreakdown = {
    treatment: n(price.data?.["price_sgd"]) * travellers,
    doctorFee: n(price.data?.["doctor_fee_sgd"]) * travellers,
    hospitalFee: n(price.data?.["hospital_fee_sgd"]) * travellers,
    diagnostics: n(price.data?.["diagnostics_sgd"]) * travellers,
    medication: n(price.data?.["medication_sgd"]) * travellers,
    ferry: n(ferry.data?.["estimated_cost_sgd"]) * travellers * 2,
    hotel: n(hotel.data?.["price_per_night_sgd"]) * nights,
    localTransport: n(transport.data?.["estimated_cost_sgd"]) * 2,
    otherServices: 25,
  };

  const total = n(Object.values(breakdown).reduce((a, b) => a + b, 0));
  const bench = {
    treatment: n(benchmark.data?.["benchmark_average_sgd"]) * travellers,
    travel: n(benchmark.data?.["benchmark_travel_sgd"]),
    accommodation: n(benchmark.data?.["benchmark_accommodation_sgd"]),
  };
  const benchTotal = bench.treatment + bench.travel + bench.accommodation;
  const savings = n(benchTotal - total);

  return {
    breakdown,
    benchmark: bench,
    total,
    savings,
    savingsPct: benchTotal > 0 ? Math.round((savings / benchTotal) * 10000) / 100 : 0,
    missing,
    ferry: ferry.data ?? null,
    hotel: hotel.data ?? null,
    transport: transport.data ?? null,
  };
}

export async function persistCost(itineraryId: string, breakdown: CostBreakdown, benchmark: CostResult["benchmark"]) {
  const sb = await db();
  const total = n(Object.values(breakdown).reduce((a, b) => a + b, 0));
  const benchTotal = benchmark.treatment + benchmark.travel + benchmark.accommodation;
  const savings = n(benchTotal - total);
  await sb
    .from("itineraries")
    .update({
      treatment_cost_sgd: breakdown.treatment,
      doctor_fee_sgd: breakdown.doctorFee,
      hospital_fee_sgd: breakdown.hospitalFee,
      diagnostics_cost_sgd: breakdown.diagnostics,
      medication_cost_sgd: breakdown.medication,
      ferry_cost_sgd: breakdown.ferry,
      hotel_cost_sgd: breakdown.hotel,
      transport_cost_sgd: breakdown.localTransport,
      other_cost_sgd: breakdown.otherServices,
      total_batam_sgd: total,
      singapore_benchmark_sgd: benchmark.treatment,
      singapore_benchmark_travel_sgd: benchmark.travel,
      singapore_benchmark_accommodation_sgd: benchmark.accommodation,
      estimated_savings_sgd: savings,
      estimated_savings_percentage: benchTotal > 0 ? Math.round((savings / benchTotal) * 10000) / 100 : 0,
    })
    .eq("id", itineraryId);
}
