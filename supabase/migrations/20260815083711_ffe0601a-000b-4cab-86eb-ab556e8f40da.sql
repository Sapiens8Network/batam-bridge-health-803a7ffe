ALTER TYPE public.channel ADD VALUE IF NOT EXISTS 'WEB';

CREATE TABLE public.web_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  medical_request_id uuid REFERENCES public.medical_requests(id) ON DELETE SET NULL,
  itinerary_id uuid REFERENCES public.itineraries(id) ON DELETE SET NULL,
  visitor_name text,
  transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  slots jsonb NOT NULL DEFAULT '{}'::jsonb,
  selections jsonb NOT NULL DEFAULT '{}'::jsonb,
  stage text NOT NULL DEFAULT 'COLLECTING',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.web_chat_sessions TO service_role;

ALTER TABLE public.web_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Web chat sessions are server managed only"
ON public.web_chat_sessions FOR ALL TO authenticated
USING (false) WITH CHECK (false);

CREATE TRIGGER update_web_chat_sessions_updated_at
BEFORE UPDATE ON public.web_chat_sessions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();