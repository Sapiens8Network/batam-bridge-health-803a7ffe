/**
 * Domain types mirroring the backend / Hermes structured JSON contract.
 * The frontend NEVER talks to the LLM directly — it only renders these
 * structured fields, events and statuses.
 */

export type Channel = "WHATSAPP" | "TELEGRAM";

export type InquiryStatus =
  | "NEW_INQUIRY"
  | "AI_PROCESSING"
  | "AI_ITINERARY_READY"
  | "HOSPITAL_REVIEW_REQUIRED"
  | "DOCTOR_REVIEW_REQUIRED"
  | "QUOTE_APPROVED"
  | "PATIENT_CONFIRMATION_PENDING"
  | "CONFIRMED_BOOKING"
  | "TRAVEL_READY"
  | "COMPLETED"
  | "HUMAN_TAKEOVER";

export type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type ReviewState = "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";

export type ConfirmationState = "CONFIRMED" | "PENDING" | "ESTIMATED";

export interface Patient {
  id: string;
  name: string;
  country: string;
  phoneMasked: string;
  channel: Channel;
  travellers: number;
  preferredDate: string;
  createdAt: string;
  language: string;
  notes?: string | undefined;
}

export interface AiExtractedRequest {
  treatment: string;
  treatmentCategory: string;
  confidence: number;
  requirements: string[];
  preferredDurationDays: number;
  specialRequirements: string[];
}

export interface CostBreakdown {
  treatment: number;
  doctorFee: number;
  hospitalFee: number;
  diagnostics: number;
  medication: number;
  ferry: number;
  hotel: number;
  localTransport: number;
  otherServices: number;
}

export interface SingaporeBenchmark {
  treatment: number;
  travel: number;
  accommodation: number;
}

export interface Quote {
  id: string;
  inquiryId: string;
  currency: "SGD";
  source: "AI_ESTIMATE" | "HOSPITAL_OVERRIDE";
  breakdown: CostBreakdown;
  singaporeBenchmark: SingaporeBenchmark;
  status: "DRAFT" | "PENDING_DOCTOR" | "APPROVED" | "REJECTED" | "SENT_TO_PATIENT";
  updatedAt: string;
}

export interface DoctorReview {
  doctorId: string | null;
  state: ReviewState;
  proposedTreatment: string | null;
  estimatedDurationMinutes: number | null;
  appointmentAt: string | null;
  note: string | null;
  decidedAt: string | null;
}

export interface HumanTakeover {
  active: boolean;
  reasons: string[];
  assignedStaff: string | null;
  openedAt: string | null;
}

export interface AiActivityEvent {
  id: string;
  inquiryId: string;
  at: string;
  label: string;
  state: "DONE" | "RUNNING" | "ATTENTION" | "FAILED";
  durationMs: number | null;
  detail?: Record<string, unknown> | undefined;
}

export interface ItineraryStep {
  order: number;
  kind: "OUTBOUND_FERRY" | "ARRIVAL" | "HOSPITAL" | "RECOVERY" | "FOLLOW_UP" | "RETURN_FERRY";
  title: string;
  state: ConfirmationState;
  facts: { label: string; value: string }[];
}

export interface Itinerary {
  id: string;
  token: string;
  inquiryId: string;
  status: "DRAFT" | "HOSPITAL_CONFIRMED" | "SENT" | "PATIENT_CONFIRMED";
  hospitalId: string;
  steps: ItineraryStep[];
  updatedAt: string;
}

export interface Inquiry {
  id: string;
  reference: string;
  patientId: string;
  hospitalId: string;
  status: InquiryStatus;
  priority: Priority;
  channel: Channel;
  originalMessage: string;
  aiRequest: AiExtractedRequest;
  hospitalReview: ReviewState;
  doctorReview: DoctorReview;
  humanTakeover: HumanTakeover;
  quoteId: string;
  itineraryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MessageAuthor = "PATIENT" | "AI" | "HOSPITAL_STAFF" | "SYSTEM";

export interface Message {
  id: string;
  patientId: string;
  inquiryId: string;
  channel: Channel;
  author: MessageAuthor;
  body: string;
  at: string;
  suggested?: boolean | undefined;
  sent?: boolean | undefined;
}

export interface Hospital {
  id: string;
  name: string;
  city: string;
  accreditation: string;
  contactPhone: string;
  specialties: string[];
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  hospitalId: string;
  languages: string[];
  yearsExperience: number;
}

export interface Hotel {
  id: string;
  name: string;
  area: string;
  nightlyRate: number;
  distanceToHospitalKm: number;
  rating: number;
}

export interface TransportOption {
  id: string;
  name: string;
  type: "FERRY" | "CAR" | "SHUTTLE" | "AMBULANCE";
  route: string;
  price: number;
  durationMinutes: number;
}

export interface Treatment {
  id: string;
  name: string;
  category: string;
  batamPrice: number;
  singaporeBenchmark: number;
  stayNights: number;
  durationMinutes: number;
}

export interface DashboardSummary {
  singaporeLeads: number;
  itinerariesGenerated: number;
  hospitalReviewsPending: number;
  confirmedBookings: number;
  completedPatients: number;
  estimatedSavings: number;
}

export interface ActivityFeedItem {
  id: string;
  at: string;
  label: string;
  tone: "INFO" | "SUCCESS" | "ATTENTION";
  inquiryId?: string | undefined;
}

export interface QuoteTotals {
  medicalSubtotal: number;
  travelSubtotal: number;
  packageTotal: number;
  benchmarkTotal: number;
  savings: number;
  savingsPct: number;
}
