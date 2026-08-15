/**
 * REST-equivalent surface for the hospital dashboard and the patient itinerary.
 * These are the only entry points the frontend is allowed to call.
 */
import { createServerFn } from "@tanstack/react-start";

import type {
  AiActivityEvent,
  ActivityFeedItem,
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
  TransportOption,
  Treatment,
} from "./types";

export interface InquiryViewPayload {
  inquiry: Inquiry;
  patient: Patient;
  quote: import("./types").Quote;
  hospital: Hospital;
  doctor: Doctor | null;
  itinerary: Itinerary | null;
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

export interface AnalyticsPayload {
  monthly: { month: string; inquiries: number; confirmed: number }[];
  responseTimes: { week: string; minutes: number }[];
  byTreatment: { name: string; patients: number; batam: number; singapore: number }[];
  funnel: { stage: string; count: number }[];
  conversionRate: number;
  avgSavings: number;
  revenueOpportunity: number;
}

/* --------------------------------------------------------------- reads ---- */

export const getDashboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ summary: DashboardSummary; feed: ActivityFeedItem[] }> => {
    const { dashboardSummary } = await import("./server/hub.server");
    return dashboardSummary();
  },
);

export const getInquiries = createServerFn({ method: "GET" }).handler(
  async (): Promise<InquiryViewPayload[]> => {
    const { loadBundle, buildViews } = await import("./server/hub.server");
    return buildViews(await loadBundle());
  },
);

export const getInquiry = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<InquiryViewPayload> => {
    const { loadBundle, buildViews, HubError } = await import("./server/hub.server");
    const views = buildViews(await loadBundle([data.id]));
    const view = views[0];
    if (!view) throw new HubError("Inquiry not found", 404);
    return view;
  });

export const getPatients = createServerFn({ method: "GET" }).handler(
  async (): Promise<
    { patient: Patient; inquiries: number; lastStatus: Inquiry["status"] | null }[]
  > => {
    const { loadBundle, buildViews, mapPatient } = await import("./server/hub.server");
    const bundle = await loadBundle();
    const views = buildViews(bundle);
    return bundle.patients.map((row) => {
      const patient = mapPatient(row);
      const own = views.filter((v) => v.inquiry.patientId === patient.id);
      return { patient, inquiries: own.length, lastStatus: own[0]?.inquiry.status ?? null };
    });
  },
);

export const getPatient = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(
    async ({
      data,
    }): Promise<{ patient: Patient; inquiries: InquiryViewPayload[]; messages: Message[] }> => {
      const { db, loadBundle, buildViews, mapPatient, mapMessage, HubError } =
        await import("./server/hub.server");
      const sb = await db();
      const { data: row } = await sb.from("patients").select("*").eq("id", data.id).maybeSingle();
      if (!row) throw new HubError("Patient not found", 404);
      const { data: messages } = await sb
        .from("messages")
        .select("*")
        .eq("patient_id", data.id)
        .order("sent_at", { ascending: true });
      const views = buildViews(await loadBundle()).filter((v) => v.inquiry.patientId === data.id);
      return {
        patient: mapPatient(row),
        inquiries: views,
        messages: (messages ?? []).map(mapMessage),
      };
    },
  );

export const getMessages = createServerFn({ method: "GET" })
  .inputValidator((data: { patientId?: string | undefined }) => data)
  .handler(async ({ data }): Promise<Message[]> => {
    const { db, mapMessage } = await import("./server/hub.server");
    const sb = await db();
    let query = sb.from("messages").select("*").order("sent_at", { ascending: true }).limit(500);
    if (data.patientId) query = query.eq("patient_id", data.patientId);
    const { data: rows } = await query;
    return (rows ?? []).map(mapMessage);
  });

export const getAiActivity = createServerFn({ method: "GET" })
  .inputValidator((data: { inquiryId?: string | undefined }) => data)
  .handler(async ({ data }): Promise<AiActivityEvent[]> => {
    const { db, mapEvent } = await import("./server/hub.server");
    const sb = await db();
    let query = sb
      .from("ai_activity_events")
      .select("*")
      .order("started_at", { ascending: true })
      .limit(500);
    if (data.inquiryId) query = query.eq("medical_request_id", data.inquiryId);
    const { data: rows } = await query;
    return (rows ?? []).map(mapEvent);
  });

export const getItinerary = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<Itinerary> => {
    const { db, mapItinerary, HubError } = await import("./server/hub.server");
    const sb = await db();
    const { data: row } = await sb.from("itineraries").select("*").eq("id", data.id).maybeSingle();
    if (!row) throw new HubError("Itinerary not found", 404);
    const { data: items } = await sb
      .from("itinerary_items")
      .select("*")
      .eq("itinerary_id", data.id);
    const mapped = mapItinerary(row, items ?? [], row["medical_request_id"] as string);
    if (!mapped) throw new HubError("Itinerary not found", 404);
    return mapped;
  });

export const getReference = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    hospitals: Hospital[];
    doctors: Doctor[];
    hotels: Hotel[];
    transport: TransportOption[];
    treatments: Treatment[];
  }> => {
    const { db, mapHospital, mapDoctor, mapHotel, mapTransport } =
      await import("./server/hub.server");
    const sb = await db();
    const [hospitals, doctors, hotels, transport, treatments, prices, benchmarks] =
      await Promise.all([
        sb.from("hospitals").select("*").order("name"),
        sb.from("doctors").select("*").order("name"),
        sb.from("hotels").select("*").order("price_per_night_sgd"),
        sb.from("transport_options").select("*").order("estimated_cost_sgd"),
        sb.from("treatments").select("*").eq("active", true).order("name"),
        sb.from("hospital_treatment_prices").select("*").eq("status", "ACTIVE"),
        sb.from("singapore_benchmarks").select("*").eq("status", "ACTIVE"),
      ]);
    return {
      hospitals: (hospitals.data ?? []).map(mapHospital),
      doctors: (doctors.data ?? []).map(mapDoctor),
      hotels: (hotels.data ?? []).map(mapHotel),
      transport: (transport.data ?? []).map(mapTransport),
      treatments: (treatments.data ?? []).map((t) => {
        const treatmentPrices = (prices.data ?? []).filter((p) => p["treatment_id"] === t["id"]);
        const cheapest = treatmentPrices.reduce<number>(
          (min, p) => Math.min(min, Number(p["price_sgd"])),
          Number.POSITIVE_INFINITY,
        );
        const benchmark = (benchmarks.data ?? []).find((b) => b["treatment_id"] === t["id"]);
        return {
          id: t["id"] as string,
          name: t["name"] as string,
          category: t["category"] as string,
          batamPrice: Number.isFinite(cheapest) ? cheapest : 0,
          singaporeBenchmark: Number(benchmark?.["benchmark_average_sgd"] ?? 0),
          stayNights: Number(t["recovery_days"] ?? 1),
          durationMinutes: Number(t["duration_minutes"] ?? 60),
        };
      }),
    };
  },
);

export const getAnalytics = createServerFn({ method: "GET" }).handler(
  async (): Promise<AnalyticsPayload> => {
    const { db } = await import("./server/hub.server");
    const sb = await db();
    const [requests, itineraries, quotes, treatments, prices, benchmarks, events] =
      await Promise.all([
        sb.from("medical_requests").select("id,status,hospital_review,treatment_id,created_at"),
        sb.from("itineraries").select("id,total_batam_sgd,estimated_savings_sgd"),
        sb.from("quotes").select("status,sent_at"),
        sb.from("treatments").select("id,name").eq("active", true),
        sb
          .from("hospital_treatment_prices")
          .select("treatment_id,price_sgd")
          .eq("status", "ACTIVE"),
        sb
          .from("singapore_benchmarks")
          .select("treatment_id,benchmark_average_sgd")
          .eq("status", "ACTIVE"),
        sb.from("ai_activity_events").select("started_at,duration_ms"),
      ]);

    const requestRows = requests.data ?? [];
    const itineraryRows = itineraries.data ?? [];
    const confirmed = requestRows.filter((r) =>
      ["CONFIRMED_BOOKING", "TRAVEL_READY", "COMPLETED"].includes(r["status"] as string),
    ).length;

    const monthKey = (value: string) =>
      new Date(value).toLocaleDateString("en-SG", { month: "short" });
    const months = new Map<string, { month: string; inquiries: number; confirmed: number }>();
    for (const row of requestRows) {
      const key = monthKey(row["created_at"] as string);
      const entry = months.get(key) ?? { month: key, inquiries: 0, confirmed: 0 };
      entry.inquiries += 1;
      if (["CONFIRMED_BOOKING", "TRAVEL_READY", "COMPLETED"].includes(row["status"] as string))
        entry.confirmed += 1;
      months.set(key, entry);
    }

    const weeks = new Map<string, number[]>();
    for (const event of events.data ?? []) {
      if (event["duration_ms"] === null) continue;
      const date = new Date(event["started_at"] as string);
      const week = `W${String(Math.ceil(((date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7))}`;
      weeks.set(week, [...(weeks.get(week) ?? []), Number(event["duration_ms"])]);
    }

    const totals = itineraryRows.map((row) => ({
      packageTotal: Number(row["total_batam_sgd"]),
      savings: Number(row["estimated_savings_sgd"]),
    }));

    return {
      monthly: [...months.values()],
      responseTimes: [...weeks.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([week, values]) => ({
          week,
          minutes:
            Math.round((values.reduce((a, b) => a + b, 0) / values.length / 60000) * 100) / 100,
        })),
      byTreatment: (treatments.data ?? [])
        .map((t) => ({
          name: t["name"] as string,
          patients: requestRows.filter((r) => r["treatment_id"] === t["id"]).length,
          batam: Math.min(
            ...((prices.data ?? [])
              .filter((p) => p["treatment_id"] === t["id"])
              .map((p) => Number(p["price_sgd"])) as number[]),
            Number.POSITIVE_INFINITY,
          ),
          singapore: Number(
            (benchmarks.data ?? []).find((b) => b["treatment_id"] === t["id"])?.[
              "benchmark_average_sgd"
            ] ?? 0,
          ),
        }))
        .map((row) => ({ ...row, batam: Number.isFinite(row.batam) ? row.batam : 0 })),
      funnel: [
        { stage: "Inquiries", count: requestRows.length },
        { stage: "AI itinerary", count: itineraryRows.length },
        {
          stage: "Hospital review",
          count: requestRows.filter((r) => r["hospital_review"] !== null).length,
        },
        {
          stage: "Approved quote",
          count: (quotes.data ?? []).filter(
            (q) => q["status"] === "APPROVED" || q["sent_at"] !== null,
          ).length,
        },
        { stage: "Confirmed", count: confirmed },
      ],
      conversionRate: requestRows.length ? (confirmed / requestRows.length) * 100 : 0,
      avgSavings: totals.length ? totals.reduce((a, b) => a + b.savings, 0) / totals.length : 0,
      revenueOpportunity: totals.reduce((a, b) => a + b.packageTotal, 0),
    };
  },
);

export const getPublicItinerary = createServerFn({ method: "GET" })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }): Promise<PatientItineraryPayload> => {
    const { db, mapItinerary, breakdownOf, HubError } = await import("./server/hub.server");
    const sb = await db();
    const { data: itinerary } = await sb
      .from("itineraries")
      .select("*")
      .eq("public_token", data.token)
      .maybeSingle();
    if (!itinerary) throw new HubError("Itinerary not found", 404);
    if (new Date(itinerary["expires_at"] as string).getTime() < Date.now()) {
      throw new HubError("This itinerary link has expired", 410);
    }
    const [{ data: items }, { data: request }, { data: hospital }] = await Promise.all([
      sb
        .from("itinerary_items")
        .select("*")
        .eq("itinerary_id", itinerary["id"] as string),
      sb
        .from("medical_requests")
        .select("id,ai_request,patient_id")
        .eq("id", itinerary["medical_request_id"] as string)
        .maybeSingle(),
      sb
        .from("hospitals")
        .select("name,contact_phone")
        .eq("id", itinerary["hospital_id"] as string)
        .maybeSingle(),
    ]);
    const { data: patient } = await sb
      .from("patients")
      .select("name")
      .eq("id", (request?.["patient_id"] as string) ?? "")
      .maybeSingle();

    const breakdown = breakdownOf(itinerary);
    const medicalSubtotal =
      breakdown.treatment +
      breakdown.doctorFee +
      breakdown.hospitalFee +
      breakdown.diagnostics +
      breakdown.medication;
    const travelSubtotal =
      breakdown.ferry + breakdown.hotel + breakdown.localTransport + breakdown.otherServices;
    const packageTotal = medicalSubtotal + travelSubtotal;
    const benchmark =
      Number(itinerary["singapore_benchmark_sgd"]) +
      Number(itinerary["singapore_benchmark_travel_sgd"]) +
      Number(itinerary["singapore_benchmark_accommodation_sgd"]);
    const mapped = mapItinerary(itinerary, items ?? [], itinerary["medical_request_id"] as string)!;
    const ai = (request?.["ai_request"] ?? {}) as Record<string, unknown>;

    return {
      patientName: (patient?.["name"] as string) ?? "Patient",
      hospitalName: (hospital?.["name"] as string) ?? "Batam hospital",
      hospitalPhone: (hospital?.["contact_phone"] as string) ?? "",
      status: mapped.status,
      treatment: (ai["treatment"] as string) ?? "Medical care",
      steps: mapped.steps,
      cost: {
        benchmark,
        packageTotal,
        savings: benchmark - packageTotal,
        savingsPct: benchmark > 0 ? ((benchmark - packageTotal) / benchmark) * 100 : 0,
        medicalSubtotal,
        travelSubtotal,
        breakdown,
      },
    };
  });

/* -------------------------------------------------------------- writes ---- */

export const inboundMessage = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { name: string; message: string; channel: Channel; externalId?: string | undefined }) =>
      data,
  )
  .handler(async ({ data }): Promise<{ inquiryId: string }> => {
    const { processInbound } = await import("./server/hermes.server");
    return processInbound({
      channel: data.channel,
      message: data.message.slice(0, 2000),
      name: data.name.slice(0, 120),
      externalId: data.externalId,
    });
  });

export const updateQuotePricing = createServerFn({ method: "POST" })
  .inputValidator((data: { itineraryId: string; breakdown: CostBreakdown }) => data)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { db, persistCost, audit, HubError } = await import("./server/hub.server");
    const sb = await db();
    const { data: itinerary } = await sb
      .from("itineraries")
      .select("*")
      .eq("id", data.itineraryId)
      .maybeSingle();
    if (!itinerary) throw new HubError("Itinerary not found", 404);
    await persistCost(data.itineraryId, data.breakdown, {
      treatment: Number(itinerary["singapore_benchmark_sgd"]),
      travel: Number(itinerary["singapore_benchmark_travel_sgd"]),
      accommodation: Number(itinerary["singapore_benchmark_accommodation_sgd"]),
    });
    await sb
      .from("quotes")
      .update({ source: "HOSPITAL_OVERRIDE", created_by: "HOSPITAL_STAFF" } as never)
      .eq("itinerary_id", data.itineraryId);
    await audit({
      requestId: itinerary["medical_request_id"] as string,
      entity: "itineraries",
      entityId: data.itineraryId,
      action: "QUOTE_UPDATED",
      newValue: data.breakdown,
    });
    return { ok: true };
  });

export const quoteAction = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      itineraryId: string;
      action: "SAVE_DRAFT" | "REQUEST_DOCTOR" | "APPROVE" | "REJECT" | "SEND";
      breakdown?: CostBreakdown | undefined;
      origin?: string | undefined;
    }) => data,
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { db, persistCost, audit, logEvent, HubError } = await import("./server/hub.server");
    const { queueOutbound } = await import("./server/hermes.server");
    const sb = await db();
    const { data: itinerary } = await sb
      .from("itineraries")
      .select("*")
      .eq("id", data.itineraryId)
      .maybeSingle();
    if (!itinerary) throw new HubError("Itinerary not found", 404);
    const requestId = itinerary["medical_request_id"] as string;

    if (data.breakdown) {
      await persistCost(data.itineraryId, data.breakdown, {
        treatment: Number(itinerary["singapore_benchmark_sgd"]),
        travel: Number(itinerary["singapore_benchmark_travel_sgd"]),
        accommodation: Number(itinerary["singapore_benchmark_accommodation_sgd"]),
      });
      await sb
        .from("quotes")
        .update({ source: "HOSPITAL_OVERRIDE" } as never)
        .eq("itinerary_id", data.itineraryId);
    }

    if (data.action === "SAVE_DRAFT") {
      await sb
        .from("quotes")
        .update({ status: "DRAFT" } as never)
        .eq("itinerary_id", data.itineraryId);
      await audit({ requestId, entity: "quotes", action: "QUOTE_UPDATED" });
      return { ok: true };
    }

    if (data.action === "REQUEST_DOCTOR") {
      const { data: doctor } = await sb
        .from("doctors")
        .select("id")
        .eq("hospital_id", itinerary["hospital_id"] as string)
        .limit(1)
        .maybeSingle();
      await sb
        .from("quotes")
        .update({ status: "PENDING_REVIEW" } as never)
        .eq("itinerary_id", data.itineraryId);
      await sb.from("doctor_reviews").insert({
        medical_request_id: requestId,
        doctor_id: (doctor?.["id"] as string | undefined) ?? null,
        status: "PENDING",
      } as never);
      await sb
        .from("medical_requests")
        .update({ status: "DOCTOR_REVIEW_REQUIRED" } as never)
        .eq("id", requestId);
      await logEvent({
        requestId,
        type: "DOCTOR_REVIEW_REQUESTED",
        message: "Doctor review requested",
        status: "ATTENTION",
      });
      await audit({ requestId, entity: "doctor_reviews", action: "DOCTOR_REVIEW_REQUESTED" });
      return { ok: true };
    }

    if (data.action === "APPROVE") {
      await sb
        .from("quotes")
        .update({ status: "APPROVED", approved_at: new Date().toISOString() } as never)
        .eq("itinerary_id", data.itineraryId);
      await sb
        .from("itineraries")
        .update({ status: "HOSPITAL_CONFIRMED" } as never)
        .eq("id", data.itineraryId);
      await sb
        .from("itinerary_items")
        .update({ status: "CONFIRMED" } as never)
        .eq("itinerary_id", data.itineraryId);
      await sb
        .from("medical_requests")
        .update({ status: "QUOTE_APPROVED", hospital_review: "APPROVED" } as never)
        .eq("id", requestId);
      await logEvent({
        requestId,
        type: "QUOTE_APPROVED",
        message: "Hospital approved the quote",
        durationMs: 320,
      });
      await audit({ requestId, entity: "quotes", action: "QUOTE_APPROVED" });
      return { ok: true };
    }

    if (data.action === "REJECT") {
      await sb
        .from("quotes")
        .update({ status: "REJECTED" } as never)
        .eq("itinerary_id", data.itineraryId);
      await sb
        .from("medical_requests")
        .update({ hospital_review: "REJECTED" } as never)
        .eq("id", requestId);
      await logEvent({
        requestId,
        type: "QUOTE_REJECTED",
        message: "Hospital rejected the quote",
        status: "ATTENTION",
      });
      await audit({ requestId, entity: "quotes", action: "QUOTE_REJECTED" });
      return { ok: true };
    }

    /* SEND — gated on hospital approval */
    const { data: quote } = await sb
      .from("quotes")
      .select("*")
      .eq("itinerary_id", data.itineraryId)
      .maybeSingle();
    if (quote?.["status"] !== "APPROVED")
      throw new HubError("The hospital must approve the quote before sending", 409);
    await sendToPatient({
      itineraryId: data.itineraryId,
      requestId,
      origin: data.origin,
      sb,
      queueOutbound,
      audit,
      logEvent,
    });
    return { ok: true };
  });

export const approveItinerary = createServerFn({ method: "POST" })
  .inputValidator((data: { itineraryId: string }) => data)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await quoteAction({ data: { itineraryId: data.itineraryId, action: "APPROVE" } });
    return { ok: true };
  });

export const sendItinerary = createServerFn({ method: "POST" })
  .inputValidator((data: { itineraryId: string; origin?: string | undefined }) => data)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await quoteAction({
      data: {
        itineraryId: data.itineraryId,
        action: "SEND",
        ...(data.origin ? { origin: data.origin } : {}),
      },
    });
    return { ok: true };
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendToPatient(ctx: any) {
  const { sb, itineraryId, requestId, origin, queueOutbound, audit, logEvent } = ctx;
  const { data: itinerary } = await sb
    .from("itineraries")
    .select("*")
    .eq("id", itineraryId)
    .maybeSingle();
  const { data: request } = await sb
    .from("medical_requests")
    .select("patient_id,channel,ai_request")
    .eq("id", requestId)
    .maybeSingle();
  const baseUrl = origin ?? process.env["PUBLIC_APP_URL"] ?? "http://localhost:8080";
  const link = `${String(baseUrl)}/itinerary/${String(itinerary["public_token"])}`;
  const treatment = ((request?.["ai_request"] ?? {}) as Record<string, unknown>)["treatment"] as
    string | undefined;

  await sb
    .from("quotes")
    .update({ status: "APPROVED", sent_at: new Date().toISOString() })
    .eq("itinerary_id", itineraryId);
  await sb.from("itineraries").update({ status: "SENT" }).eq("id", itineraryId);
  await sb
    .from("medical_requests")
    .update({ status: "PATIENT_CONFIRMATION_PENDING" })
    .eq("id", requestId);
  await queueOutbound({
    patientId: request["patient_id"] as string,
    requestId,
    channel: request["channel"] as Channel,
    author: "HOSPITAL",
    text: `Your ${treatment ?? "care"} itinerary in Batam is confirmed by the hospital. Review and confirm your booking here: ${link}`,
  });
  await logEvent({
    requestId,
    type: "ITINERARY_SENT",
    message: "Patient notified with itinerary link",
    durationMs: 260,
  });
  await audit({
    requestId,
    entity: "itineraries",
    entityId: itineraryId,
    action: "ITINERARY_SENT",
  });
}

export const confirmItineraryByToken = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { db, audit, logEvent, HubError } = await import("./server/hub.server");
    const sb = await db();
    const { data: itinerary } = await sb
      .from("itineraries")
      .select("*")
      .eq("public_token", data.token)
      .maybeSingle();
    if (!itinerary) throw new HubError("Itinerary not found", 404);
    if (itinerary["status"] === "DRAFT")
      throw new HubError("This itinerary is not ready for confirmation", 409);
    const requestId = itinerary["medical_request_id"] as string;
    const { data: request } = await sb
      .from("medical_requests")
      .select("patient_id,channel")
      .eq("id", requestId)
      .maybeSingle();

    await sb
      .from("itineraries")
      .update({ status: "PATIENT_CONFIRMED" } as never)
      .eq("id", itinerary["id"] as string);
    await sb
      .from("itinerary_items")
      .update({ status: "CONFIRMED" } as never)
      .eq("itinerary_id", itinerary["id"] as string);
    await sb
      .from("medical_requests")
      .update({ status: "CONFIRMED_BOOKING" } as never)
      .eq("id", requestId);
    if (request) {
      await sb.from("messages").insert({
        patient_id: request["patient_id"] as string,
        medical_request_id: requestId,
        channel: request["channel"] as Channel,
        direction: "INBOUND",
        message_type: "PATIENT",
        raw_text: "I confirm this itinerary. See you in Batam!",
        delivery_status: "DELIVERED",
      } as never);
    }
    await logEvent({
      requestId,
      type: "PATIENT_CONFIRMED",
      message: "Patient confirmed the itinerary",
    });
    await audit({
      requestId,
      entity: "itineraries",
      entityId: itinerary["id"] as string,
      action: "PATIENT_CONFIRMED",
      actor: "PATIENT",
    });
    return { ok: true };
  });

export const humanTakeover = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      inquiryId: string;
      action: "TAKE_OVER" | "ASSIGN" | "RETURN_TO_AI" | "CLOSE";
      staff?: string | undefined;
    }) => data,
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { db, audit, logEvent } = await import("./server/hub.server");
    const sb = await db();
    if (data.action === "TAKE_OVER") {
      await sb
        .from("medical_requests")
        .update({
          human_takeover: true,
          status: "HUMAN_TAKEOVER",
          takeover_staff: data.staff ?? "Coordinator",
          takeover_opened_at: new Date().toISOString(),
        } as never)
        .eq("id", data.inquiryId);
      await logEvent({
        requestId: data.inquiryId,
        type: "HUMAN_TAKEOVER",
        message: "Human takeover started",
        status: "ATTENTION",
      });
    } else if (data.action === "ASSIGN") {
      await sb
        .from("medical_requests")
        .update({ human_takeover: true, takeover_staff: data.staff ?? "Coordinator" } as never)
        .eq("id", data.inquiryId);
    } else if (data.action === "RETURN_TO_AI") {
      await sb
        .from("medical_requests")
        .update({
          human_takeover: false,
          takeover_reasons: [],
          takeover_staff: null,
          takeover_opened_at: null,
          status: "AI_ITINERARY_READY",
        } as never)
        .eq("id", data.inquiryId);
    } else {
      await sb
        .from("medical_requests")
        .update({ human_takeover: false, status: "COMPLETED" } as never)
        .eq("id", data.inquiryId);
    }
    await audit({
      requestId: data.inquiryId,
      entity: "medical_requests",
      entityId: data.inquiryId,
      action: data.action,
    });
    return { ok: true };
  });

export const doctorReview = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      doctorId: string;
      inquiryId: string;
      action: "APPROVE" | "MODIFY" | "REQUEST_INFO" | "REFER" | "REJECT";
      note?: string | undefined;
      proposedTreatment?: string | undefined;
      appointmentAt?: string | undefined;
      estimatedDurationMinutes?: number | undefined;
    }) => data,
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { db, audit, logEvent } = await import("./server/hub.server");
    const sb = await db();
    const status =
      data.action === "APPROVE"
        ? "APPROVED"
        : data.action === "REJECT"
          ? "REJECTED"
          : data.action === "MODIFY"
            ? "MODIFIED"
            : "MORE_INFORMATION_REQUIRED";

    await sb.from("doctor_reviews").insert({
      medical_request_id: data.inquiryId,
      doctor_id: data.doctorId,
      status,
      proposed_treatment: data.proposedTreatment ?? null,
      estimated_duration_minutes: data.estimatedDurationMinutes ?? null,
      appointment_at: data.appointmentAt ?? null,
      comments: data.note ?? null,
      reviewed_at: new Date().toISOString(),
    } as never);

    if (data.action === "APPROVE") {
      await sb
        .from("medical_requests")
        .update({ status: "HOSPITAL_REVIEW_REQUIRED", hospital_review: "PENDING" } as never)
        .eq("id", data.inquiryId);
      await logEvent({
        requestId: data.inquiryId,
        type: "DOCTOR_APPROVED",
        message: "Doctor approved the treatment plan",
        durationMs: 500,
      });
      await audit({
        requestId: data.inquiryId,
        entity: "doctor_reviews",
        action: "DOCTOR_APPROVED",
        actor: "DOCTOR",
      });
    } else {
      await logEvent({
        requestId: data.inquiryId,
        type: "DOCTOR_DECISION",
        message: `Doctor decision: ${status.replace(/_/g, " ").toLowerCase()}`,
        status: "ATTENTION",
      });
      await audit({
        requestId: data.inquiryId,
        entity: "doctor_reviews",
        action: "DOCTOR_DECISION",
        actor: "DOCTOR",
      });
    }
    return { ok: true };
  });

export const sendStaffMessage = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { patientId: string; inquiryId: string; channel: Channel; text: string }) => data,
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { audit, HubError } = await import("./server/hub.server");
    const { queueOutbound } = await import("./server/hermes.server");
    const text = data.text.trim();
    if (!text) throw new HubError("Message cannot be empty", 400);
    await queueOutbound({
      patientId: data.patientId,
      requestId: data.inquiryId || null,
      channel: data.channel,
      author: "HOSPITAL",
      text: text.slice(0, 2000),
    });
    await audit({ requestId: data.inquiryId || null, entity: "messages", action: "REPLY_SENT" });
    return { ok: true };
  });

/* --------------------------------------------------- website chat channel -- */

export type WebChatPayload = import("./server/webchat.server").ChatSessionPayload;
export type WebChatSelections = import("./server/webchat.server").ChatSelections;

export const webChatSession = createServerFn({ method: "POST" })
  .inputValidator((data: { token?: string | undefined }) => data)
  .handler(async ({ data }): Promise<WebChatPayload> => {
    const { getSession } = await import("./server/webchat.server");
    return getSession(data.token ?? null);
  });

export const webChatMessage = createServerFn({ method: "POST" })
  .inputValidator((data: { token?: string | undefined; text: string }) => data)
  .handler(async ({ data }): Promise<WebChatPayload> => {
    const { handleVisitorMessage } = await import("./server/webchat.server");
    return handleVisitorMessage(data.token ?? null, data.text.slice(0, 1000));
  });

export const webChatSelect = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; patch: Partial<WebChatSelections> }) => data)
  .handler(async ({ data }): Promise<WebChatPayload> => {
    const { updateSelections } = await import("./server/webchat.server");
    return updateSelections(data.token, data.patch);
  });

export const webChatBook = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; name: string; phone?: string | undefined }) => data)
  .handler(async ({ data }): Promise<WebChatPayload> => {
    const { bookFromChat } = await import("./server/webchat.server");
    return bookFromChat(data.token, { name: data.name.slice(0, 120), phone: data.phone });
  });
