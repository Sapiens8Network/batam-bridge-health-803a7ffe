# Health Tourism Hub — Frontend Build Plan

Seamless cross-border patient & medical experiences: Singapore patients ↔ Batam hospitals. Front end only, running fully on mock data with a clean API layer that can be swapped for the real backend later.

## Visual direction (blue → green)

Your note takes priority over the spec's sky-blue: the palette travels from "city of light" to "green nature and health".

- Primary: fresh medical green (emerald/jade), used for status, CTAs, savings figures.
- Secondary: teal, bridging to a cool city blue used sparingly for the Singapore side of comparisons.
- Backgrounds: light clinical off-white/gray; text in slate. Subtle borders, rounded cards, compact information density.
- Signature motif: Singapore = cool blue token, Batam = green token, so every cost comparison reads visually as blue → green.
- All colors as semantic tokens in `src/styles.css` (light + dark). No hardcoded color utilities.
- Looks like a hospital operations platform, not a chatbot: dense tables, kanban, status chips, approval bars.

## Architecture

Frontend never touches the LLM. It consumes REST-shaped calls and simulated realtime events.

```text
WhatsApp/Telegram → Backend API → Hermes Agent → structured JSON
   → business logic → DB → Hospital dashboard → approval → Patient itinerary
```

- `src/lib/api/` — typed service methods matching the contract (webhooks, dashboard summary, inquiries, patients, messages, ai activity, itineraries, quotes, doctor review, human takeover, public itinerary by token). Each method reads `VITE_API_BASE_URL`; when unset it resolves against the mock store (offline/mock mode badge in the top bar).
- `src/lib/mock/` — internally consistent seed data: 6 Singapore patients, 3 Batam hospitals, 5 doctors, 5 hotels, 5 transport options, treatment + Singapore benchmark pricing.
- `src/lib/events/` — mock event bus (webhook simulator) emitting inquiry/AI/status events; later replaced by WebSocket/SSE.
- Zustand store for live pipeline/session/demo state; TanStack Query for all reads with loading, empty, error and retry states.
- Types mirror the backend JSON contract; UI renders structured fields only — never raw AI prose, never chain-of-thought.

## Routes (TanStack Router file routes)

Note: this stack uses TanStack Router, not React Router — same paths, same behavior.

`/` (redirects to dashboard) · `/dashboard` · `/inquiries` · `/inquiries/$id` · `/patients` · `/patients/$id` · `/messages` · `/ai-activity` · `/quotes` · `/doctors` · `/treatments` · `/logistics` · `/analytics` · `/settings` · patient-facing `/itinerary/$token`.

Hospital routes share a sidebar + top bar shell; the patient itinerary route is standalone and mobile-first. Every route gets its own head() metadata; the patient route is noindex.

## Screens

1. **Dashboard** — KPI cards (Singapore leads, AI itineraries generated, hospital reviews pending, confirmed bookings, completed patients, estimated savings), live activity feed with timestamps, and the RUN LIVE DEMO button.
2. **Inquiries** — kanban + table toggle across the 11 statuses (NEW_INQUIRY → COMPLETED, HUMAN_TAKEOVER). Cards show patient, country, channel, treatment, AI confidence, Singapore benchmark, Batam estimate, trip total, savings, travel date, doctor + hospital review status, priority (LOW/NORMAL/HIGH/URGENT).
3. **Inquiry detail** — patient information, original message verbatim, AI-extracted request (treatment, category, confidence, requirements, duration, special needs), cost comparison, AI activity panel, quote builder, doctor review, human takeover. No fabricated medical content.
4. **AI Activity panel** — ordered event checklist with timestamp, status, duration, expandable technical detail and a "View Structured AI Data" JSON drawer (structured output only, debug-flagged).
5. **Cost comparison** — Singapore column (blue) vs Batam column (green), line items, totals, saving amount + percentage, labelled "ESTIMATE — subject to hospital confirmation."
6. **Quote builder** — editable treatment/doctor/hospital/diagnostics/medication/ferry/hotel/transport/other fields with auto-computed medical subtotal, travel subtotal, package total, benchmark, savings and percentage. Actions: Edit, Save Draft, Request Doctor Review, Approve Quote, Reject, Send to Patient. Hospital edits override AI estimates.
7. **Doctor review** — request, proposed treatment, duration, assigned doctor, appointment; Approve / Modify / Request More Information / Refer to Specialist / Reject. Approval shown only when the record carries an explicit doctor approval.
8. **Human takeover** — auto-flag on confidence <75%, diagnosis requests, emergency language, unknown procedure, missing pricing/availability, patient asks for a human. Shows the paused-case notice with Take Over, Assign Staff, Return to AI, Close Case.
9. **Messages** — ALL / WHATSAPP / TELEGRAM tabs, thread with PATIENT / AI / HOSPITAL STAFF / SYSTEM labels, Reply, AI Suggest Reply, Take Over, Send Itinerary, Send Quote. AI suggestions always editable, never auto-sent; short 4–8 line patient preview component with Send WhatsApp / Send Telegram / Edit / Regenerate.
10. **Patient itinerary (`/itinerary/$token`)** — mobile-first: header with patient name and status, large cost card with the estimate disclaimer, 6-step journey timeline (ferry out, arrival + transport, hospital, recovery hotel, follow-up, return) each tagged CONFIRMED / PENDING / ESTIMATED, and CTAs: Confirm Booking via WhatsApp, Contact Hospital, View Full Cost, Download Itinerary. Token-only access, no DB IDs, patient-safe fields only.
11. **Analytics** — leads, conversion rate, average savings, confirmed bookings, completed journeys, top procedures, average response time, revenue opportunity, patients by treatment; Recharts for SG vs Batam cost, monthly inquiries, treatment distribution, conversion funnel.
12. **Settings / Doctors / Treatments & Pricing / Hotels & Transport** — table-driven reference management screens.

Sidebar footer: Batam Medical Center, AI Agent ONLINE, WhatsApp CONNECTED, Telegram CONNECTED. Top bar: hospital switcher, search, notifications, AI/WhatsApp/Telegram status, profile, toasts (sonner).

## Live demo + webhook simulation

RUN LIVE DEMO plays a scripted 60–90s sequence from a Telegram dental-implant message through AI processing, pricing, comparison, travel estimate, itinerary, hospital review, approval, patient notification, to PATIENT ITINERARY READY — driven entirely through the same mock event bus, so it exercises real UI paths. A generic `simulateInboundMessage()` creates the inquiry, fires a toast, bumps dashboard counters, appends to the pipeline and AI activity, and produces the mock itinerary.

## Compliance copy

Medical disclaimer surfaced on inquiry detail, quote builder, cost comparison and patient itinerary: estimates for planning only; medical suitability, recommendations, availability and final pricing confirmed by the treating hospital and doctor. Nothing is shown as booked or doctor-approved unless the record says so.

## Build order

1. Design tokens + app shell (sidebar, top bar, toasts).
2. Types, mock data, API layer, event bus, stores.
3. Dashboard, inquiries kanban/table, inquiry detail with AI activity + cost comparison.
4. Quote builder, doctor review, human takeover.
5. Messages centre + patient message preview.
6. Patient itinerary route.
7. Analytics + reference screens, then the live demo script.
