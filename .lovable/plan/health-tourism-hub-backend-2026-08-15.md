# Health Tourism Hub — Backend

Turn the current mock-driven frontend into a real backend: a Postgres database as the single source of truth, an AI intent-extraction layer (Hermes), a backend cost engine, hospital/doctor approval gates, and Telegram/WhatsApp inbound + outbound messaging.

## Stack note (important)

This project runs on Lovable's fixed stack: TanStack Start (Node/TypeScript) with Lovable Cloud for Postgres, auth, storage and realtime. So instead of Fastify + Prisma we use the equivalents that work here:

| Requested | Built as |
|---|---|
| Fastify/Express routes | TanStack server functions (internal) + `/api/public/*` server routes (webhooks) |
| Prisma | SQL migrations + generated typed Postgres client |
| Hermes LLM | Lovable AI Gateway (Gemini) with a strict JSON output contract |
| WebSocket/SSE | Postgres realtime subscriptions on the events tables |
| Zod validation | Zod on every server function and webhook |
| JWT auth | Cloud Auth (hospital staff sign-in) + roles table |

Everything else in the spec — schema, statuses, workflow gates, pricing rules, safety rules — is implemented as written.

## 1. Database

One migration creating all tables with enums, indexes, grants and row-level security:

`patients`, `hospitals`, `doctors`, `treatments`, `hospital_treatment_prices`, `singapore_benchmarks`, `hotels`, `transport_options`, `ferry_options`, `medical_requests`, `itineraries`, `itinerary_items`, `doctor_reviews`, `quotes`, `messages`, `ai_activity_events`, `audit_log`, plus `user_roles` (`admin`, `hospital_staff`, `doctor`) and `hospital_staff` membership.

Key rules baked into the schema:
- No universal treatment price — prices live per hospital with `valid_from`/`valid_until`.
- Benchmarks stored as min/max/average with source name and date, labelled as estimates.
- Itineraries carry every cost line separately plus totals, savings, savings %, `public_token` and `expires_at`.
- Item status limited to `ESTIMATED | PENDING | CONFIRMED | COMPLETED`; nothing can be created as `CONFIRMED`.
- All 12 medical-request statuses and all review/quote statuses as Postgres enums.

Access model: staff read/write only their own hospital's rows; doctors see their review queue; patients have no direct table access — the public itinerary is served by token through a server function that projects patient-safe fields only.

## 2. Seed data (in the migration)

3 hospitals, 5 doctors, 5 hotels, 5 ferry/transport options, 6 treatments (Dental Implant, Health Screening, Cataract Surgery, Orthopedic Consultation, LASIK, Executive Health Screening), Batam prices, Singapore benchmarks, 6 Singapore patients with 6 medical requests spread across the pipeline, their itineraries, quotes, messages and AI activity events — so the dashboard is populated on first load.

## 3. Hermes layer

A server-side agent module that is the only thing talking to the model:
- Strict JSON-only output contract (intent, treatment + confidence, patient, requirements, missing_information, next_action), parsed and validated with Zod; a parse failure or timeout becomes `HUMAN_TAKEOVER`, never a guess.
- Tool functions resolved against the database, not the model: `find_patient`, `find_treatment`, `find_hospital_prices`, `find_singapore_benchmark`, `find_hotel_options`, `find_transport_options`, `find_ferry_options`, `calculate_itinerary`, `create_human_review`.
- Hermes never sets prices, availability, approvals or bookings.

## 4. Cost engine

Pure backend module, 2-decimal SGD rounding:

```text
medical_total       = treatment + doctor_fee + diagnostics + medication + other
travel_total        = ferry + transport
accommodation_total = hotel_per_night x nights
batam_package       = medical_total + travel_total + accommodation_total
savings             = singapore_benchmark - batam_package
savings_percentage  = savings / singapore_benchmark x 100
```

Missing hospital price returns `PRICE_UNAVAILABLE`; missing benchmark returns `BENCHMARK_UNAVAILABLE`. Both stop itinerary generation and raise human takeover. Labels stay "Singapore benchmark" vs "Batam complete medical travel package".

## 5. API surface

Webhooks (public routes, signature/verify-token checked, never returning PII):
`POST /api/public/webhooks/telegram`, `POST|GET /api/public/webhooks/whatsapp`, `GET /api/public/itinerary/:token`.

Server functions covering the rest of the spec: dashboard summary/inquiries/activity, patients, inquiries (list/detail/patch), AI process-request + activity, itinerary generate/patch/approve/send, quotes patch/approve/reject, doctor review + request-doctor, message send + suggest-reply, human takeover + return-to-ai, and `demo/start`.

Every response uses `{ success: true, data }` / `{ success: false, error: { code, message } }`.

## 6. Messaging abstraction

A `MessagingProvider` interface with `TelegramProvider` and `WhatsAppProvider` implementations, so business logic never touches a channel SDK. Outbound text always goes through `generatePatientMessage()` — max 8 lines, savings summary plus reply options — so raw model output can never reach a patient.

Telegram is wired through the Lovable Telegram connector (I'll open the connect card, then register the webhook). WhatsApp ships with the same interface behind an access-token/verify-token pair; if you don't have Meta credentials yet it stays in simulation mode and everything else still works.

## 7. Workflow gates

Inbound message -> patient identified -> request created -> Hermes -> validation -> DB lookups -> cost engine -> itinerary + items -> `HOSPITAL_REVIEW_REQUIRED`. Nothing is sent to the patient before hospital approval; `DOCTOR_REVIEW_REQUIRED` inserts a doctor review that only an explicit backend approval can move to `APPROVED`.

Automatic human takeover on: confidence < 0.75, patient asks for a human, diagnosis request, emergency language, unknown treatment, or unavailable price/benchmark.

## 8. Realtime + audit

Dashboard subscribes to inserts/updates on `ai_activity_events`, `medical_requests`, `itineraries` and `quotes`, mapping them to the event names in the spec (`INQUIRY_CREATED`, `AI_STEP_COMPLETED`, `QUOTE_APPROVED`, `HUMAN_TAKEOVER`, ...) — no polling, no refresh. Every price edit, approval, rejection, send and takeover writes an `audit_log` row with actor, timestamp, old and new value.

## 9. Frontend swap

The existing API layer (`src/lib/api`) already isolates data access, so the mock store is replaced with real server-function calls behind the same shapes — dashboard, pipeline, quote builder, doctor review, messaging, AI activity, analytics and the patient itinerary page keep working unchanged, now on live data. `POST /demo/start` drives the John Tan scripted flow end to end for the demo.

## 10. Safety

Disclaimers stay on every clinical and pricing surface; no diagnosis, prescription, medical-necessity claim, guaranteed outcome, guaranteed saving, or "confirmed" booking is ever produced by the AI. Public endpoints are rate-limited and return patient-safe fields only.

## Sequencing

1. Enable Lovable Cloud, run schema + seed migration.
2. Cost engine, Hermes contract, patient-message formatter, audit helper.
3. Server functions for dashboard, inquiries, itineraries, quotes, doctor review, takeover, messaging.
4. Webhook routes + messaging providers, connect Telegram, register webhook.
5. Realtime subscriptions, demo endpoint.
6. Point the frontend at the live API and verify the full flow in the preview.
