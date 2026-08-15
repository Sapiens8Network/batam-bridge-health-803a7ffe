CREATE TYPE public.channel AS ENUM ('TELEGRAM','WHATSAPP');
CREATE TYPE public.message_direction AS ENUM ('INBOUND','OUTBOUND');
CREATE TYPE public.message_author AS ENUM ('PATIENT','AI','HOSPITAL','SYSTEM');
CREATE TYPE public.record_status AS ENUM ('ACTIVE','INACTIVE');
CREATE TYPE public.request_status AS ENUM (
  'NEW_INQUIRY','AI_PROCESSING','AI_ITINERARY_READY','HOSPITAL_REVIEW_REQUIRED',
  'DOCTOR_REVIEW_REQUIRED','QUOTE_APPROVED','PATIENT_CONFIRMATION_PENDING',
  'CONFIRMED_BOOKING','TRAVEL_READY','COMPLETED','REJECTED','HUMAN_TAKEOVER');
CREATE TYPE public.itinerary_status AS ENUM ('DRAFT','HOSPITAL_CONFIRMED','SENT','PATIENT_CONFIRMED','REJECTED');
CREATE TYPE public.item_status AS ENUM ('ESTIMATED','PENDING','CONFIRMED','COMPLETED');
CREATE TYPE public.review_status AS ENUM ('PENDING','APPROVED','MODIFIED','REJECTED','MORE_INFORMATION_REQUIRED');
CREATE TYPE public.quote_status AS ENUM ('DRAFT','PENDING_REVIEW','APPROVED','REJECTED','EXPIRED');
CREATE TYPE public.priority AS ENUM ('LOW','NORMAL','HIGH','URGENT');
CREATE TYPE public.app_role AS ENUM ('admin','hospital_staff','doctor');

CREATE TABLE public.hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  address text NOT NULL,
  accreditation text NOT NULL DEFAULT '',
  specialties text[] NOT NULL DEFAULT '{}',
  contact_phone text NOT NULL,
  contact_email text NOT NULL,
  status public.record_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name text NOT NULL,
  specialty text NOT NULL,
  license_reference text NOT NULL,
  languages text[] NOT NULL DEFAULT '{}',
  years_experience integer NOT NULL DEFAULT 0,
  status public.record_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL,
  description text NOT NULL DEFAULT '',
  recovery_days integer NOT NULL DEFAULT 1,
  duration_minutes integer NOT NULL DEFAULT 60,
  keywords text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE public.hospital_treatment_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  treatment_id uuid NOT NULL REFERENCES public.treatments(id) ON DELETE CASCADE,
  price_sgd numeric(12,2) NOT NULL,
  doctor_fee_sgd numeric(12,2) NOT NULL DEFAULT 0,
  hospital_fee_sgd numeric(12,2) NOT NULL DEFAULT 0,
  diagnostics_sgd numeric(12,2) NOT NULL DEFAULT 0,
  medication_sgd numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SGD',
  valid_from date NOT NULL DEFAULT current_date,
  valid_until date,
  status public.record_status NOT NULL DEFAULT 'ACTIVE',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_prices_lookup ON public.hospital_treatment_prices (treatment_id, hospital_id, status);

CREATE TABLE public.singapore_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id uuid NOT NULL REFERENCES public.treatments(id) ON DELETE CASCADE,
  benchmark_min_sgd numeric(12,2) NOT NULL,
  benchmark_max_sgd numeric(12,2) NOT NULL,
  benchmark_average_sgd numeric(12,2) NOT NULL,
  benchmark_travel_sgd numeric(12,2) NOT NULL DEFAULT 0,
  benchmark_accommodation_sgd numeric(12,2) NOT NULL DEFAULT 0,
  source_name text NOT NULL,
  source_date date NOT NULL,
  status public.record_status NOT NULL DEFAULT 'ACTIVE'
);
CREATE INDEX idx_benchmarks_treatment ON public.singapore_benchmarks (treatment_id, status);

CREATE TABLE public.hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  address text NOT NULL DEFAULT '',
  price_per_night_sgd numeric(12,2) NOT NULL,
  distance_to_hospital_km numeric(6,2) NOT NULL DEFAULT 0,
  rating numeric(3,1) NOT NULL DEFAULT 0,
  status public.record_status NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE public.transport_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  name text NOT NULL DEFAULT '',
  origin text NOT NULL,
  destination text NOT NULL,
  estimated_cost_sgd numeric(12,2) NOT NULL,
  estimated_duration_minutes integer NOT NULL DEFAULT 30,
  status public.record_status NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE public.ferry_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_name text NOT NULL,
  origin_terminal text NOT NULL,
  destination_terminal text NOT NULL,
  estimated_cost_sgd numeric(12,2) NOT NULL,
  estimated_duration_minutes integer NOT NULL DEFAULT 60,
  status public.record_status NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  country text NOT NULL DEFAULT 'SINGAPORE',
  preferred_channel public.channel NOT NULL DEFAULT 'WHATSAPP',
  telegram_id text UNIQUE,
  whatsapp_id text UNIQUE,
  preferred_language text NOT NULL DEFAULT 'English',
  traveller_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.medical_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT ('HTH-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE SET NULL,
  original_message text NOT NULL DEFAULT '',
  treatment_id uuid REFERENCES public.treatments(id) ON DELETE SET NULL,
  intent text NOT NULL DEFAULT 'MEDICAL_TOURISM',
  ai_confidence numeric(4,3),
  ai_request jsonb NOT NULL DEFAULT '{}'::jsonb,
  traveller_count integer NOT NULL DEFAULT 1,
  preferred_date date,
  preferred_nights integer NOT NULL DEFAULT 1,
  status public.request_status NOT NULL DEFAULT 'NEW_INQUIRY',
  priority public.priority NOT NULL DEFAULT 'NORMAL',
  channel public.channel NOT NULL DEFAULT 'WHATSAPP',
  hospital_review public.review_status,
  human_takeover boolean NOT NULL DEFAULT false,
  takeover_reasons text[] NOT NULL DEFAULT '{}',
  takeover_staff text,
  takeover_opened_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_requests_status ON public.medical_requests (status, updated_at DESC);
CREATE INDEX idx_requests_patient ON public.medical_requests (patient_id);

CREATE TABLE public.itineraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_request_id uuid NOT NULL UNIQUE REFERENCES public.medical_requests(id) ON DELETE CASCADE,
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE SET NULL,
  doctor_id uuid REFERENCES public.doctors(id) ON DELETE SET NULL,
  treatment_cost_sgd numeric(12,2) NOT NULL DEFAULT 0,
  doctor_fee_sgd numeric(12,2) NOT NULL DEFAULT 0,
  hospital_fee_sgd numeric(12,2) NOT NULL DEFAULT 0,
  diagnostics_cost_sgd numeric(12,2) NOT NULL DEFAULT 0,
  medication_cost_sgd numeric(12,2) NOT NULL DEFAULT 0,
  ferry_cost_sgd numeric(12,2) NOT NULL DEFAULT 0,
  hotel_cost_sgd numeric(12,2) NOT NULL DEFAULT 0,
  transport_cost_sgd numeric(12,2) NOT NULL DEFAULT 0,
  other_cost_sgd numeric(12,2) NOT NULL DEFAULT 0,
  total_batam_sgd numeric(12,2) NOT NULL DEFAULT 0,
  singapore_benchmark_sgd numeric(12,2) NOT NULL DEFAULT 0,
  singapore_benchmark_travel_sgd numeric(12,2) NOT NULL DEFAULT 0,
  singapore_benchmark_accommodation_sgd numeric(12,2) NOT NULL DEFAULT 0,
  estimated_savings_sgd numeric(12,2) NOT NULL DEFAULT 0,
  estimated_savings_percentage numeric(6,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SGD',
  status public.itinerary_status NOT NULL DEFAULT 'DRAFT',
  public_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24),'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.itinerary_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id uuid NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  day_number integer NOT NULL DEFAULT 1,
  time text NOT NULL DEFAULT '',
  type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  status public.item_status NOT NULL DEFAULT 'ESTIMATED',
  sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX idx_items_itinerary ON public.itinerary_items (itinerary_id, sort_order);

CREATE TABLE public.doctor_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_request_id uuid NOT NULL REFERENCES public.medical_requests(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES public.doctors(id) ON DELETE SET NULL,
  status public.review_status NOT NULL DEFAULT 'PENDING',
  proposed_treatment text,
  estimated_duration_minutes integer,
  appointment_at timestamptz,
  comments text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_request ON public.doctor_reviews (medical_request_id, created_at DESC);

CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id uuid NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  created_by text NOT NULL DEFAULT 'HERMES_AI',
  source text NOT NULL DEFAULT 'AI_ESTIMATE',
  status public.quote_status NOT NULL DEFAULT 'DRAFT',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  approved_at timestamptz,
  sent_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_quotes_itinerary ON public.quotes (itinerary_id);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medical_request_id uuid REFERENCES public.medical_requests(id) ON DELETE CASCADE,
  channel public.channel NOT NULL,
  direction public.message_direction NOT NULL,
  message_type public.message_author NOT NULL,
  raw_text text NOT NULL DEFAULT '',
  structured_data jsonb,
  suggested boolean NOT NULL DEFAULT false,
  sent_at timestamptz NOT NULL DEFAULT now(),
  delivery_status text NOT NULL DEFAULT 'QUEUED'
);
CREATE INDEX idx_messages_request ON public.messages (medical_request_id, sent_at);
CREATE INDEX idx_messages_patient ON public.messages (patient_id, sent_at);

CREATE TABLE public.ai_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_request_id uuid NOT NULL REFERENCES public.medical_requests(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'DONE',
  message text NOT NULL DEFAULT '',
  metadata jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer
);
CREATE INDEX idx_events_request ON public.ai_activity_events (medical_request_id, started_at);

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_request_id uuid REFERENCES public.medical_requests(id) ON DELETE CASCADE,
  entity text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  actor text NOT NULL DEFAULT 'SYSTEM',
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_log (created_at DESC);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, hospital_id)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_requests_touch BEFORE UPDATE ON public.medical_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_itineraries_touch BEFORE UPDATE ON public.itineraries
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_quotes_touch BEFORE UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_patients_touch BEFORE UPDATE ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

GRANT SELECT ON public.hospitals, public.doctors, public.treatments,
  public.hospital_treatment_prices, public.singapore_benchmarks, public.hotels,
  public.transport_options, public.ferry_options TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.hospitals, public.doctors, public.treatments,
  public.hospital_treatment_prices, public.singapore_benchmarks, public.hotels,
  public.transport_options, public.ferry_options, public.patients,
  public.medical_requests, public.itineraries, public.itinerary_items,
  public.doctor_reviews, public.quotes, public.messages,
  public.ai_activity_events, public.audit_log, public.user_roles TO service_role;

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_treatment_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.singapore_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ferry_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reference data readable by staff" ON public.hospitals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Doctors readable by staff" ON public.doctors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Treatments readable by staff" ON public.treatments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Prices readable by staff" ON public.hospital_treatment_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Benchmarks readable by staff" ON public.singapore_benchmarks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Hotels readable by staff" ON public.hotels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Transport readable by staff" ON public.transport_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ferries readable by staff" ON public.ferry_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "Own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_activity_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.medical_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.itineraries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;