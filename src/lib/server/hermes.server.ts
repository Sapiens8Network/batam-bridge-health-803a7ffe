/**
 * Hermes AI agent + orchestration pipeline.
 *
 * WhatsApp/Telegram → this module → structured JSON → business logic →
 * database → hospital dashboard. The frontend never calls the model.
 */
import {
  audit,
  calculateCost,
  db,
  HubError,
  logEvent,
  persistCost,
  type CostResult,
} from "./hub.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-5.6-sol";

export interface HermesExtraction {
  intent: "MEDICAL_TOURISM" | "GENERAL_ENQUIRY" | "FOLLOW_UP" | "UNCLEAR";
  treatment: string | null;
  treatmentCategory: string | null;
  confidence: number;
  requirements: string[];
  specialRequirements: string[];
  travellers: number;
  nights: number;
  urgency: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  needsHuman: boolean;
  humanReasons: string[];
  patientSummary: string;
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "intent",
    "treatment",
    "treatmentCategory",
    "confidence",
    "requirements",
    "specialRequirements",
    "travellers",
    "nights",
    "urgency",
    "needsHuman",
    "humanReasons",
    "patientSummary",
  ],
  properties: {
    intent: {
      type: "string",
      enum: ["MEDICAL_TOURISM", "GENERAL_ENQUIRY", "FOLLOW_UP", "UNCLEAR"],
    },
    treatment: { type: ["string", "null"] },
    treatmentCategory: { type: ["string", "null"] },
    confidence: { type: "number" },
    requirements: { type: "array", items: { type: "string" } },
    specialRequirements: { type: "array", items: { type: "string" } },
    travellers: { type: "number" },
    nights: { type: "number" },
    urgency: { type: "string", enum: ["LOW", "NORMAL", "HIGH", "URGENT"] },
    needsHuman: { type: "boolean" },
    humanReasons: { type: "array", items: { type: "string" } },
    patientSummary: { type: "string" },
  },
} as const;

/** Streams the gateway response and returns the accumulated JSON text. */
async function callHermes(catalogue: string[], message: string): Promise<HermesExtraction | null> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return null;

  const instructions = [
    "You are Hermes, the medical-tourism triage agent for MedBridge Pass.",
    "Singapore patients message on WhatsApp/Telegram about treatment in Batam, Indonesia.",
    "Classify the enquiry into structured fields only. Never invent prices, dates, doctors or clinical advice.",
    `Pick "treatment" EXACTLY from this catalogue or return null: ${catalogue.join(" | ")}.`,
    "Set needsHuman = true when the request is clinically complex, mentions emergencies, minors, pregnancy,",
    "accessibility needs, insurance disputes, or when confidence in the treatment match is below 0.75.",
    "requirements = practical pre-procedure preparation steps. specialRequirements = logistics/accessibility needs.",
    "patientSummary = one short neutral sentence for hospital staff.",
  ].join(" ");

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
      input: [{ role: "user", content: [{ type: "input_text", text: message }] }],
      stream: true,
      store: false,
      text: { format: { type: "json_schema", name: "triage", strict: true, schema: SCHEMA } },
    }),
  });

  if (!res.ok || !res.body) {
    console.error("Hermes gateway error", res.status, await res.text().catch(() => ""));
    return null;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          response?: { output_text?: string };
        };
        if (event.type === "response.output_text.delta" && typeof event.delta === "string")
          text += event.delta;
        if (event.type === "response.completed" && !text && event.response?.output_text) {
          text = event.response.output_text;
        }
      } catch {
        /* ignore keep-alive frames */
      }
    }
  }

  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as HermesExtraction;
  } catch {
    console.error("Hermes returned non-JSON output");
    return null;
  }
}

/** Deterministic keyword fallback so the pipeline still works without the model. */
function keywordMatch(
  catalogue: { id: string; name: string; category: string; keywords: string[] }[],
  message: string,
) {
  const lower = message.toLowerCase();
  return (
    catalogue.find((t) => lower.includes(t.name.toLowerCase())) ??
    catalogue.find((t) => t.keywords.some((k) => lower.includes(k.toLowerCase()))) ??
    null
  );
}

export interface InboundInput {
  channel: "WHATSAPP" | "TELEGRAM" | "WEB";
  message: string;
  name: string;
  externalId?: string | undefined;
  phone?: string | undefined;
  hospitalId?: string | undefined;
}

/** Full inbound pipeline. Returns the created medical request id. */
export async function processInbound(input: InboundInput): Promise<{ inquiryId: string }> {
  const sb = await db();
  const started = Date.now();

  if (!input.message.trim()) throw new HubError("Empty message", 400);

  const [treatmentsRes, hospitalsRes] = await Promise.all([
    sb.from("treatments").select("*").eq("active", true),
    sb.from("hospitals").select("*").eq("status", "ACTIVE").order("name"),
  ]);
  const catalogue = (treatmentsRes.data ?? []).map((t) => ({
    id: t["id"] as string,
    name: t["name"] as string,
    category: t["category"] as string,
    keywords: (t["keywords"] as string[]) ?? [],
  }));
  const hospitals = hospitalsRes.data ?? [];
  if (!hospitals.length) throw new HubError("No active hospital configured", 409);

  /* 1. patient (matched on channel id, otherwise created) */
  const channelKey = input.channel === "TELEGRAM" ? "telegram_id" : "whatsapp_id";
  const externalId = input.externalId ?? null;
  let patientId: string | null = null;
  if (externalId) {
    const { data } = await sb
      .from("patients")
      .select("id")
      .eq(channelKey, externalId)
      .maybeSingle();
    patientId = (data?.["id"] as string | undefined) ?? null;
  }
  if (!patientId) {
    const { data, error } = await sb
      .from("patients")
      .insert({
        name: input.name || "Singapore patient",
        preferred_channel: input.channel,
        country: "SINGAPORE",
        ...(input.phone ? { phone: input.phone } : {}),
        ...(externalId ? { [channelKey]: externalId } : {}),
      } as never)
      .select("id")
      .single();
    if (error) throw new HubError(error.message, 500);
    patientId = data["id"] as string;
  }

  /* 2. medical request in AI_PROCESSING */
  const hospitalId = input.hospitalId ?? (hospitals[0]!["id"] as string);
  const { data: requestRow, error: requestError } = await sb
    .from("medical_requests")
    .insert({
      patient_id: patientId,
      hospital_id: hospitalId,
      original_message: input.message,
      channel: input.channel,
      status: "AI_PROCESSING",
    } as never)
    .select("*")
    .single();
  if (requestError) throw new HubError(requestError.message, 500);
  const requestId = requestRow["id"] as string;

  await sb.from("messages").insert({
    patient_id: patientId,
    medical_request_id: requestId,
    channel: input.channel,
    direction: "INBOUND",
    message_type: "PATIENT",
    raw_text: input.message,
    delivery_status: "DELIVERED",
  } as never);
  await logEvent({
    requestId,
    type: "MESSAGE_RECEIVED",
    message: "Inbound patient message received",
    durationMs: 120,
  });
  await audit({
    requestId,
    entity: "medical_requests",
    entityId: requestId,
    action: "INBOUND_MESSAGE",
    actor: input.channel,
  });

  /* 3. Hermes structured extraction (with deterministic fallback) */
  await logEvent({
    requestId,
    type: "INTENT_DETECTION",
    message: "Hermes analysing patient message",
    status: "RUNNING",
  });
  const extraction = await callHermes(
    catalogue.map((t) => t.name),
    input.message,
  );
  const fallback = keywordMatch(catalogue, input.message);

  const matched = extraction?.treatment
    ? (catalogue.find((t) => t.name.toLowerCase() === extraction.treatment!.toLowerCase()) ??
      fallback)
    : fallback;

  const confidence = extraction
    ? Math.min(1, Math.max(0, extraction.confidence))
    : matched
      ? 0.7
      : 0.3;
  const travellers = Math.max(1, Math.round(extraction?.travellers ?? 1));
  const nights = Math.max(0, Math.round(extraction?.nights ?? (matched ? 1 : 0)));
  const reasons: string[] = [...(extraction?.humanReasons ?? [])];
  if (!matched) reasons.push("Treatment could not be matched to the hospital catalogue");
  if (confidence < 0.75) reasons.push("Low AI confidence on treatment match");
  if (extraction?.needsHuman) reasons.push("Hermes flagged this case for a coordinator");

  await logEvent({
    requestId,
    type: "INTENT_DETECTED",
    message: extraction ? "Medical tourism intent detected" : "Intent detected by keyword fallback",
    durationMs: Date.now() - started,
    metadata: {
      intent: extraction?.intent ?? "MEDICAL_TOURISM",
      hermes: extraction ? "gpt-5.6-sol" : "keyword-fallback",
      confidence,
    },
  });

  await sb
    .from("medical_requests")
    .update({
      treatment_id: matched?.id ?? null,
      intent: extraction?.intent ?? "MEDICAL_TOURISM",
      ai_confidence: confidence,
      traveller_count: travellers,
      preferred_nights: nights,
      priority: extraction?.urgency ?? "NORMAL",
      ai_request: {
        treatment: matched?.name ?? extraction?.treatment ?? "Unclassified request",
        treatmentCategory: matched?.category ?? extraction?.treatmentCategory ?? "Unclassified",
        requirements: extraction?.requirements ?? [],
        specialRequirements: extraction?.specialRequirements ?? [],
        summary: extraction?.patientSummary ?? "",
      },
    } as never)
    .eq("id", requestId);

  /* 4. no confident match → human takeover, no itinerary, no patient promise */
  if (!matched || reasons.length > 0) {
    await sb
      .from("medical_requests")
      .update({
        status: "HUMAN_TAKEOVER",
        human_takeover: true,
        takeover_reasons: Array.from(new Set(reasons)),
        takeover_opened_at: new Date().toISOString(),
      } as never)
      .eq("id", requestId);
    await logEvent({
      requestId,
      type: "HUMAN_TAKEOVER",
      message: "Case escalated to a human coordinator",
      status: "ATTENTION",
      metadata: { reasons: Array.from(new Set(reasons)) },
    });
    await audit({
      requestId,
      entity: "medical_requests",
      entityId: requestId,
      action: "HUMAN_TAKEOVER",
      actor: "HERMES_AI",
    });
    await queueOutbound({
      patientId,
      requestId,
      channel: input.channel,
      author: "AI",
      text: "Thanks for reaching out to MedBridge Pass. A care coordinator is reviewing your request personally and will reply shortly.",
    });
    return { inquiryId: requestId };
  }

  /* 5. cost engine on trusted data */
  await logEvent({
    requestId,
    type: "TREATMENT_MATCHED",
    message: `Treatment matched: ${matched.name}`,
    durationMs: 180,
  });
  const cost = await calculateCost({ hospitalId, treatmentId: matched.id, travellers, nights });
  if (cost.missing.length) {
    await sb
      .from("medical_requests")
      .update({
        status: "HUMAN_TAKEOVER",
        human_takeover: true,
        takeover_reasons: cost.missing,
        takeover_opened_at: new Date().toISOString(),
      } as never)
      .eq("id", requestId);
    await logEvent({
      requestId,
      type: "COST_DATA_MISSING",
      message: "Pricing data incomplete — escalated",
      status: "ATTENTION",
      metadata: { missing: cost.missing },
    });
    return { inquiryId: requestId };
  }
  await logEvent({
    requestId,
    type: "COST_CALCULATED",
    message: "Cost engine produced SGD package total",
    durationMs: 240,
    metadata: { total: cost.total, savings: cost.savings, savingsPct: cost.savingsPct },
  });

  /* 6. itinerary + items + quote */
  const { data: doctorRow } = await sb
    .from("doctors")
    .select("id")
    .eq("hospital_id", hospitalId)
    .eq("status", "ACTIVE")
    .limit(1)
    .maybeSingle();

  const { data: itineraryRow, error: itineraryError } = await sb
    .from("itineraries")
    .insert({
      medical_request_id: requestId,
      hospital_id: hospitalId,
      doctor_id: (doctorRow?.["id"] as string | undefined) ?? null,
      status: "DRAFT",
    } as never)
    .select("id")
    .single();
  if (itineraryError) throw new HubError(itineraryError.message, 500);
  const itineraryId = itineraryRow["id"] as string;

  await persistCost(itineraryId, cost.breakdown, cost.benchmark);
  await createItineraryItems(itineraryId, {
    treatment: matched.name,
    ferry: cost.ferry,
    hotel: cost.hotel,
    nights,
  });
  await sb.from("quotes").insert({
    itinerary_id: itineraryId,
    created_by: "HERMES_AI",
    source: "AI_ESTIMATE",
    status: "PENDING_REVIEW",
  } as never);

  await sb
    .from("medical_requests")
    .update({ status: "HOSPITAL_REVIEW_REQUIRED", hospital_review: "PENDING" } as never)
    .eq("id", requestId);

  await logEvent({
    requestId,
    type: "ITINERARY_DRAFTED",
    message: "Draft itinerary generated for hospital review",
    durationMs: 1450,
    metadata: { itineraryId, steps: 6 },
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
    actor: "HERMES_AI",
  });

  await queueOutbound({
    patientId,
    requestId,
    channel: input.channel,
    author: "AI",
    text: `Thanks! We have prepared a ${matched.name} care plan in Batam and sent it to the hospital for confirmation. You will receive your itinerary link shortly.`,
  });

  return { inquiryId: requestId };
}

async function createItineraryItems(
  itineraryId: string,
  ctx: {
    treatment: string;
    ferry: Record<string, unknown> | null;
    hotel: Record<string, unknown> | null;
    nights: number;
  },
) {
  const sb = await db();
  const ferryName = (ctx.ferry?.["operator_name"] as string | undefined) ?? "Scheduled ferry";
  const origin = (ctx.ferry?.["origin_terminal"] as string | undefined) ?? "Singapore";
  const destination = (ctx.ferry?.["destination_terminal"] as string | undefined) ?? "Batam";
  const hotelName = (ctx.hotel?.["name"] as string | undefined) ?? "Recovery hotel";

  const items = [
    {
      day: 1,
      time: "07:30",
      type: "FERRY",
      title: "Ferry from Singapore",
      description: `${ferryName} departure`,
      location: origin,
    },
    {
      day: 1,
      time: "09:00",
      type: "TRANSPORT",
      title: "Arrival & private transfer",
      description: "Meet-and-greet and transfer to hospital",
      location: destination,
    },
    {
      day: 1,
      time: "10:00",
      type: "TREATMENT",
      title: `${ctx.treatment} appointment`,
      description: "Consultation, diagnostics and procedure",
      location: "Hospital",
    },
    ...(ctx.nights > 0
      ? [
          {
            day: 1,
            time: "16:00",
            type: "ACCOMMODATION",
            title: "Hotel check-in & recovery",
            description: hotelName,
            location: hotelName,
          },
        ]
      : []),
    {
      day: ctx.nights > 0 ? 2 : 1,
      time: ctx.nights > 0 ? "10:00" : "15:00",
      type: "FOLLOW_UP",
      title: "Post-procedure review",
      description: "Follow-up check and medication handover",
      location: "Hospital",
    },
    {
      day: ctx.nights > 0 ? 2 : 1,
      time: ctx.nights > 0 ? "15:00" : "18:00",
      type: "FERRY",
      title: "Return ferry to Singapore",
      description: `${ferryName} return sailing`,
      location: destination,
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
}

/* ------------------------------------------------------------ messaging --- */

export interface OutboundInput {
  patientId: string;
  requestId: string | null;
  channel: "WHATSAPP" | "TELEGRAM" | "WEB";
  author: "AI" | "HOSPITAL" | "SYSTEM";
  text: string;
}

/**
 * Patient-facing delivery. Raw model output never reaches a patient: callers
 * pass templated, business-approved copy only.
 */
export async function queueOutbound(input: OutboundInput) {
  const sb = await db();
  const delivered = await deliver(input);
  await sb.from("messages").insert({
    patient_id: input.patientId,
    medical_request_id: input.requestId,
    channel: input.channel,
    direction: "OUTBOUND",
    message_type: input.author,
    raw_text: input.text,
    delivery_status: delivered ? "SENT" : "QUEUED",
  } as never);
}

async function deliver(input: OutboundInput): Promise<boolean> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const telegramKey = process.env["TELEGRAM_API_KEY"];
  if (input.channel !== "TELEGRAM" || !lovableKey || !telegramKey) return false;

  const sb = await db();
  const { data } = await sb
    .from("patients")
    .select("telegram_id")
    .eq("id", input.patientId)
    .maybeSingle();
  const chatId = data?.["telegram_id"] as string | undefined;
  if (!chatId) return false;

  try {
    const res = await fetch("https://connector-gateway.lovable.dev/telegram/sendMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": telegramKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chat_id: chatId, text: input.text }),
    });
    if (!res.ok) {
      console.error("Telegram delivery failed", res.status, await res.text().catch(() => ""));
      return false;
    }
    const body = (await res.json()) as { ok?: boolean; error?: string };
    if (body.ok === false) {
      console.error("Telegram delivery rejected", body.error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Telegram delivery error", error);
    return false;
  }
}
