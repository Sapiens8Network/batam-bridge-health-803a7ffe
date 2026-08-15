/**
 * Website chat channel (patient-facing self-service).
 *
 * The visitor chats on the site instead of WhatsApp/Telegram. The AI agent only
 * extracts structured slots and writes the next question — it never prices
 * anything. All money, hospitals, hotels and ferries come from the database,
 * exactly like the messaging pipeline. The visitor can toggle or swap each
 * recommended line item before booking.
 */
import { audit, db, HubError, logEvent, persistCost } from "./hub.server";
import type { CostBreakdown } from "../types";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-5.6-sol";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const n = (v: unknown) => Math.round(Number(v ?? 0) * 100) / 100;

export interface ChatSlots {
  treatment: string | null;
  treatmentId: string | null;
  date: string | null;
  patients: number | null;
  companions: number | null;
  travellers: number | null;
  nights: number | null;
  notes: string | null;
}

export interface ChatSelections {
  hospitalId: string | null;
  treatmentId: string | null;
  ferryId: string | null;
  hotelId: string | null;
  transportId: string | null;
  includeConcierge: boolean;
  patients: number;
  companions: number;
  travellers: number;
  nights: number;
  date: string | null;
}

export interface ChatTurn {
  role: "USER" | "AGENT";
  text: string;
  at: string;
}

export interface OptionSummary {
  id: string;
  name: string;
  detail: string;
  price: number;
}

export interface ChatPlan {
  treatment: { id: string; name: string; category: string };
  hospital: { id: string; name: string; location: string; accreditation: string };
  breakdown: CostBreakdown;
  total: number;
  benchmarkTotal: number;
  savings: number;
  savingsPct: number;
  lines: {
    key: string;
    label: string;
    detail: string;
    price: number;
    optional: boolean;
    selected: boolean;
  }[];
  options: {
    hospitals: OptionSummary[];
    treatments: OptionSummary[];
    ferries: OptionSummary[];
    hotels: OptionSummary[];
    transports: OptionSummary[];
  };
  missing: string[];
}

export interface ChatSessionPayload {
  token: string;
  stage: "COLLECTING" | "PLAN_READY" | "BOOKED";
  transcript: ChatTurn[];
  slots: ChatSlots;
  selections: ChatSelections;
  plan: ChatPlan | null;
  booking: { reference: string; itineraryToken: string } | null;
}

const emptySlots: ChatSlots = {
  treatment: null,
  treatmentId: null,
  date: null,
  patients: null,
  companions: null,
  travellers: null,
  nights: null,
  notes: null,
};

const GREETING =
  "Hi! I'm the MedBridge Pass care assistant. Tell me what treatment you're looking for in Batam — for example \"I want dental implants\" — and I'll put a full trip plan together for you.";

/* --------------------------------------------------------------- session -- */

async function loadSession(token?: string | null): Promise<Row> {
  const sb = await db();
  if (token) {
    const { data } = await sb
      .from("web_chat_sessions")
      .select("*")
      .eq("token", token)
      .maybeSingle();
    if (data) return data;
  }
  const { data, error } = await sb
    .from("web_chat_sessions")
    .insert({
      transcript: [{ role: "AGENT", text: GREETING, at: new Date().toISOString() }],
      slots: emptySlots,
      selections: {},
    } as never)
    .select("*")
    .single();
  if (error) throw new HubError(error.message, 500);
  return data;
}

function slotsOf(row: Row): ChatSlots {
  return { ...emptySlots, ...((row["slots"] as Partial<ChatSlots>) ?? {}) };
}

function transcriptOf(row: Row): ChatTurn[] {
  return (row["transcript"] as ChatTurn[]) ?? [];
}

function selectionsOf(row: Row, slots: ChatSlots): ChatSelections {
  const raw = (row["selections"] as Partial<ChatSelections>) ?? {};
  const legacyTravellers = raw.travellers ?? slots.travellers ?? 1;
  const patients = Math.max(1, raw.patients ?? slots.patients ?? 1);
  const companions = Math.max(
    0,
    raw.companions ?? slots.companions ?? Math.max(0, legacyTravellers - patients),
  );
  return {
    hospitalId: raw.hospitalId ?? null,
    treatmentId: raw.treatmentId ?? slots.treatmentId,
    ferryId: raw.ferryId ?? null,
    hotelId: raw.hotelId ?? null,
    transportId: raw.transportId ?? null,
    includeConcierge: raw.includeConcierge ?? true,
    patients,
    companions,
    travellers: patients + companions,
    nights: raw.nights ?? slots.nights ?? 1,
    date: raw.date ?? slots.date ?? null,
  };
}

/* ------------------------------------------------------------ extraction -- */

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "treatment", "date", "patients", "companions", "nights", "notes"],
  properties: {
    reply: { type: "string" },
    treatment: { type: ["string", "null"] },
    date: { type: ["string", "null"] },
    patients: { type: ["number", "null"] },
    companions: { type: ["number", "null"] },
    nights: { type: ["number", "null"] },
    notes: { type: ["string", "null"] },
  },
} as const;

interface Extraction {
  reply: string;
  treatment: string | null;
  date: string | null;
  patients: number | null;
  companions: number | null;
  nights: number | null;
  notes: string | null;
}

async function extract(
  catalogue: string[],
  slots: ChatSlots,
  transcript: ChatTurn[],
  message: string,
): Promise<Extraction | null> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return null;

  const instructions = [
    "You are the MedBridge Pass website care assistant for Singapore patients travelling to Batam, Indonesia.",
    "Your ONLY job is to collect booking variables and write one short friendly reply (max 2 sentences).",
    "Never quote prices, never give clinical advice, never promise availability — the system prices the trip from the hospital database.",
    `Match "treatment" EXACTLY to one of: ${catalogue.join(" | ")}. Use null when unsure.`,
    "date = ISO yyyy-mm-dd when the patient names a date, otherwise null. nights = hotel nights in Batam (0 for day trip).",
    "patients = how many people actually receive the treatment (minimum 1). companions = how many accompanying people travel along without treatment (0 when travelling alone). Never merge the two numbers.",
    "Ask for exactly one missing variable at a time, in this order: treatment, date, patients, companions, nights.",
    `Already collected: ${JSON.stringify(slots)}. When everything is collected, confirm briefly that the plan is ready below.`,
  ].join(" ");

  const history = transcript
    .slice(-8)
    .map((t) => `${t.role === "USER" ? "Patient" : "Assistant"}: ${t.text}`)
    .join("\n");

  try {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: MODEL,
        instructions,
        input: [
          {
            role: "user",
            content: [{ type: "input_text", text: `${history}\nPatient: ${message}` }],
          },
        ],
        store: false,
        text: { format: { type: "json_schema", name: "chat_slots", strict: true, schema: SCHEMA } },
      }),
    });
    if (!res.ok) {
      console.error("Web chat gateway error", res.status, await res.text().catch(() => ""));
      return null;
    }
    const body = (await res.json()) as {
      output_text?: string;
      output?: { content?: { type?: string; text?: string }[] }[];
    };
    const text =
      body.output_text ??
      body.output?.flatMap((o) => o.content ?? []).find((c) => typeof c.text === "string")?.text ??
      "";
    if (!text.trim()) return null;
    return JSON.parse(text) as Extraction;
  } catch (error) {
    console.error("Web chat extraction failed", error);
    return null;
  }
}

/** Deterministic fallback so the chat keeps working without the model. */
function fallback(catalogue: Row[], slots: ChatSlots, message: string): Extraction {
  const lower = message.toLowerCase();
  const match =
    catalogue.find((t) => lower.includes(String(t["name"]).toLowerCase())) ??
    catalogue.find((t) =>
      ((t["keywords"] as string[]) ?? []).some((k) => lower.includes(k.toLowerCase())),
    ) ??
    null;

  const dateMatch = /(\d{4}-\d{2}-\d{2})/.exec(message);
  const patientMatch = /(\d+)\s*(patient|patients|treatment for)/.exec(lower);
  const companionMatch =
    /(\d+)\s*(companion|companions|family member|family members|friend|friends|accompany|accompanying|coming with)/.exec(
      lower,
    );
  const nightsMatch = /(\d+)\s*(night|nights)/.exec(lower);
  const dayTrip = /day trip|same day|no hotel/.test(lower);
  const alone = /just me|only me|by myself|alone|no one|nobody|none/.test(lower);
  const bareNumber = /^\s*(\d{1,2})\s*$/.exec(lower);

  const next: Extraction = {
    reply: "",
    treatment: match ? (match["name"] as string) : null,
    date: dateMatch?.[1] ?? null,
    patients: patientMatch
      ? Number(patientMatch[1])
      : slots.patients === null && bareNumber
        ? Number(bareNumber[1])
        : slots.patients === null && alone
          ? 1
          : null,
    companions: companionMatch
      ? Number(companionMatch[1])
      : slots.patients !== null && slots.companions === null && bareNumber
        ? Number(bareNumber[1])
        : slots.patients !== null && slots.companions === null && alone
          ? 0
          : null,
    nights: nightsMatch ? Number(nightsMatch[1]) : dayTrip ? 0 : null,
    notes: null,
  };

  const treatment = next.treatment ?? slots.treatment;
  const date = next.date ?? slots.date;
  const patients = next.patients ?? slots.patients;
  const companions = next.companions ?? slots.companions;
  const nights = next.nights ?? slots.nights;

  if (!treatment)
    next.reply =
      "Which treatment are you looking for? For example dental implants, LASIK or a health screening.";
  else if (!date)
    next.reply = `Great — ${treatment} in Batam. Which date would you like to travel? (e.g. 2026-09-12)`;
  else if (patients === null)
    next.reply = "How many patients will be treated? (just you, or more people receiving treatment)";
  else if (companions === null)
    next.reply =
      "How many companions are coming along without treatment? Say 0 if nobody is joining.";
  else if (nights === null)
    next.reply =
      "Would you like to stay overnight in Batam? Tell me how many nights, or say day trip.";
  else
    next.reply =
      "Perfect — your trip plan is ready below. Untick anything you don't need, or swap the hotel and ferry.";

  return next;
}

/* ------------------------------------------------------------- pricing ---- */

async function buildPlan(selections: ChatSelections): Promise<ChatPlan | null> {
  const sb = await db();
  const [treatments, hospitals, prices, benchmarks, ferries, hotels, transports] =
    await Promise.all([
      sb.from("treatments").select("*").eq("active", true).order("name"),
      sb.from("hospitals").select("*").eq("status", "ACTIVE").order("name"),
      sb.from("hospital_treatment_prices").select("*").eq("status", "ACTIVE"),
      sb.from("singapore_benchmarks").select("*").eq("status", "ACTIVE"),
      sb.from("ferry_options").select("*").eq("status", "ACTIVE").order("estimated_cost_sgd"),
      sb.from("hotels").select("*").eq("status", "ACTIVE").order("price_per_night_sgd"),
      sb.from("transport_options").select("*").eq("status", "ACTIVE").order("estimated_cost_sgd"),
    ]);

  const treatmentRows = treatments.data ?? [];
  const treatment = treatmentRows.find((t) => t["id"] === selections.treatmentId);
  if (!treatment) return null;

  const priceRows = (prices.data ?? []).filter((p) => p["treatment_id"] === treatment["id"]);
  const hospitalRows = (hospitals.data ?? []).filter((h) =>
    priceRows.some((p) => p["hospital_id"] === h["id"]),
  );
  const hospital = hospitalRows.find((h) => h["id"] === selections.hospitalId) ?? hospitalRows[0];

  const missing: string[] = [];
  if (!hospital) missing.push("No Batam hospital currently lists a price for this treatment");

  const price = hospital ? priceRows.find((p) => p["hospital_id"] === hospital["id"]) : undefined;
  const benchmark = (benchmarks.data ?? []).find((b) => b["treatment_id"] === treatment["id"]);
  if (!benchmark) missing.push("No Singapore benchmark on file for this treatment");

  const ferryRows = ferries.data ?? [];
  const hotelRows = hotels.data ?? [];
  const transportRows = (transports.data ?? []).filter((t) => t["type"] === "CAR");

  const ferry = selections.ferryId
    ? ferryRows.find((f) => f["id"] === selections.ferryId)
    : ferryRows[0];
  const hotel =
    selections.nights > 0
      ? selections.hotelId
        ? hotelRows.find((h) => h["id"] === selections.hotelId)
        : hotelRows[0]
      : undefined;
  const transport = selections.transportId
    ? transportRows.find((t) => t["id"] === selections.transportId)
    : transportRows[0];

  const patients = Math.max(1, selections.patients);
  const companions = Math.max(0, selections.companions);
  const travellers = patients + companions;
  const nights = Math.max(0, selections.nights);
  const ferryIncluded = selections.ferryId !== "NONE" && !!ferry;
  const hotelIncluded = nights > 0 && selections.hotelId !== "NONE" && !!hotel;
  const transportIncluded = selections.transportId !== "NONE" && !!transport;

  const breakdown: CostBreakdown = {
    treatment: n(price?.["price_sgd"]) * patients,
    doctorFee: n(price?.["doctor_fee_sgd"]) * patients,
    hospitalFee: n(price?.["hospital_fee_sgd"]) * patients,
    diagnostics: n(price?.["diagnostics_sgd"]) * patients,
    medication: n(price?.["medication_sgd"]) * patients,
    ferry: ferryIncluded ? n(ferry?.["estimated_cost_sgd"]) * travellers * 2 : 0,
    hotel: hotelIncluded ? n(hotel?.["price_per_night_sgd"]) * nights : 0,
    localTransport: transportIncluded ? n(transport?.["estimated_cost_sgd"]) * 2 : 0,
    otherServices: selections.includeConcierge ? 25 : 0,
  };

  const total = n(Object.values(breakdown).reduce((a, b) => a + b, 0));
  const benchTreatment = n(benchmark?.["benchmark_average_sgd"]) * patients;
  const benchTotal = n(
    benchTreatment +
      n(benchmark?.["benchmark_travel_sgd"]) +
      n(benchmark?.["benchmark_accommodation_sgd"]),
  );
  const savings = n(benchTotal - total);

  const option = (row: Row | undefined, detail: string, price_: number): OptionSummary | null =>
    row
      ? {
          id: row["id"] as string,
          name: (row["name"] as string) ?? "Option",
          detail,
          price: price_,
        }
      : null;

  return {
    treatment: {
      id: treatment["id"] as string,
      name: treatment["name"] as string,
      category: treatment["category"] as string,
    },
    hospital: {
      id: (hospital?.["id"] as string) ?? "",
      name: (hospital?.["name"] as string) ?? "Pending hospital match",
      location: (hospital?.["location"] as string) ?? "Batam",
      accreditation: (hospital?.["accreditation"] as string) ?? "",
    },
    breakdown,
    total,
    benchmarkTotal: benchTotal,
    savings,
    savingsPct: benchTotal > 0 ? Math.round((savings / benchTotal) * 10000) / 100 : 0,
    lines: (() => {
      const medicalTotal = n(
        breakdown.treatment +
          breakdown.doctorFee +
          breakdown.hospitalFee +
          breakdown.diagnostics +
          breakdown.medication,
      );
      const perPatient = n(medicalTotal / patients);
      const money = (v: number) =>
        `$${v.toLocaleString("en-SG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
      return [
        {
          key: "treatment",
          label: `${treatment["name"] as string} at ${(hospital?.["name"] as string) ?? "Batam hospital"}`,
          detail: `${money(perPatient)} per patient (treatment, doctor, hospital, diagnostics, medication) × ${patients} patient(s) — companions are not charged`,
          price: medicalTotal,
          optional: false,
          selected: true,
        },
        {
          key: "ferry",
          label: ferry
            ? `Return ferry · ${String(ferry["operator_name"] ?? "Scheduled ferry")}`
            : "Return ferry",
          detail: ferry
            ? `${String(ferry["origin_terminal"])} → ${String(ferry["destination_terminal"])} · ${money(n(ferry["estimated_cost_sgd"]))}/way × ${travellers} traveller(s) (${patients} patient(s) + ${companions} companion(s)) × 2 ways`
            : "No ferry configured",
          price: breakdown.ferry,
          optional: true,
          selected: ferryIncluded,
        },
        {
          key: "hotel",
          label: hotel ? `Recovery hotel · ${String(hotel["name"])}` : "Recovery hotel",
          detail:
            nights > 0 && hotel
              ? `${money(n(hotel["price_per_night_sgd"]))}/night × ${nights} night(s) · 1 room · ${String(hotel["location"])}`
              : nights > 0
                ? `${nights} night(s)`
                : "Day trip — no stay",
          price: breakdown.hotel,
          optional: true,
          selected: hotelIncluded,
        },
        {
          key: "transport",
          label: transport
            ? `Private transfers · ${String(transport["name"] ?? transport["type"])}`
            : "Private transfers",
          detail: transport
            ? `${String(transport["origin"])} → ${String(transport["destination"])} · ${money(n(transport["estimated_cost_sgd"]))} × 2 ways`
            : "No transfer configured",
          price: breakdown.localTransport,
          optional: true,
          selected: transportIncluded,
        },
        {
          key: "concierge",
          label: "Care coordinator & translation",
          detail: "English/Mandarin coordinator on the day of treatment",
          price: breakdown.otherServices,
          optional: true,
          selected: selections.includeConcierge,
        },
      ];
    })(),

    options: {
      hospitals: hospitalRows
        .map((h) => {
          const p = priceRows.find((r) => r["hospital_id"] === h["id"]);
          return option(h, (h["location"] as string) ?? "Batam", n(p?.["price_sgd"]));
        })
        .filter((o): o is OptionSummary => !!o),
      treatments: treatmentRows
        .filter((t) => priceRows.length === 0 || true)
        .map((t) => option(t, t["category"] as string, 0))
        .filter((o): o is OptionSummary => !!o),
      ferries: ferryRows
        .map((f) => ({
          id: f["id"] as string,
          name: (f["operator_name"] as string) ?? "Ferry",
          detail: `${String(f["origin_terminal"])} → ${String(f["destination_terminal"])} · ${String(f["estimated_duration_minutes"] ?? 0)} min`,
          price: n(f["estimated_cost_sgd"]),
        }))
        .filter((o) => !!o.id),
      hotels: hotelRows.map((h) => ({
        id: h["id"] as string,
        name: h["name"] as string,
        detail: `${String(h["location"])} · ${String(h["distance_to_hospital_km"] ?? 0)}km from hospital`,
        price: n(h["price_per_night_sgd"]),
      })),
      transports: transportRows.map((t) => ({
        id: t["id"] as string,
        name: (t["name"] as string) ?? (t["type"] as string),
        detail: `${String(t["origin"])} → ${String(t["destination"])}`,
        price: n(t["estimated_cost_sgd"]),
      })),
    },
    missing,
  };
}

function toPayload(row: Row, plan: ChatPlan | null): ChatSessionPayload {
  const slots = slotsOf(row);
  const booking = row["booking"] as { reference: string; itineraryToken: string } | undefined;
  return {
    token: row["token"] as string,
    stage: (row["stage"] as ChatSessionPayload["stage"]) ?? "COLLECTING",
    transcript: transcriptOf(row),
    slots,
    selections: selectionsOf(row, slots),
    plan,
    booking: booking ?? null,
  };
}

async function planFor(row: Row): Promise<ChatPlan | null> {
  const slots = slotsOf(row);
  if (!slots.treatmentId || !slots.date || slots.travellers === null || slots.nights === null)
    return null;
  return buildPlan(selectionsOf(row, slots));
}

/* --------------------------------------------------------------- actions -- */

export async function getSession(token?: string | null): Promise<ChatSessionPayload> {
  const sb = await db();
  const row = await loadSession(token);
  const payload = toPayload(row, await planFor(row));
  if (payload.stage === "BOOKED" && !payload.booking) {
    const requestId = row["medical_request_id"] as string | null;
    const itineraryId = row["itinerary_id"] as string | null;
    if (requestId && itineraryId) {
      const [req, itin] = await Promise.all([
        sb.from("medical_requests").select("reference").eq("id", requestId).maybeSingle(),
        sb.from("itineraries").select("public_token").eq("id", itineraryId).maybeSingle(),
      ]);
      payload.booking = {
        reference: (req.data?.["reference"] as string) ?? "",
        itineraryToken: (itin.data?.["public_token"] as string) ?? "",
      };
    }
  }
  return payload;
}

export async function handleVisitorMessage(
  token: string | null,
  text: string,
): Promise<ChatSessionPayload> {
  if (!text.trim()) throw new HubError("Empty message", 400);
  const sb = await db();
  const row = await loadSession(token);
  if ((row["stage"] as string) === "BOOKED") return toPayload(row, await planFor(row));

  const { data: treatmentRows } = await sb.from("treatments").select("*").eq("active", true);
  const catalogue = treatmentRows ?? [];
  const slots = slotsOf(row);

  const ai = await extract(
    catalogue.map((t) => t["name"] as string),
    slots,
    transcriptOf(row),
    text,
  );
  const guess = fallback(catalogue, slots, text);
  const mergedPatients = ai?.patients ?? guess.patients ?? slots.patients;
  const mergedCompanions = ai?.companions ?? guess.companions ?? slots.companions;
  const merged: ChatSlots = {
    treatment: ai?.treatment ?? guess.treatment ?? slots.treatment,
    treatmentId: slots.treatmentId,
    date: ai?.date ?? guess.date ?? slots.date,
    patients: mergedPatients,
    companions: mergedCompanions,
    travellers:
      mergedPatients !== null && mergedCompanions !== null
        ? mergedPatients + mergedCompanions
        : slots.travellers,
    nights: ai?.nights ?? guess.nights ?? slots.nights,
    notes: ai?.notes ?? slots.notes,
  };
  const matchedTreatment = merged.treatment
    ? catalogue.find((t) => String(t["name"]).toLowerCase() === merged.treatment!.toLowerCase())
    : undefined;
  merged.treatmentId = (matchedTreatment?.["id"] as string | undefined) ?? merged.treatmentId;
  if (matchedTreatment) merged.treatment = matchedTreatment["name"] as string;

  const complete =
    !!merged.treatmentId &&
    !!merged.date &&
    merged.patients !== null &&
    merged.companions !== null &&
    merged.nights !== null;
  const reply = complete
    ? (ai?.reply ??
      "Perfect — your trip plan is ready below. Untick anything you don't need, or swap the hotel and ferry.")
    : (ai?.reply ?? fallback(catalogue, merged, "").reply);

  const now = new Date().toISOString();
  const transcript: ChatTurn[] = [
    ...transcriptOf(row),
    { role: "USER", text, at: now },
    { role: "AGENT", text: reply, at: now },
  ];

  const patients = Math.max(1, merged.patients ?? 1);
  const companions = Math.max(0, merged.companions ?? 0);
  const selections: ChatSelections = {
    ...selectionsOf(row, merged),
    treatmentId: merged.treatmentId,
    patients,
    companions,
    travellers: patients + companions,
    nights: merged.nights ?? 0,
    date: merged.date,
  };

  const { data: updated, error } = await sb
    .from("web_chat_sessions")
    .update({
      transcript,
      slots: merged,
      selections,
      stage: complete ? "PLAN_READY" : "COLLECTING",
    } as never)
    .eq("id", row["id"])
    .select("*")
    .single();
  if (error) throw new HubError(error.message, 500);
  return toPayload(updated, await planFor(updated));
}

export async function updateSelections(
  token: string,
  patch: Partial<ChatSelections>,
): Promise<ChatSessionPayload> {
  const sb = await db();
  const row = await loadSession(token);
  if ((row["stage"] as string) === "BOOKED") return toPayload(row, await planFor(row));
  const slots = slotsOf(row);
  const next: ChatSelections = { ...selectionsOf(row, slots), ...patch };
  const nextSlots: ChatSlots = {
    ...slots,
    treatmentId: next.treatmentId,
    travellers: next.travellers,
    nights: next.nights,
    date: next.date,
  };
  const { data: updated, error } = await sb
    .from("web_chat_sessions")
    .update({ selections: next, slots: nextSlots } as never)
    .eq("id", row["id"])
    .select("*")
    .single();
  if (error) throw new HubError(error.message, 500);
  return toPayload(updated, await planFor(updated));
}

export async function bookFromChat(
  token: string,
  visitor: { name: string; phone?: string | undefined },
): Promise<ChatSessionPayload> {
  const sb = await db();
  const row = await loadSession(token);
  if ((row["stage"] as string) === "BOOKED") return toPayload(row, await planFor(row));

  const slots = slotsOf(row);
  const selections = selectionsOf(row, slots);
  const plan = await planFor(row);
  if (!plan) throw new HubError("Trip details are incomplete", 400);
  if (!plan.hospital.id) throw new HubError("No hospital available for this treatment", 409);

  /* patient */
  let patientId = row["patient_id"] as string | null;
  if (!patientId) {
    const { data, error } = await sb
      .from("patients")
      .insert({
        name: visitor.name || "Website visitor",
        preferred_channel: "WEB",
        country: "SINGAPORE",
        ...(visitor.phone ? { phone: visitor.phone } : {}),
      } as never)
      .select("id")
      .single();
    if (error) throw new HubError(error.message, 500);
    patientId = data["id"] as string;
  }

  const summary = `${plan.treatment.name} in Batam on ${selections.date ?? "TBC"} for ${selections.travellers} traveller(s), ${selections.nights} night(s).`;

  const { data: requestRow, error: requestError } = await sb
    .from("medical_requests")
    .insert({
      patient_id: patientId,
      hospital_id: plan.hospital.id,
      treatment_id: plan.treatment.id,
      original_message:
        transcriptOf(row)
          .filter((t) => t.role === "USER")
          .map((t) => t.text)
          .join(" | ") || summary,
      channel: "WEB",
      status: "HOSPITAL_REVIEW_REQUIRED",
      hospital_review: "PENDING",
      intent: "MEDICAL_TOURISM",
      ai_confidence: 0.95,
      traveller_count: selections.travellers,
      preferred_nights: selections.nights,
      priority: "NORMAL",
      ...(selections.date ? { preferred_date: selections.date } : {}),
      ai_request: {
        treatment: plan.treatment.name,
        treatmentCategory: plan.treatment.category,
        requirements: [],
        specialRequirements: slots.notes ? [slots.notes] : [],
        summary,
      },
    } as never)
    .select("*")
    .single();
  if (requestError) throw new HubError(requestError.message, 500);
  const requestId = requestRow["id"] as string;

  await sb.from("messages").insert(
    transcriptOf(row).map((turn) => ({
      patient_id: patientId,
      medical_request_id: requestId,
      channel: "WEB",
      direction: turn.role === "USER" ? "INBOUND" : "OUTBOUND",
      message_type: turn.role === "USER" ? "PATIENT" : "AI",
      raw_text: turn.text,
      delivery_status: "DELIVERED",
    })) as never,
  );

  await logEvent({
    requestId,
    type: "MESSAGE_RECEIVED",
    message: "Website chat enquiry submitted",
    durationMs: 60,
  });
  await logEvent({
    requestId,
    type: "TREATMENT_MATCHED",
    message: `Treatment selected by patient: ${plan.treatment.name}`,
    durationMs: 40,
    metadata: { channel: "WEB", selfService: true },
  });

  const { data: doctorRow } = await sb
    .from("doctors")
    .select("id")
    .eq("hospital_id", plan.hospital.id)
    .eq("status", "ACTIVE")
    .limit(1)
    .maybeSingle();

  const { data: itineraryRow, error: itineraryError } = await sb
    .from("itineraries")
    .insert({
      medical_request_id: requestId,
      hospital_id: plan.hospital.id,
      doctor_id: (doctorRow?.["id"] as string | undefined) ?? null,
      status: "DRAFT",
    } as never)
    .select("*")
    .single();
  if (itineraryError) throw new HubError(itineraryError.message, 500);
  const itineraryId = itineraryRow["id"] as string;

  await persistCost(itineraryId, plan.breakdown, {
    treatment: n(plan.benchmarkTotal - 0),
    travel: 0,
    accommodation: 0,
  });

  const nights = selections.nights;
  const items = [
    {
      day: 1,
      time: "07:30",
      type: "FERRY",
      title: "Ferry from Singapore",
      description: "Chosen sailing to Batam",
      location: "Singapore",
    },
    {
      day: 1,
      time: "09:00",
      type: "TRANSPORT",
      title: "Arrival & private transfer",
      description: "Meet-and-greet and transfer",
      location: "Batam",
    },
    {
      day: 1,
      time: "10:00",
      type: "TREATMENT",
      title: `${plan.treatment.name} appointment`,
      description: plan.hospital.name,
      location: plan.hospital.name,
    },
    ...(nights > 0
      ? [
          {
            day: 1,
            time: "16:00",
            type: "ACCOMMODATION",
            title: "Hotel check-in & recovery",
            description: "Recovery stay",
            location: "Batam",
          },
        ]
      : []),
    {
      day: nights > 0 ? 2 : 1,
      time: nights > 0 ? "10:00" : "15:00",
      type: "FOLLOW_UP",
      title: "Post-procedure review",
      description: "Follow-up check",
      location: plan.hospital.name,
    },
    {
      day: nights > 0 ? 2 : 1,
      time: nights > 0 ? "15:00" : "18:00",
      type: "FERRY",
      title: "Return ferry to Singapore",
      description: "Return sailing",
      location: "Batam",
    },
  ];
  await sb.from("itinerary_items").insert(
    items.map((item, index) => ({
      itinerary_id: itineraryId,
      day_number: item.day,
      time: item.time,
      type: item.type,
      title: item.title,
      description: item.description,
      location: item.location,
      status: "ESTIMATED",
      sort_order: index + 1,
    })) as never,
  );

  await sb.from("quotes").insert({
    itinerary_id: itineraryId,
    created_by: "PATIENT_SELF_SERVICE",
    source: "AI_ESTIMATE",
    status: "PENDING_REVIEW",
  } as never);

  await logEvent({
    requestId,
    type: "ITINERARY_DRAFTED",
    message: "Patient-built itinerary submitted for hospital review",
    durationMs: 90,
    metadata: { itineraryId, total: plan.total, channel: "WEB" },
  });
  await logEvent({
    requestId,
    type: "HOSPITAL_REVIEW_REQUIRED",
    message: "Hospital confirmation of pricing and availability required",
    status: "ATTENTION",
  });
  await audit({
    requestId,
    entity: "itineraries",
    entityId: itineraryId,
    action: "ITINERARY_GENERATED",
    actor: "PATIENT_WEB",
  });

  const booking = {
    reference: requestRow["reference"] as string,
    itineraryToken: itineraryRow["public_token"] as string,
  };

  const now = new Date().toISOString();
  const { data: updated, error } = await sb
    .from("web_chat_sessions")
    .update({
      patient_id: patientId,
      medical_request_id: requestId,
      itinerary_id: itineraryId,
      visitor_name: visitor.name,
      stage: "BOOKED",
      transcript: [
        ...transcriptOf(row),
        {
          role: "AGENT",
          text: `All set! Your request ${booking.reference} is with ${plan.hospital.name} for confirmation. You can follow your itinerary from the link below.`,
          at: now,
        },
      ],
    } as never)
    .eq("id", row["id"])
    .select("*")
    .single();
  if (error) throw new HubError(error.message, 500);

  const payload = toPayload(updated, plan);
  return { ...payload, booking };
}
