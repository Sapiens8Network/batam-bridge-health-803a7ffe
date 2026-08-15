import type {
  ActivityFeedItem,
  AiActivityEvent,
  Doctor,
  Hospital,
  Hotel,
  Inquiry,
  Itinerary,
  Message,
  Patient,
  Quote,
  TransportOption,
  Treatment,
} from "../types";

/** Fixed clock base so mock data stays internally consistent between renders. */
const day = 86_400_000;
export const baseNow = new Date("2026-08-15T13:40:00+08:00").getTime();
const iso = (offsetMs: number) => new Date(baseNow + offsetMs).toISOString();

export const hospitals: Hospital[] = [
  {
    id: "hos_batam_medical_center",
    name: "Batam Medical Center",
    city: "Batam Centre",
    accreditation: "KARS Paripurna",
    contactPhone: "+62 778 555 0110",
    specialties: ["Dental", "Ophthalmology", "Orthopedics", "Health Screening"],
  },
  {
    id: "hos_nagoya_general",
    name: "Nagoya General Hospital",
    city: "Nagoya, Batam",
    accreditation: "KARS Utama",
    contactPhone: "+62 778 555 0244",
    specialties: ["Cardiology", "Health Screening", "Orthopedics"],
  },
  {
    id: "hos_harbour_bay_clinic",
    name: "Harbour Bay Specialist Clinic",
    city: "Harbour Bay, Batam",
    accreditation: "KARS Madya",
    contactPhone: "+62 778 555 0388",
    specialties: ["Dental", "LASIK", "Dermatology"],
  },
];

export const doctors: Doctor[] = [
  {
    id: "doc_wijaya",
    name: "Dr. Andri Wijaya",
    specialty: "Implant Dentistry",
    hospitalId: "hos_batam_medical_center",
    languages: ["English", "Bahasa Indonesia"],
    yearsExperience: 14,
  },
  {
    id: "doc_lim",
    name: "Dr. Sarah Lim",
    specialty: "Ophthalmology",
    hospitalId: "hos_batam_medical_center",
    languages: ["English", "Mandarin", "Bahasa Indonesia"],
    yearsExperience: 11,
  },
  {
    id: "doc_pratama",
    name: "Dr. Bayu Pratama",
    specialty: "Orthopedic Surgery",
    hospitalId: "hos_nagoya_general",
    languages: ["English", "Bahasa Indonesia"],
    yearsExperience: 18,
  },
  {
    id: "doc_hartono",
    name: "Dr. Melina Hartono",
    specialty: "Internal Medicine / Screening",
    hospitalId: "hos_nagoya_general",
    languages: ["English", "Bahasa Indonesia"],
    yearsExperience: 9,
  },
  {
    id: "doc_tan",
    name: "Dr. Kevin Tan",
    specialty: "Refractive Surgery (LASIK)",
    hospitalId: "hos_harbour_bay_clinic",
    languages: ["English", "Mandarin"],
    yearsExperience: 12,
  },
];

export const hotels: Hotel[] = [
  { id: "htl_bch", name: "Batam City Hotel", area: "Batam Centre", nightlyRate: 65, distanceToHospitalKm: 1.2, rating: 4.2 },
  { id: "htl_hbr", name: "Harbour Bay Suites", area: "Harbour Bay", nightlyRate: 78, distanceToHospitalKm: 2.8, rating: 4.4 },
  { id: "htl_ngy", name: "Nagoya Grand Inn", area: "Nagoya", nightlyRate: 52, distanceToHospitalKm: 0.9, rating: 4.0 },
  { id: "htl_ntg", name: "Nongsa Coast Resort", area: "Nongsa", nightlyRate: 120, distanceToHospitalKm: 12.5, rating: 4.7 },
  { id: "htl_rcv", name: "Recovery Stay Residence", area: "Batam Centre", nightlyRate: 58, distanceToHospitalKm: 0.6, rating: 4.1 },
];

export const transportOptions: TransportOption[] = [
  { id: "trn_ferry_hf", name: "HorizonFast Ferry", type: "FERRY", route: "HarbourFront ↔ Batam Centre", price: 75, durationMinutes: 60 },
  { id: "trn_ferry_tm", name: "Sindo Ferry", type: "FERRY", route: "Tanah Merah ↔ Nongsapura", price: 68, durationMinutes: 45 },
  { id: "trn_car", name: "Private Car Transfer", type: "CAR", route: "Terminal ↔ Hospital ↔ Hotel", price: 30, durationMinutes: 25 },
  { id: "trn_shuttle", name: "Hospital Shuttle", type: "SHUTTLE", route: "Terminal ↔ Hospital", price: 12, durationMinutes: 30 },
  { id: "trn_amb", name: "Medical Assist Transfer", type: "AMBULANCE", route: "Terminal ↔ Hospital", price: 140, durationMinutes: 25 },
];

export const treatments: Treatment[] = [
  { id: "trt_dental_implant", name: "Dental Implant", category: "Dental", batamPrice: 400, singaporeBenchmark: 1800, stayNights: 1, durationMinutes: 90 },
  { id: "trt_health_screening", name: "Health Screening", category: "Diagnostics", batamPrice: 180, singaporeBenchmark: 650, stayNights: 1, durationMinutes: 120 },
  { id: "trt_cataract", name: "Cataract Surgery", category: "Ophthalmology", batamPrice: 1100, singaporeBenchmark: 4200, stayNights: 2, durationMinutes: 60 },
  { id: "trt_ortho_consult", name: "Orthopedic Consultation", category: "Orthopedics", batamPrice: 90, singaporeBenchmark: 320, stayNights: 1, durationMinutes: 45 },
  { id: "trt_lasik", name: "LASIK", category: "Ophthalmology", batamPrice: 1250, singaporeBenchmark: 3600, stayNights: 2, durationMinutes: 40 },
  { id: "trt_exec_screening", name: "Executive Health Screening", category: "Diagnostics", batamPrice: 320, singaporeBenchmark: 1250, stayNights: 2, durationMinutes: 240 },
];

export const patients: Patient[] = [
  { id: "pat_001", name: "Marcus Tan", country: "Singapore", phoneMasked: "+65 •••• 4821", channel: "TELEGRAM", travellers: 1, preferredDate: "2026-08-22", createdAt: iso(-2 * day), language: "English" },
  { id: "pat_002", name: "Priya Raman", country: "Singapore", phoneMasked: "+65 •••• 1174", channel: "WHATSAPP", travellers: 2, preferredDate: "2026-08-25", createdAt: iso(-3 * day), language: "English" },
  { id: "pat_003", name: "Lim Wei Sheng", country: "Singapore", phoneMasked: "+65 •••• 9042", channel: "WHATSAPP", travellers: 1, preferredDate: "2026-09-02", createdAt: iso(-5 * day), language: "English / Mandarin" },
  { id: "pat_004", name: "Nurul Aisyah", country: "Singapore", phoneMasked: "+65 •••• 6633", channel: "TELEGRAM", travellers: 1, preferredDate: "2026-08-30", createdAt: iso(-6 * day), language: "English / Malay" },
  { id: "pat_005", name: "Daniel Ong", country: "Singapore", phoneMasked: "+65 •••• 2287", channel: "WHATSAPP", travellers: 2, preferredDate: "2026-09-08", createdAt: iso(-9 * day), language: "English" },
  { id: "pat_006", name: "Grace Chandra", country: "Singapore", phoneMasked: "+65 •••• 7719", channel: "TELEGRAM", travellers: 1, preferredDate: "2026-08-18", createdAt: iso(-12 * day), language: "English" },
];

interface Seed {
  inquiry: Inquiry;
  quote: Quote;
  itinerary: Itinerary | null;
  activity: AiActivityEvent[];
  messages: Message[];
}

function ferryFacts(state: Itinerary["steps"][number]["state"]) {
  return state;
}

const seeds: Seed[] = [
  buildSeed({
    idx: 1,
    patientId: "pat_001",
    hospitalId: "hos_batam_medical_center",
    treatmentId: "trt_dental_implant",
    status: "HOSPITAL_REVIEW_REQUIRED",
    priority: "HIGH",
    channel: "TELEGRAM",
    message:
      "Hi, I'm from Singapore and need a dental implant. Can you tell me the complete cost including ferry and hotel? Looking at the weekend of 22 Aug.",
    confidence: 0.93,
    doctorId: "doc_wijaya",
    doctorState: "PENDING",
    hospitalReview: "PENDING",
    createdOffset: -2 * day,
  }),
  buildSeed({
    idx: 2,
    patientId: "pat_002",
    hospitalId: "hos_nagoya_general",
    treatmentId: "trt_exec_screening",
    status: "QUOTE_APPROVED",
    priority: "NORMAL",
    channel: "WHATSAPP",
    message:
      "Good afternoon, my husband and I want executive health screening in Batam. We are 2 pax travelling from Singapore, 25 Aug if possible.",
    confidence: 0.88,
    doctorId: "doc_hartono",
    doctorState: "APPROVED",
    hospitalReview: "APPROVED",
    createdOffset: -3 * day,
  }),
  buildSeed({
    idx: 3,
    patientId: "pat_003",
    hospitalId: "hos_batam_medical_center",
    treatmentId: "trt_cataract",
    status: "DOCTOR_REVIEW_REQUIRED",
    priority: "URGENT",
    channel: "WHATSAPP",
    message:
      "My mother needs cataract surgery. Singapore quote was very expensive. She is 71 and has high blood pressure — is it safe for her to travel by ferry?",
    confidence: 0.71,
    doctorId: "doc_lim",
    doctorState: "PENDING",
    hospitalReview: "PENDING",
    createdOffset: -5 * day,
    takeover: {
      active: true,
      reasons: ["AI confidence below 75%", "Medical suitability question", "Comorbidity mentioned"],
      assignedStaff: null,
      openedAt: iso(-5 * day + 3600_000),
    },
  }),
  buildSeed({
    idx: 4,
    patientId: "pat_004",
    hospitalId: "hos_batam_medical_center",
    treatmentId: "trt_ortho_consult",
    status: "AI_ITINERARY_READY",
    priority: "NORMAL",
    channel: "TELEGRAM",
    message:
      "Knee has been painful for 3 months. I would like an orthopedic consultation in Batam with an MRI if needed. What is the cost?",
    confidence: 0.84,
    doctorId: "doc_pratama",
    doctorState: "NOT_REQUIRED",
    hospitalReview: "PENDING",
    createdOffset: -6 * day,
  }),
  buildSeed({
    idx: 5,
    patientId: "pat_005",
    hospitalId: "hos_harbour_bay_clinic",
    treatmentId: "trt_lasik",
    status: "CONFIRMED_BOOKING",
    priority: "NORMAL",
    channel: "WHATSAPP",
    message:
      "Interested in LASIK for both eyes. I will travel with my wife. Need hotel for 2 nights near the clinic. Early September.",
    confidence: 0.91,
    doctorId: "doc_tan",
    doctorState: "APPROVED",
    hospitalReview: "APPROVED",
    createdOffset: -9 * day,
  }),
  buildSeed({
    idx: 6,
    patientId: "pat_006",
    hospitalId: "hos_nagoya_general",
    treatmentId: "trt_health_screening",
    status: "COMPLETED",
    priority: "LOW",
    channel: "TELEGRAM",
    message: "Just want a basic full body health screening in Batam, single day trip is fine.",
    confidence: 0.95,
    doctorId: "doc_hartono",
    doctorState: "APPROVED",
    hospitalReview: "APPROVED",
    createdOffset: -12 * day,
  }),
];

function buildSeed(input: {
  idx: number;
  patientId: string;
  hospitalId: string;
  treatmentId: string;
  status: Inquiry["status"];
  priority: Inquiry["priority"];
  channel: Inquiry["channel"];
  message: string;
  confidence: number;
  doctorId: string;
  doctorState: Inquiry["doctorReview"]["state"];
  hospitalReview: Inquiry["hospitalReview"];
  createdOffset: number;
  takeover?: Inquiry["humanTakeover"];
}): Seed {
  const treatment = treatments.find((t) => t.id === input.treatmentId)!;
  const patient = patients.find((p) => p.id === input.patientId)!;
  const hospital = hospitals.find((h) => h.id === input.hospitalId)!;
  const doctor = doctors.find((d) => d.id === input.doctorId)!;
  const hotel = hotels.find((h) => h.area.startsWith(hospital.city.split(",")[0].trim())) ?? hotels[0];
  const ferry = transportOptions[0];
  const inquiryId = `inq_${String(input.idx).padStart(3, "0")}`;
  const quoteId = `qte_${String(input.idx).padStart(3, "0")}`;
  const itineraryId = `itn_${String(input.idx).padStart(3, "0")}`;

  const quote: Quote = {
    id: quoteId,
    inquiryId,
    currency: "SGD",
    source: input.hospitalReview === "APPROVED" ? "HOSPITAL_OVERRIDE" : "AI_ESTIMATE",
    breakdown: {
      treatment: treatment.batamPrice,
      doctorFee: Math.round(treatment.batamPrice * 0.12),
      hospitalFee: Math.round(treatment.batamPrice * 0.08),
      diagnostics: treatment.category === "Diagnostics" ? 0 : 60,
      medication: 35,
      ferry: ferry.price,
      hotel: hotel.nightlyRate * treatment.stayNights,
      localTransport: 30,
      otherServices: 0,
    },
    singaporeBenchmark: { treatment: treatment.singaporeBenchmark, travel: 0, accommodation: 0 },
    status:
      input.status === "COMPLETED" || input.status === "CONFIRMED_BOOKING"
        ? "SENT_TO_PATIENT"
        : input.hospitalReview === "APPROVED"
          ? "APPROVED"
          : input.doctorState === "PENDING"
            ? "PENDING_DOCTOR"
            : "DRAFT",
    updatedAt: iso(input.createdOffset + 4 * 60_000),
  };

  const confirmed = ["QUOTE_APPROVED", "CONFIRMED_BOOKING", "TRAVEL_READY", "COMPLETED"].includes(input.status);
  const stepState = (s: "CONFIRMED" | "PENDING" | "ESTIMATED") => (confirmed ? s : "ESTIMATED");

  const itinerary: Itinerary = {
    id: itineraryId,
    token: `tkn-${input.idx}${patient.name.split(" ")[0].toLowerCase()}-4f8a2c`,
    inquiryId,
    hospitalId: hospital.id,
    status: confirmed ? "HOSPITAL_CONFIRMED" : "DRAFT",
    updatedAt: iso(input.createdOffset + 6 * 60_000),
    steps: [
      {
        order: 1,
        kind: "OUTBOUND_FERRY",
        title: "Singapore → Batam",
        state: ferryFacts(stepState("CONFIRMED")),
        facts: [
          { label: "Operator", value: ferry.name },
          { label: "Departure terminal", value: "HarbourFront Centre, Singapore" },
          { label: "Departure time", value: `${patient.preferredDate} · 08:20` },
          { label: "Estimated duration", value: `${ferry.durationMinutes} minutes` },
          { label: "Return", value: "Open return included in package" },
        ],
      },
      {
        order: 2,
        kind: "ARRIVAL",
        title: "Batam arrival & transfer",
        state: stepState("CONFIRMED"),
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
        state: input.doctorState === "APPROVED" ? stepState("CONFIRMED") : "PENDING",
        facts: [
          { label: "Hospital", value: hospital.name },
          { label: "Doctor", value: doctor.name },
          { label: "Procedure", value: treatment.name },
          { label: "Appointment", value: `${patient.preferredDate} · 11:00` },
          { label: "Estimated duration", value: `${treatment.durationMinutes} minutes` },
        ],
      },
      {
        order: 4,
        kind: "RECOVERY",
        title: "Recovery & accommodation",
        state: stepState("CONFIRMED"),
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
          { label: "Confirmation", value: "Scheduled on arrival by hospital" },
        ],
      },
      {
        order: 6,
        kind: "RETURN_FERRY",
        title: "Batam → Singapore",
        state: stepState("CONFIRMED"),
        facts: [
          { label: "Operator", value: ferry.name },
          { label: "Departure terminal", value: "Batam Centre Ferry Terminal" },
          { label: "Departure time", value: "16:40 local time" },
          { label: "Estimated duration", value: `${ferry.durationMinutes} minutes` },
        ],
      },
    ],
  };

  const t0 = input.createdOffset;
  const step = (i: number) => iso(t0 + i * 20_000);
  const activity: AiActivityEvent[] = [
    { id: `${inquiryId}_a1`, inquiryId, at: step(0), label: "Message received", state: "DONE", durationMs: 120, detail: { channel: input.channel, chars: input.message.length } },
    { id: `${inquiryId}_a2`, inquiryId, at: step(1), label: "Patient identified", state: "DONE", durationMs: 340, detail: { patientId: patient.id, country: patient.country } },
    { id: `${inquiryId}_a3`, inquiryId, at: step(2), label: "Treatment identified", state: "DONE", durationMs: 910, detail: { treatment: treatment.name, category: treatment.category, confidence: input.confidence } },
    { id: `${inquiryId}_a4`, inquiryId, at: step(3), label: "Treatment database searched", state: "DONE", durationMs: 210, detail: { matches: 3, selected: treatment.id } },
    { id: `${inquiryId}_a5`, inquiryId, at: step(4), label: "Singapore benchmark retrieved", state: "DONE", durationMs: 180, detail: { benchmarkSgd: treatment.singaporeBenchmark, source: "benchmark_table_2026Q3" } },
    { id: `${inquiryId}_a6`, inquiryId, at: step(5), label: "Batam price retrieved", state: "DONE", durationMs: 160, detail: { hospitalId: hospital.id, treatmentSgd: treatment.batamPrice } },
    { id: `${inquiryId}_a7`, inquiryId, at: step(6), label: "Travel estimate calculated", state: "DONE", durationMs: 240, detail: { ferry: ferry.name, ferrySgd: ferry.price, localTransportSgd: 30 } },
    { id: `${inquiryId}_a8`, inquiryId, at: step(7), label: "Hotel estimate calculated", state: "DONE", durationMs: 190, detail: { hotelId: hotel.id, nights: treatment.stayNights, nightlySgd: hotel.nightlyRate } },
    { id: `${inquiryId}_a9`, inquiryId, at: step(8), label: "Itinerary generated", state: "DONE", durationMs: 1450, detail: { itineraryId, steps: 6 } },
    {
      id: `${inquiryId}_a10`,
      inquiryId,
      at: step(9),
      label: input.takeover?.active ? "Human assistance requested" : "Hospital review required",
      state: "ATTENTION",
      durationMs: null,
      detail: { reasons: input.takeover?.reasons ?? ["Hospital confirmation of pricing and availability"] },
    },
  ];

  const messages: Message[] = [
    { id: `${inquiryId}_m1`, patientId: patient.id, inquiryId, channel: input.channel, author: "PATIENT", body: input.message, at: step(0) },
    { id: `${inquiryId}_m2`, patientId: patient.id, inquiryId, channel: input.channel, author: "SYSTEM", body: `Inquiry ${inquiryId.toUpperCase()} created and routed to ${hospital.name}.`, at: step(1) },
    {
      id: `${inquiryId}_m3`,
      patientId: patient.id,
      inquiryId,
      channel: input.channel,
      author: "AI",
      body: `Your Batam medical travel estimate is ready.\n🇮🇩 Batam package: SGD {{package}}\n🇸🇬 Singapore estimate: SGD ${treatment.singaporeBenchmark.toLocaleString()}\n💰 Estimated saving: SGD {{savings}}\nYour itinerary is waiting for hospital confirmation.`,
      at: step(9),
      suggested: true,
      sent: false,
    },
  ];

  if (input.hospitalReview === "APPROVED") {
    messages.push({
      id: `${inquiryId}_m4`,
      patientId: patient.id,
      inquiryId,
      channel: input.channel,
      author: "HOSPITAL_STAFF",
      body: `${hospital.name} has confirmed your package and appointment with ${doctor.name}. Your itinerary link has been sent.`,
      at: iso(t0 + 3600_000),
      sent: true,
    });
  }

  const inquiry: Inquiry = {
    id: inquiryId,
    reference: `HTH-${2600 + input.idx}`,
    patientId: patient.id,
    hospitalId: hospital.id,
    status: input.status,
    priority: input.priority,
    channel: input.channel,
    originalMessage: input.message,
    aiRequest: {
      treatment: treatment.name,
      treatmentCategory: treatment.category,
      confidence: input.confidence,
      requirements: [
        "Complete cost including travel",
        `${patient.travellers} traveller(s) from Singapore`,
        `Preferred date ${patient.preferredDate}`,
      ],
      preferredDurationDays: treatment.stayNights + 1,
      specialRequirements:
        input.idx === 3
          ? ["Elderly patient", "Hypertension mentioned by family", "Requests travel suitability advice"]
          : input.travellersNote ?? ["English-speaking coordinator requested"],
    },
    hospitalReview: input.hospitalReview,
    doctorReview: {
      doctorId: doctor.id,
      state: input.doctorState,
      proposedTreatment: treatment.name,
      estimatedDurationMinutes: treatment.durationMinutes,
      appointmentAt: `${patient.preferredDate}T11:00:00+07:00`,
      note: input.doctorState === "APPROVED" ? "Suitable for day-case treatment. Standard pre-op checks on arrival." : null,
      decidedAt: input.doctorState === "APPROVED" ? iso(t0 + 3300_000) : null,
    },
    humanTakeover: input.takeover ?? { active: false, reasons: [], assignedStaff: null, openedAt: null },
    quoteId,
    itineraryId: itinerary.id,
    createdAt: iso(t0),
    updatedAt: iso(t0 + 3600_000),
  };

  return { inquiry, quote, itinerary, activity, messages };
}

export const seedInquiries = seeds.map((s) => s.inquiry);
export const seedQuotes = seeds.map((s) => s.quote);
export const seedItineraries = seeds.map((s) => s.itinerary!).filter(Boolean);
export const seedActivity = seeds.flatMap((s) => s.activity);
export const seedMessages = seeds.flatMap((s) => s.messages);

export const seedFeed: ActivityFeedItem[] = [
  { id: "f1", at: iso(-2 * 60_000), label: "New Telegram inquiry · Marcus Tan", tone: "INFO", inquiryId: "inq_001" },
  { id: "f2", at: iso(-1.8 * 60_000), label: "Treatment identified: Dental Implant", tone: "INFO", inquiryId: "inq_001" },
  { id: "f3", at: iso(-1.6 * 60_000), label: "Cost comparison generated", tone: "INFO", inquiryId: "inq_001" },
  { id: "f4", at: iso(-1.4 * 60_000), label: "Itinerary generated", tone: "SUCCESS", inquiryId: "inq_001" },
  { id: "f5", at: iso(-1.2 * 60_000), label: "Hospital review required", tone: "ATTENTION", inquiryId: "inq_001" },
  { id: "f6", at: iso(-60_000), label: "Doctor approved · Executive Health Screening", tone: "SUCCESS", inquiryId: "inq_002" },
  { id: "f7", at: iso(-30_000), label: "Patient notified on WhatsApp", tone: "SUCCESS", inquiryId: "inq_002" },
];

export const monthlyInquiries = [
  { month: "Mar", inquiries: 12, confirmed: 4 },
  { month: "Apr", inquiries: 18, confirmed: 6 },
  { month: "May", inquiries: 21, confirmed: 8 },
  { month: "Jun", inquiries: 26, confirmed: 11 },
  { month: "Jul", inquiries: 31, confirmed: 13 },
  { month: "Aug", inquiries: 24, confirmed: 8 },
];

export const responseTimes = [
  { week: "W28", minutes: 9.4 },
  { week: "W29", minutes: 7.8 },
  { week: "W30", minutes: 6.2 },
  { week: "W31", minutes: 5.1 },
  { week: "W32", minutes: 4.6 },
  { week: "W33", minutes: 3.9 },
];
